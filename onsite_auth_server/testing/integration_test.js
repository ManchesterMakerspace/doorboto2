// integration_test.js Copyright 2020 Manchester Makerspace MIT License
// Test that require the reader, a slack credential, or db setup and access

const {
  recordsRejection,
  canUpdateCacheOfMembers,
} = require('../doorboto_test.js');
const { 
  canItDenyAccess,
  canItGrantAccess,
} = require('../hardware_interface/reader_com_test.js');

const runThemAll = async () => {
  try {
    canItDenyAccess();
    canItGrantAccess();
    await canUpdateCacheOfMembers();
    process.exit(0);
  } catch (error){
    console.log(`runThemAll => ${error}`);
  }
}

const runOne = async () => {
  try {
    // await runCacheTest();
    // await noValidDbTest();
    // await canUpdateCacheOfMembers();
    // canItGrantAccess();
    // canItDenyAccess();
    await recordsRejection();
    process.exit(0);
  } catch (error){
    console.log(`runOne => ${error}`);
  }
}

if(!module.parent){
  runOne();
  // runThemAll();
}

module.exports = {
  runThemAll,
  runOne,
}