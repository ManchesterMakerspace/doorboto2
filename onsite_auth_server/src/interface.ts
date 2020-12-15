// interface.ts Copyright 2020 Manchester Makerspace MIT License
import { Db, MongoClient } from 'mongodb';

interface cardDataI {
  holder: string | null;
  validity: string;
  expiry: number | null;
  uid?: string;
}

interface fullCardData extends cardDataI {
  uid: string;
}

interface standingI {
  cardData: cardDataI;
  authorized: boolean;
  msg: string;
}

interface giveAccessCallback {
  (authorized: boolean): void;
}

interface onDataCallback {
  (data: string, giveAccessCallback: giveAccessCallback): void;
}

interface recordCallbackParams {
  authorized: boolean;
  cardData: cardDataI;
}

interface makeRecordFuncReturn {
  (recordCallbackParams: recordCallbackParams): Promise<void>;
}

interface DBI {
  db: Db;
  client: MongoClient;
}

interface getCardFromDbReturn {
  dbCardData: fullCardData | null;
  recordScan: (recordCallbackParams: recordCallbackParams) => void;
}

export {
  cardDataI,
  fullCardData,
  standingI,
  giveAccessCallback,
  onDataCallback,
  recordCallbackParams,
  DBI,
  getCardFromDbReturn,
  makeRecordFuncReturn,
};
