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

module.exports = { connectDB, insertDoc };
