// doorboto.mjs ~ Copyright 2020 Manchester Makerspace ~ License MIT
import { connectDB, insertDoc } from './storage/database_sync.mjs';
import { serialInit } from './outward_telemetry/reader_com.mjs';
import { cacheSetup, updateCard, checkForCard } from './storage/on_site_cache.mjs';

const HOUR = 3600000; // an hour in milliseconds
const LENIENCY = HOUR * 72; // give 3 days for a card to be renewed

// collection of methods that write to makerspace database
const reject = (card, db, closeDb) => {
  db.collection('rejections').insertOne(insertDoc({
      uid: card.uid,
      // should always have uid
      holder: card.holder ? card.holder : null,
      // we only get this when a recorded card holder is rejected
      validity: card.validity ? card.validity : 'unregistered',
      // important to know this is an unregistered card if info missing
      timeOf: new Date(), // should be same as mongoose default
    }),
    error => {
      if (error) {
        console.log(error + ': Could not save reject -> ' + card.uid);
      } // knowing who it was might be important
      closeDb(); 
      // error or not close connection to db after saving a rejection
    }
  );
}
  
const checkin = (member, db, closeDb) => {
  // keeps check in history for an active membership count
  db.collection('checkins').insertOne(insertDoc({
      name: member,
      time: new Date().getTime(),
    }),
    error => {
      if (error) {
        console.log(error + '; could not save check in for -> ' + member);
      }
      closeDb();
      // error or not close connection to db after check in
    }
  );
}


const authorize = async (cardID, onSuccess, onFail) => {
  try {
    const card = await checkForCard(cardID);
    if (card){
      checkRejection(card, onSuccess, onFail);
    } else {
      const {db, closeDb} = await connectDB();
      // given no local entry or rejection maybe this is a new one or card is more up to date in db
      mongoCardCheck(cardID, onSuccess, onFail, db, closeDb);
    }
  } catch (error){
    onFail('not in cache and failed to connect to db');
    console.log(`${cardID} rejected due to amnesia => ${error}`);
  }
}
  
const mongoCardCheck = async (cardID, onSuccess, onFail, db, closeDb) => {
    try {
      const card = await db.collection('cards').findOne({ uid: cardID });
      if(card){
        // given we got a record back from mongo
        if (checkRejection(card, onSuccess, onFail)) {
          // acceptance logic, this function cares about rejection
          reject(card, db, closeDb); // Rejections: we have to wait till saved to close db
        }
        updateCard(card);
        // keep local redundant data cache up to date
      } else {
        // no error, no card, this card is unregistered
        onFail('unregistered card');
        // we want these to show up somewhere to register new cards
        reject({ uid: cardID }, db, closeDb);
        // so lets put them in mongo
      }
    } catch (error){
      console.log('mongo findOne error: ' + error);
      // Log error to debug possible mongo problem
      onFail(' not in cache, db error');
      // Sends event and message to slack if connected
    } finally {
      closeDb();
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
