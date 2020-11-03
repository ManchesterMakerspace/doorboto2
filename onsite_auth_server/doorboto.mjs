// doorboto.mjs ~ Copyright 2020 Manchester Makerspace ~ License MIT
import { connectDB, insertDoc } from './storage/database_sync.mjs';
import { serialInit } from './outward_telemetry/reader_com.mjs';
import { cacheSetup, updateCard, checkForCard } from './storage/on_site_cache.mjs';

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
  
const checkin = async (member, db, closeDb) => {
  // keeps check in history for an active membership count
  const checkinDoc = {
    name: member,
    time: new Date().getTime(),
  };
  try {
    await db.collection('checkins').insertOne(insertDoc(checkinDoc));
  } catch (error){
    console.log(`${member} checkin save issue => ${error}`);
  } finally {
    closeDb();
  }
}


const authorize = async (cardID, onSuccess, onFail) => {
  try {
    const cacheCard = await checkForCard(cardID);
    if (cacheCard){
      checkRejection(cacheCard, onSuccess, onFail);
    } else {
      // given no cache entry or rejection maybe more up to date in db?
      const {db, closeDb} = await connectDB();
      const dbCard = await db.collection('cards').findOne({ uid: cardID });
      if (dbCard){
        // given we got a record back from database
        if (checkRejection(dbCard, onSuccess, onFail)) {
          // acceptance logic, this function cares about rejection
          reject(dbCard, db, closeDb);
        } else {
          closeDb();
        }
        // keep local redundant data cache up to date
        updateCard(dbCard);
      } else {
        // no error, no card, this card is unregistered
        onFail('unregistered card');
        // we want these to show up in the db to register new cards
        reject({ uid: cardID }, db, closeDb);
      }
    }
  } catch (error){
    onFail('not in cache and failed to connect to db');
    console.log(`${cardID} rejected due to amnesia => ${error}`);
  }
}

const checkRejection = (card, onSuccess, onFail) => {
  // When we have an actual record to check
  let rejected = true; // returns if card was reject if caller cares
  if (card.validity === 'activeMember' || card.validity === 'nonMember') {
    // make sure card has been marked with a valid state
    if (new Date().getTime() < new Date(card.expiry).getTime() + LENIENCY) {
      // make sure card is not expired
      onSuccess(card.holder); // THIS IS WHERE WE LET PEOPLE IN! The one and only reason
      rejected = false; // congrats you're not rejected
    } else {
      onFail(card.holder + ' has expired', card.holder);
    } // given members time is up we want a polite message
  } else {
    onFail(
      card.holder + "'s " + card.validity + ' card was scanned',
      card.holder
    );
  } // context around rejections is helpful
  return rejected; // would rather leave calling function to decide what to do
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
serialInit({
  authorize,
  checkin,
}); // serial connect to arduino
cronUpdate(); // run a time based stream that updates local cache
