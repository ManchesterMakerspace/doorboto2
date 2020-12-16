// all_the_test.js Copyright 2020 Manchester Makerspace MIT License
import { runCacheTest } from '../storage/on_site_cache_test';
import {
  noValidDbTest,
  itUnderstandsBadStanding,
  itUnderstandsGoodStanding,
} from '../doorboto_test';

const runThemAll = async () => {
  try {
    itUnderstandsGoodStanding();
    itUnderstandsBadStanding();
    await runCacheTest();
    await noValidDbTest();
    process.exit(0);
  } catch (error) {
    console.log(`runThemAll => ${error}`);
  }
};

const runOne = async () => {
  try {
    itUnderstandsGoodStanding();
    itUnderstandsBadStanding();
    // await runCacheTest();
    // await noValidDbTest();
    // process.exit(0);
  } catch (error) {
    console.log(`runOne => ${error}`);
  }
};

if (!module.parent) {
  // runOne();
  runThemAll();
}

export { runThemAll, runOne };
