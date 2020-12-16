// interface.ts Copyright 2020 Manchester Makerspace MIT License
import { Db, MongoClient } from 'mongodb';

interface CardData {
  holder: string | null;
  validity: string;
  expiry: number | null;
  uid: string;
}

interface Standing {
  cardData: CardData;
  authorized: boolean;
  msg: string;
}

interface GiveAccessCallback {
  (authorized: boolean): void;
}

interface OnDataCallback {
  (data: string, giveAccessCallback: GiveAccessCallback): void;
}

interface RecordCallbackParams {
  authorized: boolean;
  cardData: CardData;
}

interface MakeRecordFuncReturn {
  (recordCallbackParams: RecordCallbackParams): Promise<void>;
}

interface MongoObject {
  db: Db;
  client: MongoClient;
}

interface GetCardFromDbReturn {
  dbCardData: CardData | null;
  recordScan: (recordCallbackParams: RecordCallbackParams) => void;
}

export {
  CardData,
  Standing,
  GiveAccessCallback,
  OnDataCallback,
  RecordCallbackParams,
  MongoObject,
  GetCardFromDbReturn,
  MakeRecordFuncReturn,
};
