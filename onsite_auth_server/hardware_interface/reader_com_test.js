// reader_com_test.js Copyright 2020 Manchester Makerspace MIT License

const { serialInit } = require('./reader_com.js');

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

module.exports = {
  canItGrantAccess,
  canItDenyAccess,
};
