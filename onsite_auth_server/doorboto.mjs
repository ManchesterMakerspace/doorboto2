// doorboto.mjs ~ Copyright 2020 Manchester Makerspace ~ License MIT
import { connectDB, insertDoc } from './storage/database_sync.mjs';
import { cacheSetup, updateCard, checkForCard } from './storage/on_site_cache.mjs';
import { serialInit, acceptSignal, denySignal } from './hardware_interface/reader_com.mjs';
import { slackSend } from './outward_telemetry/slack.mjs';

const HOUR = 3600000; // an hour in milliseconds
const LENIENCY = HOUR * 72; // give 3 days for a card to be renewed

// collection of methods that write to makerspace database
const reject = async (card, db) => {
  const {uid, holder, validity} = card;
  const rejectDoc = {
    uid,
    // we only get holder when a recorded card holder is rejected
    holder: holder ? holder : null,
    // important to know this is an unregistered card if info missing
    validity: validity ? validity : 'unregistered',
    timeOf: new Date(), // should be same as mongoose default
  };
  try {
    await db.collection('rejections').insertOne(insertDoc(rejectDoc));
  } catch (error){
    console.log(`${uid} rejected but not saved => ${error}`);
  }
}

// is called on failed authorization
const denyAccess = (msg, member = null) => {
  denySignal();
  if (member) {
    const atChannel = '<!channel> ';
    const msgBlock = '```' + msg + '```';
    const adminMsg = 
      `${atChannel}${msgBlock} Maybe we missed renewing them or they need to be reached out to?`;
    slackSend(adminMsg, process.env.MR_WEBHOOK);
  }
  slackSend(`denied access: ${msg}`);
}

const authorize = async uid => {
  let mongo = null;
  try {
    const dbPromise = connectDB();
    let cardData = await checkForCard(uid);
    if (!cardData){ // given no cache entry check db for one
      mongo = await dbPromise;
      cardData = await mongo.db.collection('cards').findOne({ uid });
      if(!cardData){  // no card here either, this card is unregistered
        denyAccess('unregistered card');
        // we want these to show up in the db to register new cards
        reject({ uid }, mongo.db);
        return;
      }
      updateCard(cardData); // Bring cache up to date with db
    }
    const {validity, holder, expiry} = cardData;
    // make sure card has been marked with a valid state
    let denyMsg = null;
    if (validity === 'activeMember' || validity === 'nonMember') {
      // make sure card is not expired
      if (new Date().getTime() < new Date(expiry).getTime() + LENIENCY) {
        acceptSignal(); // Trigger the door strike to open
        slackSend(`${holder} just checked in`);
        const checkinDoc = {
          name: holder,
          time: new Date().getTime(),
        };
        if(!mongo){ mongo = await dbPromise; }
        await mongo.db.collection('checkins').insertOne(insertDoc(checkinDoc));
      } else { // Note that this denial was because of a lapsed membership
        denyMsg = `${holder}'s membership as lapsed`;
      }
    } else { // Note this denial was a validity issue
      denyMsg = `${holder}'s  ${validity} card was scanned`;
    }
    if(denyMsg){
      denyAccess(denyMsg, holder);
      if(!mongo){ mongo = await dbPromise; }
      reject(cardData, mongo.db);
    }
    if(!mongo){ mongo = await dbPromise; }
    mongo.closeDb();
  } catch (error){
    const issue = `${uid} rejected due to amnesia => ${error}`;
    denyAccess(issue);
    console.log(issue);
  }
}

// runs a time based update operation
const cronUpdate = async () => {
  try {
    const {db, closeDb} = await connectDB();
    const cursor = db.collection('cards').find({});
    let card;
    while((card = await cursor.next())){
      if (card) {
        // update local cache to be in sync with source of truth
        updateCard(card);
      }
    }
    closeDb();
  } catch (error){
    console.log(`Issue connecting on update: ${error}`);
  }
  // make upcoming expiration check every interval
  setTimeout(cronUpdate, HOUR);
};

// High level start up sequence
// set up local cache
cacheSetup('./members/');
// Start serial connection to Arduino
// Pass it a callback to handle on data events
serialInit(authorize);
// Regular database check that updates local cache
cronUpdate();
