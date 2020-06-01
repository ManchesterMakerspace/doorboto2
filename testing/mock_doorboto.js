// mock_doorboto.js ~ Copyright 2020 Manchester Makerspace ~ License MIT

var auth = {
    orize: function(cardID, onSuccess, onFail){
        if (cardID === process.env.APPROVED_CARD){
          console.log("")
          onSuccess();
        } else {
          console.log("Denied: " + cardID)
          onFail();
        }
    }
};

var SerialPort = require('serialport');  // on yun DO NOT NPM INSTALL -> opkg install node-serialport, use global lib, actually new library probably no good
var arduino = {                          // does not need to be connected to an arduino, will try to connect to one though
    RETRY_DELAY: 5000,
    init: function(arduinoPort){
        arduino.serial = new SerialPort(arduinoPort, {baudRate: 9600});
        arduino.parser = new SerialPort.parsers.Readline({delimiter: '\r\n'});
        arduino.serial.pipe(arduino.parser);        // pipe read data through chosen parser
        arduino.serial.on('open', function(){arduino.open(arduinoPort);});
        arduino.parser.on('data', arduino.read); // Be sure to use parser that date stream is being piped into..
        arduino.serial.on('close', arduino.reconnect(arduinoPort));
        arduino.serial.on('error', arduino.reconnect(arduinoPort));
    },
    open: function(port){console.log('connected to: ' + port);},   // what to do when serial connection opens up with arduino
    read: function(data){                                          // getting data from Arduino, only expect a card
        auth.orize(data, arduino.grantAccess, arduino.denyAccess); // check if this card has access
    },
    reconnect: function(port){
        return function(error){                      // given something went wrong try to re-establish connection
            if(error){console.log(error);}
            setTimeout(function(){arduino.init(port);}, arduino.RETRY_DELAY);
        };
    },
    grantAccess: function(memberName){               // is called on successful authorization
        arduino.serial.write('<a>');                 // a char grants access: wakkas help arduino know this is a distinct command
    },
    denyAccess: function(msg, member){               // is called on failed authorization
        arduino.serial.write('<d>');                 // d char denies access: wakkas help arduino know this is a distinct command
};

// High level start up sequence
arduino.init(process.env.ARDUINO_PORT);                             // serial connect to arduino
