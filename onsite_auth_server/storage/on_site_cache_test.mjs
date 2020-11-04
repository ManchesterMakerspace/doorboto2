import { cacheSetup, updateCard, checkForCard } from './on_site_cache.mjs';
import fs from 'fs/promises';
import oid from './oid.mjs';

const createMockCard = () => {
  return {
    uid: oid(),
    holder: Math.round(Math.random()) ? 'Alice' : 'Bob',
    expiry: new Date().getTime(),
    validity: Math.round(Math.random()) ? 'good' : 'bad',
  };
};

const createCards = total => {
  const cards = [];
  for (let i = 0; i < total; i++) {
    cards.push(createMockCard());
  }
  return cards;
}

// load some cards see if they can be read
// clean up the mess afterwards
const runCacheTest = async (cards) => {
  const TEST_PATH = './test/';
  console.log(`running onsite cache test in ${TEST_PATH}`);
  try {
    await cacheSetup(TEST_PATH);
    const stats = await fs.stat(TEST_PATH);
    if (stats) {
      if (stats.isDirectory()) {
        console.log(`successful cache setup`);
      } else {
        throw new Error(`cache setup is not a directory`);
      }
    } else {
      throw new Error(`cache setup is not a thing`);
    }
    for (let i = 0; i < cards.length; i++) {
      await updateCard(cards[i]);
    }
    let foundCard = await checkForCard(cards[0].uid);
    if (foundCard) {
      console.log(`found loaded card ${JSON.stringify(foundCard)}`);
    } else {
      console.log();
      throw new Error(`Card created is unavailable`);
    }
    foundCard = await checkForCard('bogus');
    if (foundCard) {
      throw new Error(`bogus card found`);
    } else {
      console.log(`Bogus card returns ${foundCard}`);
    }
  } catch (error) {
    console.log(`Cache Issue => ${error}`);
  } finally {
    fs.rmdir(TEST_PATH, { recursive: true });
    // Recursive option to be deprecated? No promise/async fs.rm? Confusing
  }
};

runCacheTest(createCards(1));

export {
  createMockCard,
  createCards,
}