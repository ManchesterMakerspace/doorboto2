// doorboto.mjs ~ Copyright 2020 Manchester Makerspace ~ License MIT
const { connectDB, getCardFromDb } = require('./storage/mongo.js');
const {
  cacheSetup,
  updateCard,
  checkForCard,
} = require('./storage/on_site_cache.js');
const {
  serialInit,
  giveAccess,
} = require('./hardware_interface/reader_com.js');
const { slackSend, adminAttention } = require('./outward_telemetry/slack.js');

const HOUR = 3600000; // milliseconds in an hour
const LENIENCY = HOUR * 72; // give 3 days for a card to be renewed

// Looks at card data and returns an object representing member standing
const checkStanding = cardData => {
  if (!cardData) {
    return {};
  }
  const { validity, holder, expiry } = cardData;
  const whom = holder ? `${holder}'s ` : ''
  const standing = {
    authorized: false,
    cardData: { ...cardData },
    msg: `${whom}${validity} card was scanned`,
  };
  // make sure card has been marked with a valid state and unexpired
  if (validity === 'activeMember' || validity === 'nonMember') {
    if (new Date().getTime() < new Date(expiry).getTime() + LENIENCY) {
      giveAccess(true); // Trigger the door strike to open
      standing.authorized = true;
      standing.msg = `${holder} checked in`;
    } else {
      standing.msg = `Denied access: ${holder}'s membership as lapsed`;
    }
  }
  if (!standing.authorized) {
    giveAccess(false);
    if (standing.cardData.holder) {
      adminAttention(standing.msg, standing.cardData.holder);
    }
    standing.cardData.timeOf = new Date();
  }
  return standing;
};

const authorize = async uid => {
  const cacheCardData = await checkForCard(uid);
  let standing = checkStanding(cacheCardData);
  const { dbCardData, recordScan } = await getCardFromDb(uid).catch(error => {
    const situation = standing?.cardData
      ? `${standing.cardData.holder} ${
          standing.authorized ? 'checked in but ' : 'was denied and '
        }`
      : `Cache empty and `;
    adminAttention(`${situation}DB unavailable to check ${uid}: => ${error}`);
  });
  // if no card data came from cache and we have a db entry
  if (!standing?.cardData) {
    // figure ultimately if this is an unregistered user
    // given no card data in cache or db
    const cardData = dbCardData
      ? dbCardData
      : {
          uid,
          validity: 'unregistered',
          holder: '',
          expiry: 0,
      };
    standing = checkStanding(cardData);
  }
  // Regardless of cache or db check, if data is in db, update it into cache
  if (dbCardData) {
    updateCard(dbCardData);
  }
  slackSend(standing.msg);
  // record this card scan reject or checkin and cleanly close db
  await recordScan(standing);
};

// runs a time based update operation
const cronUpdate = async () => {
  try {
    const { db, client } = await connectDB();
    const cursor = db.collection('cards').find({});
    let card;
    while ((card = await cursor.next())) {
      if (card) {
        // update local cache to be in sync with source of truth
        await updateCard(card);
      }
    }
    client.close();
  } catch (error) {
    console.log(`Issue connecting on update: ${error}`);
  }
  // make upcoming expiration check every interval
  setTimeout(cronUpdate, HOUR);
};

// High level start up sequence
const run = async () => {
  await cacheSetup('./members/');
  // Pass arduino connection function a callback to handle on data events
  serialInit(authorize);
  // Regular database check that updates local cache
  cronUpdate();
};

// Run doorboto if not being called by test or other applications
if (!module.parent) {
  run();
}

module.exports = {
  authorize,
  cronUpdate,
  checkStanding,
  run,
};
