// doorboto.mjs ~ Copyright 2020 Manchester Makerspace ~ License MIT
const { connectDB, insertDoc } = require('./storage/mongo.js');
const {
  cacheSetup,
  updateCard,
  checkForCard,
} = require('./storage/on_site_cache.js');
const {
  serialInit,
  acceptSignal,
  denySignal,
} = require('./hardware_interface/reader_com.js');
const { slackSend, adminAttention } = require('./outward_telemetry/slack.js');

const HOUR = 3600000; // milliseconds in an hour
const LENIENCY = HOUR * 72; // give 3 days for a card to be renewed

const checkStanding = cardData => {
  // make sure card has been marked with a valid state and unexpired
  const { validity, holder, expiry } = cardData;
  const standing = {
    good: false,
    cardData: {...cardData},
    msg: `${holder}'s ${validity} card was scanned`,
  };
  if (validity === 'activeMember' || validity === 'nonMember') {
    if (new Date().getTime() < new Date(expiry).getTime() + LENIENCY) {
      acceptSignal(); // Trigger the door strike to open
      standing.good = true;
      standing.msg = `${holder} checked in`;
    } else {
      standing.msg = `Denied access: ${holder}'s membership as lapsed`;
    }
  }
  if(!standing.good){
    denySignal();
    if (standing.cardData.holder) {
      adminAttention(standing.msg, standing.cardData.holder);
    }
    standing.cardData.timeOf = new Date();
  }
  return standing;
}

// Hold db and closeDb in closure to use after standing check
const makeRecordOfScanFunc = (db, closeDb) => {
  return async (denied, cardData) => {
    const collection = denied ? 'rejections' : 'checkins';
    const data = denied ? cardData : {
      name: cardData.holder,
      time: new Date().getTime(),
    };
    await db.collection(collection).insertOne(insertDoc(data));
    closeDb()
  }
}

// takes a card and returns an insert function
const getCardFromDb = async uid => {
  const {db, closeDb} = await connectDB();
  // default to unregistered card
  let dbCardData = {
    uid,
    holder: null,
    validity: 'unregistered',
    expiry: 0,
  };
  const result = {
    dbCardData,
    recordScan: async () => {},
  }
  if(!db){
    return result;
  }
  result.dbCardData = await db.collection('cards').findOne({ uid });
  if (result.dbCardData.holder) {
    // Bring cache up to date with db if a result exist
    updateCard(result.dbCardData);
  }
  result.recordScan = makeRecordOfScanFunc(db, closeDb);
  return result;
}

const authorize = async uid => {
  let standing = {
    authorized: false,
    cardData: null,
    msg: '',
  };
  const cacheCardData = await checkForCard(uid);
  if(cacheCardData){
    standing = checkStanding(cacheCardData);
  }
  const {dbCardData, recordScan} = await getCardFromDb(uid);
  if (!standing.cardData){
    if(dbCardData){
      standing = checkStanding(dbCardData);
    } else {
      adminAttention(`Cache empty and db unavailable to check ${uid}`);
    } 
  }
  slackSend(standing.msg);
  // record scan and cleanly close db
  await recordScan(standing.good, standing.cardData);
};

// runs a time based update operation
const cronUpdate = async () => {
  try {
    const { db, closeDb } = await connectDB();
    const cursor = db.collection('cards').find({});
    let card;
    while ((card = await cursor.next())) {
      if (card) {
        // update local cache to be in sync with source of truth
        updateCard(card);
      }
    }
    closeDb();
  } catch (error) {
    console.log(`Issue connecting on update: ${error}`);
  }
  // make upcoming expiration check every interval
  setTimeout(cronUpdate, HOUR);
};

// High level start up sequence
const run = () => {
  cacheSetup('./members/');
  // Pass arduino connection function a callback to handle on data events
  serialInit(authorize);
  // Regular database check that updates local cache
  cronUpdate();
};

// Run doorboto if not being called by test or other applications
if(!module.parent){
  run();
}

module.exports = {
  authorize,
  cronUpdate,
  checkStanding,
  run,
}
