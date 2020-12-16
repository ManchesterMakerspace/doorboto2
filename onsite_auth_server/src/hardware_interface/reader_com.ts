// reader_com Copyright 2020 Manchester Makerspace MIT Licence
import SerialPort from 'serialport';
const Readline = require('@serialport/parser-readline');
import { OnDataCallback } from '../interface';
// on yun DO NOT NPM INSTALL -> opkg install node-serialport,
// use global lib instead, actually new library probably no good
const RETRY_DELAY = 5000;
const ARDUINO_PORT = process.env.ARDUINO_PORT ?? null;

const reconnect = (onData: OnDataCallback) => {
  return (error: string) => {
    // given something went wrong try to re-establish connection
    if (error) {
      console.log(error);
    }
    setTimeout(() => {
      serialInit(onData);
    }, RETRY_DELAY);
  };
};

const serialInit = (onData: OnDataCallback) => {
  if (ARDUINO_PORT === null) {
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
  parser.on('data', (data: string) => {
    onData(data, (authorized: boolean) => {
      // Reaction for when an authorized card is found
      port.write(authorized ? '<a>' : '<d>');
    });
  });
  // try to reconnect on errors or port close.
  // Could just be a wire disconnect
  port.on('close', reconnect(onData));
  port.on('error', reconnect(onData));
};

export { serialInit };
