// database_sync.mjs Copyright 2020 Manchester Makerspace Licence MIT
import mongodb from 'mongodb';
const { MongoClient, ObjectID } = mongodb;

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;
const DB_OPTIONS = {
  useUnifiedTopology: true,
}

const connectDB = async () => {
  const client = new MongoClient(MONGODB_URI, DB_OPTIONS);
  try {
    if (!MONGODB_URI || !DB_NAME) {
      throw new Error(`missing db env vars`);
    }
    await client.connect();
    return {
      db: client.db(DB_NAME),
      closeDb: client.close,
    };
  } catch (error) {
    console.log(`connectDb => ${error}`);
  }
};

const insertDoc = doc => {
  return {
    _id: new ObjectID(),
    ...doc,
  };
};

export { connectDB, insertDoc };
