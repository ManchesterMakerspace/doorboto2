// on_site_cache_test Copyright 2020 Manchester Makerspace Licence MIT
import { cacheSetup, updateCard, checkForCard } from './on_site_cache';
import fs from 'fs/promises';
import oid from './oid.js';
import { FullCardData } from '../interface';

const randomMockCard = (): FullCardData => {
  return {
    uid: oid(),
    holder: Math.round(Math.random()) ? 'Alice' : 'Bob',
    expiry: new Date().getTime(),
    validity: Math.round(Math.random()) ? 'activeMember' : 'lostCard',
  };
};

const acceptedCard = (): FullCardData => {
  return {
    uid: oid(),
    holder: Math.round(Math.random()) ? 'Alice' : 'Bob',
    expiry: new Date().getTime(),
    validity: 'activeMember',
  };
};

const rejectedCard = (): FullCardData => {
  return {
    uid: oid(),
    holder: Math.round(Math.random()) ? 'Alice' : 'Bob',
    expiry: new Date().getTime(),
    validity: 'lostCard',
  };
};

const createCardArray = (total: number): Array<FullCardData> => {
  const cards = [];
  for (let i = 0; i < total; i++) {
    cards.push(randomMockCard());
  }
  return cards;
};

const createCards = async (cards: Array<FullCardData>) => {
  try {
    for (let i = 0; i < cards.length; i++) {
      await updateCard(cards[i]);
    }
  } catch (error) {
    console.log(`create issue => ${error}`);
  }
};

// load some cards see if they can be read
// clean up the mess afterwards
const runCacheTest = async () => {
  const TEST_PATH = `${__dirname}/test_storage/`;
  console.log(`running onsite cache test in ${TEST_PATH}`);
  const cards = createCardArray(1);
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
    await createCards(cards);
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
    await fs.rmdir(TEST_PATH, { recursive: true });
    // Recursive option to be deprecated? No promise/async fs.rm? Confusing
  }
};

// runCacheTest(createCardArray(1));

export {
  createCardArray,
  createCards,
  runCacheTest,
  acceptedCard,
  rejectedCard,
};
