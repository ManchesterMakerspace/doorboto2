// doorboto_test.mjs Copyright 2020 Manchester Makerspace MIT Licence
const { authorize } = require( './doorboto.js');
const { createCardArray, createCards } = require( './storage/on_site_cache_test.js');
const { cacheSetup } = require( './storage/on_site_cache.js');
const fs = require( 'fs/promises');

// Members should be able to authorize solely on cache
const noValidDbTest = async () =>{
  const TEST_PATH = `${__dirname}/test_storage/`;
  console.log(`running no valid db test in ${TEST_PATH}`);
  try {
    await cacheSetup(TEST_PATH);
    const cards = createCardArray(2);
    await createCards(cards);
    for (let i = 0; i < cards.length; i++) {
      await authorize(cards[i].uid).catch(console.log);
    }
    await authorize('erm');
  } catch (error){
    console.log(`Authorize test issue => ${error}`);
  } finally {
    await fs.rmdir(TEST_PATH, { recursive: true });
    // Recursive option to be deprecated? No promise/async fs.rm? Confusing
  }
}

module.exports = {
  noValidDbTest,
};
