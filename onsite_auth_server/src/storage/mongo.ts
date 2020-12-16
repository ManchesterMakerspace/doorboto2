// database_sync Copyright 2020 Manchester Makerspace Licence MIT
import { MongoClient, ObjectID } from 'mongodb';
import {
  MongoObject,
  GetCardFromDbReturn,
  MakeRecordFuncReturn,
  RecordCallbackParams,
} from '../interface';

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || '';
const DB_OPTIONS = {
  useUnifiedTopology: true,
};

const connectDB = async (): Promise<MongoObject> => {
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
const makeRecordOfScanFunc = ({
  db,
  client,
}: MongoObject): MakeRecordFuncReturn => {
  return async ({
    authorized,
    cardData,
  }: RecordCallbackParams): Promise<void> => {
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
const getCardFromDb = async (uid: string): Promise<GetCardFromDbReturn> => {
  const { db, client } = await connectDB();
  // default to unregistered card
  const result: GetCardFromDbReturn = {
    dbCardData: null,
    recordScan: async () => {},
  };
  result.dbCardData = await db.collection('cards').findOne({ uid });
  result.recordScan = makeRecordOfScanFunc({ db, client });
  return result;
};

export { connectDB, insertDoc, getCardFromDb, makeRecordOfScanFunc };
