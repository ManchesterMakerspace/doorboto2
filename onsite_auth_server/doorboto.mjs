// doorboto.mjs ~ Copyright 2020 Manchester Makerspace ~ License MIT
import { connectDB, insertDoc } from './storage/database_sync';
import { serialInit } from './outward_telemetry/reader_com'

const HOUR = 3600000; // an hour in milliseconds
const LENIENCY = HOUR * 72; // give 3 days for a card to be renewed

const cache = {
  // local cache logic for power or database failure events
  persist: require('node-persist'),
  // methods for storing JSON objects in local files
  updateCard: function (card) {
    // processes cards
    const cardInfo = {
      // filter down to only the properties we would like to save
      holder: card.holder,
      expiry: Number(card.expiry),
      // just be extra sure that this is indeed a number it needs to be
      validity: card.validity,
    };
    cache.persist.setItem(card.uid, cardInfo);
    // setItem works like and upsert, this also creates cards
  },
  check: function (cardID, onSuccess, onFail) {
    // hold cardID and callbacks in closure
    return function cacheCheck() {
      // returns callback to occur on failed db connection
      let strangerDanger = true; // not if card is familiar or not
      cache.persist.forEach(function (key, card) {
        if (key === cardID) {
          strangerDanger = false; // mark card as now familiar
          auth.checkRejection(card, onSuccess, onFail);
          // check if this card is valid or not
        }
      }); // if card is still unfamiliar after looking for a familiar one
      if (strangerDanger) {
        onFail();
      }
    };
  },
};

const record = {
  // collection of methods that write to makerspace database
  reject: function (card, db, closeDb) {
    db.collection('rejections').insertOne(insertDoc({
        uid: card.uid,
        // should always have uid
        holder: card.holder ? card.holder : null,
        // we only get this when a recorded card holder is rejected
        validity: card.validity ? card.validity : 'unregistered',
        // important to know this is an unregistered card if info missing
        timeOf: new Date(), // should be same as mongoose default
      }),
      function (error) {
        if (error) {
          console.log(error + ': Could not save reject -> ' + card.uid);
        } // knowing who it was might be important
        closeDb(); 
        // error or not close connection to db after saving a rejection
      }
    );
  },
  checkin: function (member, db, closeDb) {
    // keeps check in history for an active membership count
    db.collection('checkins').insertOne(insertDoc({
        name: member,
        time: new Date().getTime(),
      }),
      function (error) {
        if (error) {
          console.log(error + '; could not save check in for -> ' + member);
        }
        closeDb();
        // error or not close connection to db after check in
      }
    );
  },
};

const auth = {
  orize: (cardID, onSuccess, onFail) => {
    cache.check(cardID, onSuccess, async () => {
      // Check in cache first its faster and up to date enough to be close to the source of truth
      try {
        const {db, closeDb} = await connectDB();
        // given no local entry or rejection maybe this is a new one or card is more up to date in db
        auth.mongoCardCheck(cardID, onSuccess, onFail, db, closeDb);
      } catch (error){
        // not in local cache could not connect to db
        onFail('not in cache and failed to connect to db');
        console.log(`${cardID} rejected due to amnesia: ${error}`);
      }
    })(); // cache.check returns a function, and that needs to be executed()
  },
  mongoCardCheck: async (cardID, onSuccess, onFail, db, closeDb) => {
    try {
      const card = await db.collection('cards').findOne({ uid: cardID });
      if(card){
        // given we got a record back from mongo
        if (auth.checkRejection(card, onSuccess, onFail)) {
          // acceptance logic, this function cares about rejection
          record.reject(card, db, closeDb); // Rejections: we have to wait till saved to close db
        }
        cache.updateCard(card);
        // keep local redundant data cache up to date
      } else {
        // no error, no card, this card is unregistered
        onFail('unregistered card');
        // we want these to show up somewhere to register new cards
        record.reject({ uid: cardID }, db, closeDb);
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
  },
  checkRejection: function (card, onSuccess, onFail) {
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
  },
};

// runs a time based update operation
const cronUpdate = async () => {
  try {
    const {db, closeDb} = await connectDB();
    const cursor = db.collection('cards').find({});
    let card;
    while((card = await cursor.next())){
      if (card) {
        // update local cache to be in sync with source of truth
        cache.updateCard(card);
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
cache.persist.init(); // set up local cache
serialInit({
  authorize: auth.orize,
  checkin: record.checkin,
}); // serial connect to arduino
cronUpdate(); // run a time based stream that updates local cache
