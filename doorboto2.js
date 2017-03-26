// doorboto2.js ~ Copyright 2017 Manchester Makerspace ~ License MIT
var auth = {
    storage: require('node-persist'),
    init: function(){                    // kinda a redundant shortcut but maybe there could be more we want to start up
        return auth.storage.init();      // returns a promise that datastore is ready
    },
    updateMember: function(member){
        if(member.lost === undefined)   {member.lost=false;}    // defualt to false if nothing was passed
        if(member.revoked === undefined){member.revoked=false;} // defualt to false if nothing was passed
        return auth.storage.setItem(member.cardID, {'fullname': member.fullname, 'expirationTime': member.expirationTime,
                                                    'lost': member.lost, 'revoked': member.revoked});
    },
    removeMember: function(member){
        return auth.storage.removeItem(member.cardID);
    },
    orize: function(cardID, onSuccess, onFail){
        var stranger = true;
        auth.storage.forEach(function(key, member){
            if(key === cardID){
                stranger = false;
                if(member.lost || member.revoked){
                    if(member.lost){
                        onFail(member.fullname + "'s lost card was used");        // message for cards flagged as lost
                    } else {
                        onFail(member.fullname + ' see board about card access'); // message for members with revoked flag
                    }
                } else {
                    if(new Date().getTime() > new Date(member.expirationTime).getTime()){
                        onSuccess(member.fullname);
                    } else {
                        onFail(member.fullname + "'s card needs to be renewed");
                    }
                }
            }
        });
        if(stranger){
            socket.io.emit('regMember', {cardID: cardID}); // emit reg info to admin
            onFail('Unregistered Card');
        }
    }
};

var arduino = {                        // does not need to be connected to and arduino, will try to connect to one though
    serialLib: require('serialport'),  // yun DO NOT NPM INSTALL -> opkg install node-serialport, use global lib
    init: function(arduinoPort){
        arduino.serial = new arduino.serialLib.SerialPort(arduinoPort, {
            baudrate: 9600,           // remember to set you sketch to go this same speed
            parser: arduino.serialLib.parsers.readline('\n')
        });
        arduino.serial.on('open', arduino.open);
        arduino.serial.on('data', arduino.read);
        arduino.serial.on('close', arduino.close);
        arduino.serial.on('error', arduino.error);
    },
    open: function(){console.log('connected to something');},                   // what to do when serial connection opens up with arduino
    read: function(data){                                                       // getting data from Arduino, only expect a card ID
        var id = data.slice(0, data.length-1);                                  // exclude newline char from card ID
        var authFunction = auth.orize(arduino.grantAccess, arduino.denyAccess); // create authorization function
        authFunction(id);                                                       // use authorization function
    },
    close: function(){arduino.init();},              // try to re-establish if serial connection is interupted
    error: function(error){                          // given something went wrong try to re-establish connection
        setTimeout(arduino.init, RETRY_DELAY);       // retry every half a minute NOTE this will keep a heroku server awake
    },
    grantAccess: function(memberName){               // is called on successful authorization
        arduino.serial.write('<a>');                 // a char grants access: wakkas help arduino know this is a distinct command
        slack.send(memberName + ' just checked in'); // let members know through slack // TODO need a send to authrized services method
    },
    denyAccess: function(msg){                       // is called on failed authorization
        arduino.serial.write('<d>');                 // d char denies access: wakkas help arduino know this is a distinct command
        slack.send('denied access: ' + msg);         // let members know through slack
    }
};

var service = { // logic for adding a removing bot integrations
    s: [], // array where we store properties and functions of connected sevices
    create: function(name, socketId){
        service.s.push({
            socketId: socketId,
            name: name
        });
        console.log(botProperties.username + ' just connected');
    },
    disconnect: function(socketId){                                                // hold socketId information in closure
        return function socketDisconnect(){
            service.do(socketId, function removeService(index){
                var UTCString = new Date().toUTCString();                           // get a string of current time
                console.log(service.s[index].username+' disconnecting '+UTCString); // give a warning when a bot is disconnecting
                service.s.splice(index, 1);                                         // given its there remove bot from bots array
            });
        };
    },
    do: function(socketId, foundCallback){               // executes a callback with one of our bots based on socket id
        var serviceNumber = service.s.map(function(eachService){
            return eachService.socketId;
        }).indexOf(socketId);                            // figure index bot in our bots array
        if(clietNumber > -1){                            // NOTE we remove bots keeping ids in closure would be inaccurate
            foundCallback(serviceNumber);                 // part where do happens
        } else {
            console.log(socketId + ':found no bot?');    // service is not there? Should never happen but w.e.
        }
    }
};

var socket = {                                                         // depends on slack, register, search, auth: handle socket events
    io: require('socket.io'),
    listen: function(server){
        socket.io = sockets.io(server);
        socket.io.on('connection', function(client){                   // when any socket connects to us
            console.log('client connected:'+ client.id);               // notify when clients get connected to be assured good connections
            client.on('authenticate', socket.auth(client));            // initially clients can only ask to authenticate
        });
    },
    auth: function(client){                                                   // hold socketObj/key in closure, return callback to authorize user
        return function(authPacket){                                          // data passed from service {token:"valid token", name:"of service"}
            if(authPacket.token === process.env.DOORBOTO_TOKEN && authPacket.name){  // make sure we are connected w/ a trusted source with a name
                service.create(authPacket.name, client.id);                          // returns number in bot array
                client.on('disconnect', service.disconnect(client.id));              // remove service from service array on disconnect
            } else {                                                                 // in case token was wrong or name not provided
                console.log('Rejected socket connection: ' + client.id);
                client.on('disconnect', function(){
                    console.log('Rejected socket disconnected: ' + client.id);
                });
            }
        };
    }
};


// High level start up sequence
var http = require('http');                                   // Set up site framework
arduino.init(process.env.ARDUINO_PORT);                       // serial connect to arduino
sockets.listen(http);                                         // listen and handle socket connections
http.listen(process.env.PORT);                                // listen on specified PORT enviornment variable
