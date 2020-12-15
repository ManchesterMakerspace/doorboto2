// reader_com_test.js Copyright 2020 Manchester Makerspace MIT License

import { serialInit } from './reader_com.js';

const canItGrantAccess = () => {
  serialInit((data, giveAccess) => {
    console.log(data);
    giveAccess(true);
  });
};

const canItDenyAccess = () => {
  serialInit((data, giveAccess) => {
    console.log(data);
    giveAccess(false);
  });
};

export { canItGrantAccess, canItDenyAccess };
