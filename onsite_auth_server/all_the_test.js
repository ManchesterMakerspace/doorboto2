// all_the_test.mjs Copyright 2020 Manchester Makerspace MIT License
const { runCacheTest } = require('./storage/on_site_cache_test.js');
const { noValidDbTest } = require('./doorboto_test.js');

const runThemAll = async () => {
  try {
    await runCacheTest();
    await noValidDbTest();
    process.exit(0);
  } catch (error){
    console.log(`runThemAll => ${error}`);
  }
}

const runOne = async () => {
  try {
    // await runCacheTest();
    await noValidDbTest();
    process.exit(0);
  } catch (error){
    console.log(`runOne => ${error}`);
  }
}

if(!module.parent){
  // runOne();
  runThemAll();
}

module.exports = {
  runThemAll,
  runOne,
}