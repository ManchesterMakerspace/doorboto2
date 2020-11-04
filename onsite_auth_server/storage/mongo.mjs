// database_sync.mjs Copyright 2020 Manchester Makerspace Licence MIT
import { MongoClient, ObjectID } from 'mongodb';

const connectDB = async () => {
  const client = new MongoClient(process.env.MONGODB_URI, {
    useUnifiedTopology: true,
  });
  try {
    await client.connect();
    return {
      db: client.db(process.env.DB_NAME),
      closeDb: client.close,
    };
  } catch (error) {
    console.log(`connecting error: ${error}`);
  }
};

const insertDoc = doc => {
  return {
    _id: new ObjectID(),
    ...doc,
  };
};

export { connectDB, insertDoc };
