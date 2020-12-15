// database_sync Copyright 2020 Manchester Makerspace Licence MIT
import { MongoClient, ObjectID } from 'mongodb';
import {
  DBI,
  getCardFromDbReturn,
  makeRecordFuncReturn,
  recordCallbackParams,
} from '../interface';

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || '';
const DB_OPTIONS = {
  useUnifiedTopology: true,
};

const connectDB = async (): Promise<DBI> => {
  const client = new MongoClient(MONGODB_URI, DB_OPTIONS);
  if (!MONGODB_URI || !DB_NAME) {
    throw new Error(`Invalid env: ${DB_NAME} @ ${MONGODB_URI}`);
  }
  try {
    await client.connect();
    return {
      db: client.db(DB_NAME),
      client,
    };
  } catch (error) {
    throw new Error(`connectDb => ${error}`);
  }
};

const insertDoc = (doc: any): any => {
  return {
    ...doc,
    _id: new ObjectID(),
  };
};

// Hold db and closeDb in closure to use after standing check
const makeRecordOfScanFunc = ({ db, client }: DBI): makeRecordFuncReturn => {
  return async ({
    authorized,
    cardData,
  }: recordCallbackParams): Promise<void> => {
    const collection = authorized ? 'checkins' : 'rejections';
    const data = authorized
      ? {
          name: cardData.holder,
          time: new Date().getTime(),
        }
      : {
          ...cardData,
          timeOf: new Date(),
        };
    await db.collection(collection).insertOne(insertDoc(data));
    client.close();
  };
};

// takes a card and returns an insert function
const getCardFromDb = async (uid: string): Promise<getCardFromDbReturn> => {
  const { db, client } = await connectDB();
  // default to unregistered card
  const result: getCardFromDbReturn = {
    dbCardData: null,
    recordScan: async () => {},
  };
  result.dbCardData = await db.collection('cards').findOne({ uid });
  result.recordScan = makeRecordOfScanFunc({ db, client });
  return result;
};

export { connectDB, insertDoc, getCardFromDb, makeRecordOfScanFunc };
