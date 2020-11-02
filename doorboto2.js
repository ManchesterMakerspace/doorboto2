// doorboto2.js ~ Copyright 2017 Manchester Makerspace ~ License MIT
var HOUR = 3600000;                    // an hour in milliseconds
var LENIENCY = HOUR * 72;              // give 3 days for a card to be renewed

var cache = {                          // local cache logic for power or database failure events
    persist: require('node-persist'),  // methods for storing JSON objects in local files
    updateCard: function(card){        // processes cards
        var cardInfo = {               // filter down to only the properties we would like to save
            'holder':   card.holder,
            'expiry':   Number(card.expiry), // just be extra sure that this is indeed a number it needs to be
            'validity': card.validity,
        };
        cache.persist.setItem(card.uid, cardInfo); // setItem works like and upsert, this also creates cards
    },
    check: function(cardID, onSuccess, onFail){                      // hold cardID and callbacks in closure
        return function cacheCheck(){                                // returns callback to occur on failed db connection
            var strangerDanger = true;                               // not if card is familiar or not
            cache.persist.forEach(function(key, card){
                if(key === cardID){
                    strangerDanger = false;                          // mark card as now familiar
                    auth.checkRejection(card, onSuccess, onFail);    // check if this card is valid or not
                }
            }); // if card is still unfamiliar after looking for a familiar one
            if(strangerDanger){onFail();}
        };
    }
};

var record = {                                                       // collection of methods that write to makerspace database
    reject: function(card, db){
        db.collection('rejections').insertOne({
            _id: new mongo.ObjectId(),                               // do this so database doesn't need to
            uid: card.uid,                                           // should always have uid
            holder: card.holder ? card.holder : null,                // we only get this when a recorded card holder is rejected
            validity: card.validity ? card.validity : 'unregistered',// important to know this is an unregistered card if info missing
            timeOf: new Date()                                       // should be same as mongoose default
        }, function(error, data){
            if(error){console.log(error + ': Could not save reject -> ' + card.uid);} // knowing who it was might be important
            db.close(); // error or not close connection to db after saving a rejection
        });
    },
    checkin: function(member, db){     // keeps check in history for an active membership count
        db.collection('checkins').insertOne({
            _id: new mongo.ObjectId(),
            name: member,
            time: new Date().getTime()
        }, function(error, data){
            if(error){console.log(error + '; could not save check in for -> ' + member);}
            db.close();                // error or not close connection to db after check in
        });
    }
};

var auth = {
    orize: function(cardID, onSuccess, onFail){
        cache.check(cardID, onSuccess, function notInLocal(){   // Check in cache first its faster and up to date enough to be close to the source of truth
            mongo.connectAndDo(                                 // given no local entry or rejection maybe this is a new one or card is more up to date in db
                auth.mongoCardCheck(cardID, onSuccess, onFail), // if we can connect to mongo use db findOne
                function failedToConnectToDB(){                 // not in local cache could not connect to db
                    console.log(cardID + ' rejected');          // private to system log
                    onFail('not in cache and failed to connect to db'); // sorry amnesia
                }
            );
        })(); // cache.check returns a function, and that needs to be executed()
    },
    mongoCardCheck: function(cardID, onSuccess, onFail){      // hold important top level items in closure
        return function onConnect(db){            // return a callback to execute on connection to mongo
            db.collection('cards').findOne({'uid': cardID}, function onCard(error, card){
                if(error){
                    db.close();                                        // close connection lets move on
                    console.log('mongo findOne error: ' + error);      // Log error to debug possible mongo problem
                    onFail(' not in cache, db error');                 // Sends event and message to slack if connected
                } else if(card){                                       // given we got a record back from mongo
                    if(auth.checkRejection(card, onSuccess, onFail)){  // acceptance logic, this function cares about rejection
                        record.reject(card, db);                       // Rejections: we have to wait till saved to close db
                    } else {db.close();}                               // not sure if this is actually being called...
                    cache.updateCard(card);                            // keep local redundant data cache up to date
                } else {                                               // no error, no card, this card is unregistered
                    onFail('unregistered card');                       // we want these to show up somewhere to register new cards
                    record.reject({uid: cardID}, db);                  // so lets put them in mongo
                }
            });
        };
    },
    checkRejection: function(card, onSuccess, onFail){                         // When we have an actual record to check
        var rejected = true;                                                   // returns if card was reject if caller cares
        if(card.validity === 'activeMember' || card.validity === 'nonMember'){ // make sure card has been marked with a valid state
            if( new Date().getTime() < new Date(card.expiry).getTime() + LENIENCY){ // make sure card is not expired
                onSuccess(card.holder);                                        // THIS IS WHERE WE LET PEOPLE IN! The one and only reason
                rejected = false;                                              // congrats you're not rejected
            } else {onFail(card.holder + ' has expired', card.holder);}                          // given members time is up we want a polite message
        } else {onFail(card.holder + "'s " + card.validity + ' card was scanned', card.holder);} // context around rejections is helpful
        return rejected;                                                       // would rather leave calling function to decide what to do
    }
};

var request = require('request');
var slack = {
    send: function(msg, issue){
        if(issue){console.log(msg + ' : ' + issue);}
        slack.rawSend(msg, process.env.DOORBOTO_WEBHOOK);
    },
    rawSend: function(msg, webhook){
        var options = { uri: webhook, method: 'POST', json: {'text': msg} };
        request(options, function requestResponse(error, response, body){
            if(error){console.log('webhook request error ' + error);}
        });
    }
};

var cron = {  // runs a time based update operation
    update: function(){                                          // recursively called every day
        mongo.connectAndDo(cron.start);                          // connect to mongo and start an update stream
        setTimeout(cron.update, HOUR);                           // make upcoming expiration check every interval
    },
    start: function(db){
        cron.stream(db.collection('cards').find({}), db);        // pass cursor to iterate through and database to close on
    },
    stream: function(cursor, db){                                // recursively read cards from database to update cache
        process.nextTick(function nextCard(){                    // yield to a potential card scan
            cursor.nextObject(function onCard(error, card){
                if(card){
                    cache.updateCard(card);                      // update local cache to be in sync with source of truth
                    cron.stream(cursor, db);                     // continue stream
                } else {
                    if(error){slack.send('Update issue', error);}
                    db.close();
                }                             // close connection: keep in mind tracking if we are connected is more work
            });
        });
    }
};

var mongo = {
    URI: process.env.MONGO_URI,
    client: require('mongodb').MongoClient,
    ObjectId: require('mongodb').ObjectID,
    connectAndDo: function(connected){   // url to db and what well call this db in case we want multiple
        mongo.client.connect(mongo.URI, function onConnect(error, db){
            if(db){connected(db);}       // passes database object so database things can happen
            else  { slack.send('failed to connect to database', error); }
        });
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
        mongo.connectAndDo(function(db){record.checkin(memberName, db);});
        slack.send(memberName + ' just checked in'); // let members know through slack
    },
    denyAccess: function(msg, member){               // is called on failed authorization
        arduino.serial.write('<d>');                 // d char denies access: wakkas help arduino know this is a distinct command
        if(member){
            slack.rawSend('<!channel> ```' + msg + '``` Maybe we missed renewing them or they need to be reached out to?', process.env.MR_WEBHOOK);
        }
        slack.send('denied access: ' + msg);         // let members know through slack
    }
};

// High level start up sequence
cache.persist.init();                                               // set up local cache
arduino.init(process.env.ARDUINO_PORT);                             // serial connect to arduino
cron.update();                                                      // run a time based stream that updates local cache
