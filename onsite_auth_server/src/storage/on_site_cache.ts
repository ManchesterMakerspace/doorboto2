// on_site_cache Copyright 2020 Manchester Makerspace MIT Licence

// local cache logic for power, database, or network failure events
import storage, { InitOptions } from 'node-persist';
import { FullCardData } from '../interface';

const cacheSetup = async (dir: string): Promise<InitOptions | undefined> => {
  try {
    return await storage.init({ dir });
  } catch (error) {
    console.log(`cacheSetup => ${error}`);
  }
};

// Takes a card object and sets it to local storage
const updateCard = async ({
  holder,
  expiry,
  validity,
  uid,
}: FullCardData): Promise<void> => {
  expiry = Number(expiry);
  try {
    await storage.setItem(uid, {
      holder,
      expiry,
      validity,
    });
  } catch (error) {
    console.log(`updateCard => ${error}`);
  }
};

// returns a matching card if it exist
const checkForCard = async (uid: string): Promise<undefined | FullCardData> => {
  try {
    const cards = await storage.data();
    for (let info of cards) {
      const { key, value } = info;
      if (key === uid) {
        return {
          uid,
          ...value,
        };
      }
    }
  } catch (error) {
    console.log(`checkForCard => ${error}`);
  }
};

export { cacheSetup, updateCard, checkForCard };
