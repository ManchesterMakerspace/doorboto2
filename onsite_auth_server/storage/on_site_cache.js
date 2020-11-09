// on_site_cache.mjs Copyright 2020 Manchester Makerspace MIT Licence
// local cache logic for power, database, or network failure events
const storage = require('node-persist');

const cacheSetup = async dir => {
  try {
    return await storage.init({ dir });
  } catch (error) {
    console.log(`cacheSetup issue: ${error}`);
  }
};

// Takes a card object and sets it to local storage
const updateCard = async ({ holder, expiry, validity, uid }) => {
  console.log(uid);
  console.log(holder);
  expiry = Number(expiry);
  try {
    await storage.setItem(uid, {
      holder,
      expiry,
      validity,
    });
  } catch (error) {
    console.log(`updateCard issue: ${error}`);
  }
};

// returns a matching card if it exist
const checkForCard = async (cardUid) => {
  try {
    const cards = await storage.data();
    for (let info of cards) {
      const { key, value } = info;
      if (key === cardUid) {
        return value;
      }
    }
    return null;
  } catch (error) {
    console.log(`checkForCard issue: ${error}`);
  }
};

module.exports = { 
  cacheSetup,
  updateCard,
  checkForCard,
};
