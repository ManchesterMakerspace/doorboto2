// doorboto.mjs ~ Copyright 2020 Manchester Makerspace ~ License MIT
import { connectDB, insertDoc } from './storage/database_sync.mjs';
import { cacheSetup, updateCard, checkForCard } from './storage/on_site_cache.mjs';
import { serialInit, acceptSignal, denySignal } from './hardware_interface/reader_com.mjs';
import { slackSend } from './outward_telemetry/slack.mjs';

const HOUR = 3600000; // an hour in milliseconds
const LENIENCY = HOUR * 72; // give 3 days for a card to be renewed

// collection of methods that write to makerspace database
const reject = async (card, db, closeDb) => {
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
  } finally {
    closeDb();
  }
}

// is called on successful authorization
const grantAccess = async name => {
  acceptSignal();
  const checkinDoc = {
    name,
    time: new Date().getTime(),
  };
  try {
    const {db, closeDb} = await connectDB();
    await db.collection('checkins').insertOne(insertDoc(checkinDoc));
    closeDb();
  } catch (error){
    console.log(`${name} checkin save issue => ${error}`);
  }
  slackSend(`${name} just checked in`);
};

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


const authorize = async cardID => {
  try {
    let cardData = await checkForCard(cardID);
    if (!cardData){ // given no cache entry check db for one
      const {db, closeDb} = await connectDB();
      const cardData = await db.collection('cards').findOne({ uid: cardID });
      if(!cardData){  // no card here either, this card is unregistered
        denyAccess('unregistered card');
        // we want these to show up in the db to register new cards
        reject({ uid: cardID }, db, closeDb);
        return;
      }
      closeDb();
      updateCard(cardData); // Bring cache up to date with db
    }
    const {validity, holder, expiry} = cardData;
    // make sure card has been marked with a valid state
    if (validity === 'activeMember' || validity === 'nonMember') {
      // make sure card is not expired
      if (new Date().getTime() < new Date(expiry).getTime() + LENIENCY) {
        // THIS IS WHERE WE LET PEOPLE IN! The one and only reason
        grantAccess(holder);
      } else {
        denyAccess(`${holder}'s membership as lapsed`, holder);
      } // given members time is up we want a polite message
    } else {
      denyAccess(`${holder}'s  ${validity} card was scanned`, holder);
    } // context around rejections is helpful
  } catch (error){
    const issue = `${cardID} rejected due to amnesia => ${error}`;
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
