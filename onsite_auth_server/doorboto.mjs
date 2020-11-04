// doorboto.mjs ~ Copyright 2020 Manchester Makerspace ~ License MIT
import { connectDB, insertDoc } from './storage/database_sync.mjs';
import {
  cacheSetup,
  updateCard,
  checkForCard,
} from './storage/on_site_cache.mjs';
import {
  serialInit,
  acceptSignal,
  denySignal,
} from './hardware_interface/reader_com.mjs';
import { slackSend, adminAttention } from './outward_telemetry/slack.mjs';

const HOUR = 3600000; // milliseconds in an hour
const LENIENCY = HOUR * 72; // give 3 days for a card to be renewed

const authorize = async uid => {
  let mongo = null;
  try {
    const dbPromise = connectDB(); // Continue while db connects
    let cardData = await checkForCard(uid);
    let denyMsg = null;
    if (!cardData) {
      // given no cache entry check db for one
      mongo = await dbPromise;
      cardData = await mongo.db.collection('cards').findOne({ uid });
      if (cardData) {
        // Bring cache up to date with db if a result exist
        updateCard(cardData);
      } else {
        // Unregistered cards are recorded to register new cards
        cardData = {
          uid,
          holder: null,
          validity: 'unregistered',
          expiry: 0,
        };
      }
    }
    const { validity, holder, expiry } = cardData;
    // make sure card has been marked with a valid state and unexpired
    if (validity === 'activeMember' || validity === 'nonMember') {
      if (new Date().getTime() < new Date(expiry).getTime() + LENIENCY) {
        acceptSignal(); // Trigger the door strike to open
        slackSend(`${holder} just checked in`);
      } else {
        // Note that this denial was because of a lapsed membership
        denyMsg = `${holder}'s membership as lapsed`;
      }
    } else {
      // Note this denial was a validity issue
      denyMsg = `${holder}'s  ${validity} card was scanned`;
    }
    if (!mongo) {
      mongo = await dbPromise;
    }
    if (denyMsg) {
      denySignal();
      slackSend(`denied access: ${denyMsg}`);
      if (holder) {
        adminAttention(denyMsg, holder);
      }
      cardData.timeOf = new Date();
      await mongo.db.collection('rejections').insertOne(insertDoc(cardData));
    } else {
      const checkinDoc = {
        name: holder,
        time: new Date().getTime(),
      };
      await mongo.db.collection('checkins').insertOne(insertDoc(checkinDoc));
    }
    mongo.closeDb();
  } catch (error) {
    adminAttention(`${uid} rejected due to authorization error => ${error}`);
  }
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
// set up local cache
cacheSetup('./members/');
// Start serial connection to Arduino
// Pass it a callback to handle on data events
serialInit(authorize);
// Regular database check that updates local cache
cronUpdate();
