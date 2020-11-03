// on_site_cache.mjs Copyright 2020 Manchester Makerspace MIT Licence
import { init } from 'node-persist'

const cacheSetup = async () => {
  await init();
}

export {
  cacheSetup,
}
