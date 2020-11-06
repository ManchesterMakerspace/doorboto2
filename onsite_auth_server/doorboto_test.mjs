// doorboto_test.mjs Copyright 2020 Manchester Makerspace MIT Licence
import { authorize } from './doorboto.mjs';
import { createCardArray, createCards } from './storage/on_site_cache_test.mjs';
import { cacheSetup } from './storage/on_site_cache.mjs';
import fs from 'fs/promises';

const authorizeTest = async () =>{
  const TEST_PATH = './test/';
  console.log(`running authorize test in ${TEST_PATH}`);
  try {
    await cacheSetup(TEST_PATH);
    // const cards = createCardArray(2);
    // await createCards(cards);
    // for (let i = 0; i < cards.length; i++) {
    //   await authorize(cards[i].uid);
    // }
    await authorize('erm');
  } catch (error){
    console.log(`Authorize test issue => ${error}`);
  } finally {
    fs.rmdir(TEST_PATH, { recursive: true });
    // Recursive option to be deprecated? No promise/async fs.rm? Confusing
  }
}

export {
  authorizeTest,
};
