// mongo_test.js Copyright 2020 Manchester Makerspace MIT License
// integration test for database interactions
const { connectDB, makeRecordOfScanFunc } = require('./mongo.js');
const { createCardArray, acceptedCard, rejectedCard } = require('./on_site_cache_test.js');

const canMakeRecord = async () => {
  const cards = createCardArray(1);
  const {db, client} = await connectDB();
  const scanFunc = makeRecordOfScanFunc(db, client);
  // The following should insert a random doc into rejections or checkin collection  
  await scanFunc(cards[0].validity === "activeMember" ? false : true , cards[0])
    .catch(console.error);
}

const canMakeRejection = async () => {
  const {db, client} = await connectDB();
  const scanFunc = makeRecordOfScanFunc(db, client);
  // The following should insert a random doc into rejections or checkin collection 
  const card = rejectedCard(); 
  await scanFunc(card.validity === "activeMember" ? false : true , card);
}

const canMakeCheckin = async () => {
  const {db, client} = await connectDB();
  const scanFunc = makeRecordOfScanFunc(db, client);
  // The following should insert a random doc into rejections or checkin collection
  const card = acceptedCard();
  await scanFunc(card.validity === "activeMember" ? false : true , card);
}

module.exports = {
  canMakeRecord,
  canMakeCheckin,
  canMakeRejection,
}