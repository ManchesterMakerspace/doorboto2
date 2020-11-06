// all_the_test.mjs Copyright 2020 Manchester Makerspace MIT License
import { runCacheTest } from './storage/on_site_cache_test.mjs';
import { authorizeTest } from './doorboto_test.mjs';

const run_them_all = async () => {
  try {
    await runCacheTest();
    await authorizeTest();
  } catch (error){
    console.log(`Complete test issue => ${error}`);
  }
}

// run_them_all();

// runCacheTest()
//   .then(()=> {
//     process.exit(0);
//   }); 
// authorizeTest()
//   .then(()=> {
//     process.exit(0);
//   });
console.log(`${process.cwd()}`)

export {
  run_them_all,
}