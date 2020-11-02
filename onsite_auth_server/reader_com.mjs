// reader_com Copyright 2020 Manchester Makerspace MIT Licence
import SerialPort, { Readline } from 'serialport';
// on yun DO NOT NPM INSTALL -> opkg install node-serialport, use global lib, actually new library probably no good
import { connectDB } from './database_sync';
import { slackSend } from './slack';

const RETRY_DELAY = 5000;

const reconnect = arduinoPort => {
  return error => {
    // given something went wrong try to re-establish connection
    if (error) {
      console.log(error);
    }
    setTimeout(() => {
      serialInit(arduinoPort);
    }, RETRY_DELAY);
  };
}

const serialInit = (events, arduinoPort = process.env.ARDUINO_PORT) => {
  const {authorize, checkin} = events;
  const port = new SerialPort(arduinoPort, { baudRate: 9600 });
  const parser = new Readline({ delimiter: '\r\n' });
  port.pipe(parser);
  // pipe read data through chosen parser
  port.on('open', () => {
    console.log(`Arduino connected on ${arduinoPort}`);
  });
  const grantAccess = async memberName => {
    // is called on successful authorization
    port.write('<a>');
    // a char grants access: wakkas help arduino know this is a distinct command
    try {
      const {db, closeDb} = await connectDB();
      checkin(memberName, db, closeDb);
    } catch (error){
      console.log(`Issue writing checkin to db on connect ${error}`);
    }
    slackSend(`${memberName} just checked in`);
  };
  const denyAccess = (msg, member) => {
    // is called on failed authorization
    port.write('<d>');
    // d char denies access: wakkas help arduino know this is a distinct command
    if (member) {
      const adminMsg =
        '<!channel> ```' +
          msg +
          '``` Maybe we missed renewing them or they need to be reached out to?';
      slackSend(adminMsg, process.env.MR_WEBHOOK);
    }
    slackSend(`denied access: ${msg}`);
  }

  parser.on('data', data => {
    authorize(data, grantAccess, denyAccess);
  });
  // Be sure to use parser that date stream is being piped into..
  port.on('close', reconnect(arduinoPort));
  port.on('error', reconnect(arduinoPort));
};

export {
  serialInit,
}