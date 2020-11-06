// all_the_test.mjs Copyright 2020 Manchester Makerspace MIT License
const { runCacheTest } = require('./storage/on_site_cache_test.js');
const { authorizeTest } = require('./doorboto_test.js');

const run_them_all = async () => {
  try {
    await runCacheTest();
    await authorizeTest();
    process.exit(0);
  } catch (error){
    console.log(`Complete test issue => ${error}`);
  }
}

if(!module.parent){
  run_them_all();
}

module.exports = {
  run_them_all,
}