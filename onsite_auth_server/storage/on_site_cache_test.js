const { cacheSetup, updateCard, checkForCard } = require('./on_site_cache.js');
const fs = require('fs/promises');
const oid = require('./oid.js');

const randomMockCard = () => {
  return {
    uid: oid(),
    holder: Math.round(Math.random()) ? 'Alice' : 'Bob',
    expiry: new Date().getTime(),
    validity: Math.round(Math.random()) ? 'activeMember' : 'lostCard',
  };
};

const acceptedCard = () => {
  return {
    uid: oid(),
    holder: Math.round(Math.random()) ? 'Alice' : 'Bob',
    expiry: new Date().getTime(),
    validity: 'activeMember',
  };
};

const rejectedCard = () => {
  return {
    uid: oid(),
    holder: Math.round(Math.random()) ? 'Alice' : 'Bob',
    expiry: new Date().getTime(),
    validity: 'lostCard',
  };
};

const createCardArray = (total) => {
  const cards = [];
  for (let i = 0; i < total; i++) {
    cards.push(randomMockCard());
  }
  return cards;
};

const createCards = async (cards) => {
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

module.exports = {
  createCardArray,
  createCards,
  runCacheTest,
  acceptedCard,
  rejectedCard,
};
