// reader_com_test Copyright 2020 Manchester Makerspace MIT License
import { serialInit } from './reader_com';
import { GiveAccessCallback } from '../interface';

const canItGrantAccess = () => {
  serialInit((data: string, giveAccess: GiveAccessCallback) => {
    console.log(data);
    giveAccess(true);
  });
};

const canItDenyAccess = () => {
  serialInit((data: string, giveAccess: GiveAccessCallback) => {
    console.log(data);
    giveAccess(false);
  });
};

export { canItGrantAccess, canItDenyAccess };
