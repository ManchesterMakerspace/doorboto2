// database_sync.mjs Copyright 2020 Manchester Makerspace Licence MIT
const { MongoClient, ObjectID } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;
const DB_OPTIONS = {
  useUnifiedTopology: true,
}

const connectDB = async () => {
  const client = new MongoClient(MONGODB_URI, DB_OPTIONS);
  const returnObj = {
    db: null,
    closeDb: null,
  }
  try {
    if (!MONGODB_URI || !DB_NAME) {
      return returnObj;
    }
    await client.connect();
    returnObj.db = client.db(DB_NAME);
    returnObj.closeDb = client.close;
    return returnObj;
  } catch (error) {
    console.log(`connectDb => ${error}`);
    return returnObj;
  }
};

const insertDoc = doc => {
  return {
    _id: new ObjectID(),
    ...doc,
  };
};

// Hold db and closeDb in closure to use after standing check
const makeRecordOfScanFunc = (db, closeDb) => {
  return async (denied, cardData) => {
    const collection = denied ? 'rejections' : 'checkins';
    const data = denied ? cardData : {
      name: cardData.holder,
      time: new Date().getTime(),
    };
    await db.collection(collection).insertOne(insertDoc(data));
    closeDb()
  }
}

// takes a card and returns an insert function
const getCardFromDb = async uid => {
  const {db, closeDb} = await connectDB();
  // default to unregistered card
  let dbCardData = {
    uid,
    holder: null,
    validity: 'unregistered',
    expiry: 0,
  };
  const result = {
    dbCardData,
    recordScan: async () => {},
  }
  if(!db){
    return result;
  }
  result.dbCardData = await db.collection('cards').findOne({ uid });
  result.recordScan = makeRecordOfScanFunc(db, closeDb);
  return result;
}

module.exports = { 
  connectDB,
  insertDoc,
  getCardFromDb,
};
