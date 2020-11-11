// doorboto_test.mjs Copyright 2020 Manchester Makerspace MIT Licence
const { authorize, cronUpdate } = require( './doorboto.js');
const { createCardArray, createCards } = require( './storage/on_site_cache_test.js');
const { cacheSetup } = require( './storage/on_site_cache.js');
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

module.exports = {
  noValidDbTest,
  canUpdateCacheOfMembers,
  recordsRejection,
};
