// mongo_test Copyright 2020 Manchester Makerspace MIT License
// integration test for database interactions
import { CardData } from '../interface';
import { connectDB, makeRecordOfScanFunc } from './mongo';
import {
  createCardArray,
  acceptedCard,
  rejectedCard,
} from './on_site_cache_test';

const canMakeRecord = async () => {
  const cards = createCardArray(1);
  const { db, client } = await connectDB();
  const scanFunc = makeRecordOfScanFunc({ db, client });
  // The following should insert a random doc into rejections or checkin collection
  await scanFunc({
    authorized: cards[0].validity === 'activeMember' ? false : true,
    cardData: cards[0],
  }).catch(console.error);
};

const canMakeRejection = async () => {
  const { db, client } = await connectDB();
  const scanFunc = makeRecordOfScanFunc({ db, client });
  // The following should insert a random doc into rejections or checkin collection
  const cardData: CardData = rejectedCard();
  await scanFunc({
    authorized: cardData.validity === 'activeMember' ? false : true,
    cardData,
  });
};

const canMakeCheckin = async () => {
  const { db, client } = await connectDB();
  const scanFunc = makeRecordOfScanFunc({ db, client });
  // The following should insert a random doc into rejections or checkin collection
  const cardData: CardData = acceptedCard();
  await scanFunc({
    authorized: cardData.validity === 'activeMember' ? false : true,
    cardData,
  });
};

export = {
  canMakeRecord,
  canMakeCheckin,
  canMakeRejection,
};
