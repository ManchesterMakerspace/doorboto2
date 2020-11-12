// reader_com Copyright 2020 Manchester Makerspace MIT Licence
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
// on yun DO NOT NPM INSTALL -> opkg install node-serialport,
// use global lib instead, actually new library probably no good
const RETRY_DELAY = 5000;
const ARDUINO_PORT = process.env.ARDUINO_PORT ?? null;

const reconnect = () => {
  return error => {
    // given something went wrong try to re-establish connection
    if (error) {
      console.log(error);
    }
    setTimeout(() => {
      serialInit();
    }, RETRY_DELAY);
  };
};

const serialInit = onData => {
  if(ARDUINO_PORT === null){
    console.log(`Port failed to be specified`);
    return; 
  }
  const port = new SerialPort(ARDUINO_PORT, { baudRate: 9600 });
  const parser = new Readline({ delimiter: '\r\n' });
  // pipe read data through chosen parser
  port.pipe(parser);
  port.on('open', () => {
    console.log(`Arduino connected on ${ARDUINO_PORT}`);
  });
  // Parser data stream is being piped into, expecting card UID
  parser.on('data', data => {
    onData(data, authorized => {
      // Reaction for when an authorized card is found
      port.write(authorized ? '<a>' : '<d>');
    });
  });
  // try to reconnect on errors or port close.
  // Could just be a wire disconnect
  port.on('close', reconnect());
  port.on('error', reconnect());
};

module.exports = { serialInit };
