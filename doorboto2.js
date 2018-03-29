// doorboto2.js ~ Copyright 2017 Manchester Makerspace ~ License MIT
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
                    if(auth.checkRejection(card, onSuccess, onFail)){  // acceptence logic, this function cares about rejection
                        auth.reject(card, db);                         // Rejections: we have to wait till saved to close db
                    } else { db.close(); }                             // close connection to db regardless
                    cache.updateCard(card);                            // keep local redundant data cache up to date
                } else {                                               // no error, no card, this card is unregistered
                    onFail('unregistered card');                       // we want these to show up somewhere to register new cards
                    auth.reject({uid: cardID}, db);                    // so lets put them in mongo
                }
            });
        };
    },
    checkRejection: function(card, onSuccess, onFail){                         // When we have an actual record to check
        var rejected = true;                                                   // returns if card was reject if caller cares
        if(card.validity === 'activeMember' || card.validity === 'nonMember'){ // make sure card has been marked with a valid state
            if( new Date().getTime() < new Date(card.expiry).getTime()){       // make sure card is not expired
                onSuccess(card.holder);                                        // THIS IS WHERE WE LET PEOPLE IN! The one and only reason
                rejected = false;                                              // congrats you're not rejected
            } else {onFail(card.holder + ' has expired');}                     // given members time is up we want a polite message
        } else {onFail(card.holder + "'s " + card.validity + ' card was scanned');} // context around rejections is helpful
        return rejected;                                                       // would rather leave calling fuction to decide what to do
    },
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
    }
};

var slack = {
    webhook: require('@slack/client').IncomingWebhook,   // url to slack intergration called "webhook" can post to any channel as a "bot"
    URL: process.env.SLACK_WEBHOOK_URL,
    send: function(msg, channel){
        properties = {
            username: 'Doorboto',
            channel: channel,
            iconEmoji: ':robot_face:'
        };
        var sendObj = new slack.webhook(slack.URL, properties);
        sendObj.send(msg, function response(error, header, statusCode, body){
            if(error){console.log(msg + ' -- slack issue: ' + error);}
        });
    }
};

var cron = {  // runs a time based update opperation
    FREQUENCY: 3600000,                                          // every hour update cache (in milliseconds)
    update: function(){                                          // recursively called every day
        mongo.connectAndDo(cron.start);                          // connect to mongo and start an update stream
        setTimeout(cron.update, cron.FREQUENCY);                 // make upcomming expiration check every interval
    },
    start: function(db){
        cron.stream(db.collection('cards').find({}), db);        // pass cursor to iteate through and database to close on
    },
    stream: function(cursor, db){                                // recursively read cards from database to update cache
        process.nextTick(function nextCard(){                    // yeild to a potential card scan
            cursor.nextObject(function onCard(error, card){
                if(card){
                    cache.updateCard(card);                      // update local cache to be in sync with source of truth
                    cron.stream(cursor, db);                     // continue stream
                } else {
                    if(error){slack.send('Doorboto stream error: ' + error, 'infrastructure');}
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
            if(db){connected(db);}       // passes database object so databasy things can happen
            else  {slack.send('Doorboto connection error: ' + error , 'infrastructure');}
        });
    }
};

var arduino = {                          // does not need to be connected to an arduino, will try to connect to one though
    RETRY_DELAY: 5000,
    serialport: require('serialport'),   // yun DO NOT NPM INSTALL -> opkg install node-serialport, use global lib
    init: function(arduinoPort){
        arduino.serial = new arduino.serialport.SerialPort(arduinoPort, {
            baudrate: 9600,              // remember to set you sketch to go this same speed
            parser: arduino.serialport.parsers.readline('\n'),
            autoOpen: false
        });
        arduino.serial.on('open', function(){arduino.open(arduinoPort);});
        arduino.serial.on('data', arduino.read);
        arduino.serial.on('close', arduino.reconnect(arduinoPort));
        arduino.serial.on('error', arduino.reconnect(arduinoPort));
    },
    open: function(port){console.log('connected to: ' + port);}, // what to do when serial connection opens up with arduino
    read: function(data){                                        // getting data from Arduino, only expect a card
        var id = data.replace(/[^\x2F-\x7F]/g, '');              // remove everything except 0x2F through 0x7F on the ASCII table
        auth.orize(id, arduino.grantAccess, arduino.denyAccess); // check if this card has access
    },
    reconnect: function(port){
        return function(error){                      // given something went wrong try to re-establish connection
            if(error){console.log(error);}
            setTimeout(function(){arduino.init(port);}, arduino.RETRY_DELAY);
        };
    },
    grantAccess: function(memberName){               // is called on successful authorization
        arduino.serial.write('<a>');                 // a char grants access: wakkas help arduino know this is a distinct command
        slack.send(memberName + ' just checked in', 'doorboto'); // let members know through slack
    },
    denyAccess: function(msg){                       // is called on failed authorization
        arduino.serial.write('<d>');                 // d char denies access: wakkas help arduino know this is a distinct command
        slack.send('denied access: ' + msg, 'doorboto');         // let members know through slack
    }
};

// High level start up sequence
cache.persist.init();                                               // set up local cache
arduino.init(process.env.ARDUINO_PORT);                             // serial connect to arduino
cron.update();                                                      // run a time based stream that updates local cache
