// integration_test Copyright 2020 Manchester Makerspace MIT License
// Test that require the reader, a slack credential, or db setup and access

import {
  recordsRejection,
  canUpdateCacheOfMembers,
  itCanOpenDoorQuickly,
  canAuthRecentlyUpdated,
  cleanUpDb,
} from '../doorboto_test';
import {
  canItDenyAccess,
  canItGrantAccess,
} from '../hardware_interface/reader_com_test';
import {
  itCanSendAdminMsg,
  itCanSendMsg,
} from '../outward_telemetry/slack_test';

const slackTest = async () => {
  try {
    await itCanSendMsg();
    await itCanSendAdminMsg();
  } catch (error) {
    console.log(`slackTest => ${error}`);
  }
};

const mongoTest = async () => {
  try {
    await canUpdateCacheOfMembers();
    await cleanUpDb();
    await recordsRejection();
    await cleanUpDb();
    await itCanOpenDoorQuickly();
    await cleanUpDb();
    await canAuthRecentlyUpdated();
    await cleanUpDb();
  } catch (error) {
    console.log(`mongoTest => ${error}`);
  }
};

const readerTest = () => {
  try {
    canItDenyAccess();
    canItGrantAccess();
  } catch (error) {
    console.log(`readerTest => ${error}`);
  }
};

const runAll = async () => {
  const dbPromise = mongoTest();
  const slackPromise = slackTest();
  // readerTest();
  await slackPromise;
  await dbPromise;
  process.exit(0);
};

const runOne = async () => {
  slackTest();
};

if (!module.parent) {
  runOne();
  // runAll();
}

export { readerTest, mongoTest, slackTest, runOne, runAll };
