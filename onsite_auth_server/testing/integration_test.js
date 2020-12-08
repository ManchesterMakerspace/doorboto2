// integration_test.js Copyright 2020 Manchester Makerspace MIT License
// Test that require the reader, a slack credential, or db setup and access

const {
  recordsRejection,
  canUpdateCacheOfMembers,
  itCanOpenDoorQuickly,
  canAuthRecentlyUpdated,
  cleanUpDb,
} = require('../doorboto_test.js');
const { 
  canItDenyAccess,
  canItGrantAccess,
} = require('../hardware_interface/reader_com_test.js');
const {
  itCanSendAdminMsg,
  itCanSendMsg,
} = require('../outward_telemetry/slack_test.js');

const slackTest = async () => {
  try {
    await itCanSendMsg();
    await itCanSendAdminMsg();
  } catch (error){
    console.log(`slackTest => ${error}`);
  }
}

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
  } catch (error){
    console.log(`mongoTest => ${error}`);
  }
}

const readerTest = () => {
  try {
    canItDenyAccess();
    canItGrantAccess();
  } catch (error){
    console.log(`readerTest => ${error}`);
  }
}

const runAll = async() => {
  const dbPromise = mongoTest();
  const slackPromise = slackTest();
  // readerTest();
  await slackPromise;
  await dbPromise;
  process.exit(0);
}

const runOne = async () => {
  slackTest();
}

if(!module.parent){
  runOne();
  // runAll();
}

module.exports = {
  readerTest,
  mongoTest,
  slackTest,
  runOne,
  runAll,
}