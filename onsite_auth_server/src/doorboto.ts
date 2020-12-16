// doorboto ~ Copyright 2020 Manchester Makerspace ~ License MIT
import { connectDB, getCardFromDb } from './storage/mongo';
import { cacheSetup, updateCard, checkForCard } from './storage/on_site_cache';
import { serialInit } from './hardware_interface/reader_com';
import { slackSend, adminAttention } from './outward_telemetry/slack';
import { CardData, GiveAccessCallback, Standing } from './interface';

const HOUR = 3600000; // milliseconds in an hour
const LENIENCY = HOUR * 72; // give 3 days for a card to be renewed

// Looks at card data and returns an object representing member standing
const checkStanding = (cardData: CardData): Standing => {
  const { validity, holder, expiry } = cardData;
  const whom = holder ? `${holder}'s ` : '';
  const expireTime: number = expiry ? expiry : 0;
  const standing: Standing = {
    authorized: false,
    msg: `${whom}${validity} card was scanned`,
    cardData: { ...cardData },
  };
  // make sure card has been marked with a valid state and unexpired
  if (validity === 'activeMember' || validity === 'nonMember') {
    if (new Date().getTime() < new Date(expireTime).getTime() + LENIENCY) {
      standing.authorized = true;
      standing.msg = `${holder} checked in`;
    } else {
      standing.msg = `Denied access: ${holder}'s membership as lapsed`;
    }
  }
  return standing;
};

const authorize = async (uid: string, giveAccess: GiveAccessCallback) => {
  const cacheCardData = await checkForCard(uid);
  let standing: Standing = {
    authorized: false,
    msg: '',
    cardData: {
      uid,
      validity: 'unregistered',
      holder: null,
      expiry: null,
    },
  };
  if (cacheCardData) {
    standing = checkStanding(cacheCardData);
  }
  if (standing.authorized) {
    giveAccess(true);
    slackSend(standing.msg);
  }
  try {
    const { dbCardData, recordScan } = await getCardFromDb(uid);
    // if not authorized by cache check against db data
    if (!standing.authorized) {
      // figure ultimately if this is an unregistered user
      // given no authorized card data in cache
      const cardData = dbCardData ? dbCardData : standing.cardData;
      standing = checkStanding(cardData);
      // if authorized trigger strike if not flash red
      giveAccess(standing.authorized);
      // regardless, report to #doorboto activity
      slackSend(standing.msg);
      // in the case this is a known user in bad standing
      if (!standing.authorized && standing?.cardData?.holder) {
        adminAttention(standing.msg, standing.cardData.holder);
      }
    }
    // Regardless of cache or db check, if data is in db, update it into cache
    if (dbCardData) {
      updateCard(dbCardData);
    }
    // record this card scan reject or checkin and cleanly close db
    recordScan(standing);
  } catch (error) {
    const authStatus = standing.authorized
      ? 'checked in but'
      : 'was denied and';
    const situation = standing?.cardData
      ? `${standing.cardData.holder} ${authStatus}`
      : `Cache empty and `;
    adminAttention(`${situation} DB unavailable to check ${uid}: => ${error}`);
  }
};

// runs a time based update operation
const cronUpdate = async (recurse: boolean = true) => {
  try {
    const { db, client } = await connectDB();
    if (!db || !client) {
      throw new Error('No mongo access');
    }
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
  if (recurse) {
    setTimeout(cronUpdate, HOUR);
  }
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

export { authorize, cronUpdate, checkStanding, run };
