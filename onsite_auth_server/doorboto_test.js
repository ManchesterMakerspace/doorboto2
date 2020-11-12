// doorboto_test.mjs Copyright 2020 Manchester Makerspace MIT Licence
const { authorize, cronUpdate, checkStanding } = require( './doorboto.js');
const { createCardArray, createCards, rejectedCard, acceptedCard } = require( './storage/on_site_cache_test.js');
const { cacheSetup, updateCard } = require( './storage/on_site_cache.js');
const fs = require( 'fs/promises');
const { connectDB, insertDoc } = require('./storage/mongo.js');

const TEST_PATH = `${__dirname}/test_storage/`;

// Members should be able to authorize solely on cache
const noValidDbTest = async () =>{
  console.log(`running no valid db test in ${TEST_PATH}`);
  try {
    await cacheSetup(TEST_PATH);
    const cards = createCardArray(2);
    await createCards(cards);
    for (let i = 0; i < cards.length; i++) {
      await authorize(cards[i].uid).catch(console.log);
    }
  } catch (error){
    console.log(`Authorize test issue => ${error}`);
  } finally {
    await fs.rmdir(TEST_PATH, { recursive: true });
    // Recursive option to be deprecated? No promise/async fs.rm? Confusing
  }
}

const itUnderstandsGoodStanding = () => {
  const cardData = acceptedCard();
  const standing = checkStanding(cardData);
  try {
    const {authorized, cardData, msg} = standing;
    if(authorized){
      console.log(`correctly assessed standing "${msg}" for ${cardData.holder}`);
    } else {
      throw new Error('data should be in good standing but assessed as not');
    }
  } catch (error){
    console.log(`goodStanding => ${error}`)
  }

}

const itUnderstandsBadStanding = () => {
  const cardData = rejectedCard();
  const standing = checkStanding(cardData);
  try {
    const {authorized, cardData, msg} = standing;
    if(authorized){
      throw new Error('data should be in bad standing but assessed as good');
    } else {
      console.log(`correctly assessed standing "${msg}" for ${cardData.holder}`);
    }
  } catch (error){
    console.log(`badStanding => ${error}`)
  }
}

// Integration test to run with Mongo
const recordsRejection = async () => {
  console.log(`running records rejection test in ${TEST_PATH}`);
  try {
    await cacheSetup(TEST_PATH);
    const cards = createCardArray(1);
    await createCards(cards);
    // 'cardToReject' is and invalid uid that should be rejected
    await authorize('cardToReject');
  } catch (error){
    console.log(`Records rejection => ${error}`);
  } finally {
    await fs.rmdir(TEST_PATH, { recursive: true });
    // Recursive option to be deprecated? No promise/async fs.rm? Confusing
  }
}

// integration test with backup of members collection
const canUpdateCacheOfMembers = async () => {
  try {
    await cacheSetup(TEST_PATH);
    const cards = createCardArray(2);
    const {db, client} = await connectDB();
    for (let i = 0; i < cards.length; i++) {
      await db.collection('cards').insertOne(insertDoc(cards[i]));
    }
    client.close();
    await cronUpdate();
    // Process.exit needs to be called because other wise it'll wait to do its next update
  } catch (error){
    console.log(`canUpdateCacheOfMembers => ${error}`);
  }
}

// integration test to maintain a key but subtle expected behaviour
// A database request should not block first attempt to authorize a key against cache
// if it does this causes significant lag in the doors reaction to authorized key holders
const itCanOpenDoorQuickly = async () => {
  console.log(`It can quickly open the door, USE REMOTE DB LIKE PROD`);
  await cacheSetup(TEST_PATH);
  const card = acceptedCard();
  updateCard(card);
  const {db, client} = await connectDB();
  await db.collection('cards').insertOne(insertDoc(card));
  await client.close();
  const startMillis = Date.now();
  await authorize(card.uid, authorized => {
    const authMillis = Date.now();
    const authDuration = authMillis - startMillis;
    const status = authorized && authDuration < 30 ? "SUCCESS" : "FAILURE";
    console.log(`${status}: It took ${authDuration} millis to authorize`);
  });
  const finishMillis = Date.now();
  const finishDuration = finishMillis - startMillis;
  console.log(`it took ${finishDuration} millis to finish`);
}

module.exports = {
  noValidDbTest,
  canUpdateCacheOfMembers,
  recordsRejection,
  itUnderstandsGoodStanding,
  itUnderstandsBadStanding,
  itCanOpenDoorQuickly,
};
