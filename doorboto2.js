// doorboto2.js ~ Copyright 2017 Manchester Makerspace ~ License MIT

var auth = {
    storage: require('node-persist'),
    updateCard: function(onComplete){ // hold on completion function in closure
        return function(card){        // return a fuction that processes cards
            var cardInfo = {
                'holder':   card.holder,
                'expiry':   card.expiry,
                'validity': card.validity,
            };
            console.log('Updating: ' + JSON.stringify(cardInfo, null, 4));
            auth.storage.setItem(card.uid, cardInfo) // setItem works like and upsert, this also creates cards
                .then(function(){onComplete();})     // execute completion callback when done updating cache
                .catch(function(error){console.log('error updating card: ' + error);});
        };
    },
    removeCard: function(card){return auth.storage.removeItem(card.uid);}, // return promise card was removed
    orize: function(cardID, onSuccess, onFail){
        var scannedCard = { // default member in question
            uid: cardID,
            validity: 'unregistered'
        };
        mongo.connectAndDo(
            auth.mongoCardCheck(scannedCard, onSuccess, onFail), // if we can connect to mongo use db findOne
            auth.localCheck(scannedCard, onSuccess, onFail)      // otherwise check local back up
        );
    },
    localCheck: function(scannedCard, onSuccess, onFail){
        return function backupCheck(){
            var strangerDanger = true;         // not if card is familiar or not
            auth.storage.forEach(function(key, card){
                if(key === scannedCard.uid){
                    strangerDanger = false;    // mark card as now familiar
                    auth.recordCheck(card, onSuccess, onFail, false);
                }
            });
            if(strangerDanger){                // if card is still unfamiliar after looking for a familiar one
                onFail('no local copy: ' + scannedCard.uid);
            }
        };
    },
    mongoCardCheck: function(scannedCard, onSuccess, onFail){ // hold important top level items in closure
        return function onConnect(onFinish){                  // return a callback to execute on connection to mongo
            mongo.cards.findOne({uid: scannedCard.uid}, function onCard(error, card){
                if(error){
                    console.log('mongo findOne error: ' + error);
                    auth.localCheck(scannedCard, onSuccess, onFail)(); // if there is some sort or read error fallback to local data
                } else if(card){
                    auth.recordCheck(card, onSuccess, onFail, true);
                    auth.updateCard()(card);                           // keep local redundant data cache up to date
                } else {
                    onFail('unregistered card');
                    mongo.saveTheRejects(scannedCard.uid);
                }
            });
            onFinish();
        };
    },
    recordCheck: function(card, onSuccess, onFail, mongoConnected){            // checks status of card on record
        if(card.validity === 'activeMember' || card.validity === 'nonMember'){ // make sure card has been marked with a valid state
            if( new Date().getTime() > new Date(card.expiry).getTime()){       // make sure card is not expired
                onSuccess(card.holder);
            } else { // given member is expired
                onFail(card.holder + ' has expired');
                if(mongoConnected){mongo.saveTheRejects(card);}
            }
        } else {
            onFail(card.holder + "'s " + card.validity + ' card was scanned');
            if(mongoConnected){mongo.saveTheRejects(card);}
        }
    }
};


var cron = {  // runs a time based update opperation
    ONE_DAY: 86400000,
    progressCount: 0,
    done: false,
    init: function(hourToUpdate){
        mongo.connectAndDo('cards', cron.stream, cron.failCase); // run an initial sync up on start
        var runTime = cron.millisToHourTomorrow(hourToUpdate); // gets millis till this hour tomorrow
        setTimeout(cron.update, runTime);                      // schedual checks daily for warnigs at x hour from here after
    },
    update: function(){                                        // recursively called every day
        mongo.connectAndDo(cron.stream, cron.failCase);        // connect to mongo and start an update stream
        setTimeout(cron.update, cron.ONE_DAY);                 // make upcomming expiration check every interval
    },
    checkFinished: function(close){
        if(cron.progressCount === 0 && cron.done){             // given we've made all updates and stream closed
            close();                                           // reduce risk of having a open connection durring an outage
            cron.done = false;                                 // reset for next update
        }
    },
    markProgress: function(close){                             // returns data processing success callback
        cron.progressCount++;                                  // increase count for outstanding jobs
        return function afterProcessingData(){                 // data processing success callback
            cron.progressCount--;                              // note processed job
            cron.checkFinished(close);                         // closes connetion if finished
        };
    },
    stream: function(dbModel, close){                          // Passed dbModel and close event to call when done
        var cursor = dbModel.find({}).cursor();                // grab cursor to parse through all cards
        cursor.on('data', auth.updateCard(cron.markProgress(close))); // local persitence update function to sync w/ source of truth
        cursor.on('close', function(){                         // if I thought about this more carefully closing mongo here would be ok
            cron.done = true;                                  // flag to allow job to complete
            console.log('finished stream');
            cron.checkFinished(close);                         // if outstanding jobs are complete run finished action, prob not now
        });
    },
    failCase: function(error){console.log('Failed to update local datastore: ' + error);},
    millisToHourTomorrow: function(hour){
        var currentTime = new Date().getTime();         // current millis from epoch
        var tomorrowAtX = new Date();                   // create date object for tomorrow
        tomorrowAtX.setDate(tomorrowAtX.getDate() + 1); // point date to tomorrow
        tomorrowAtX.setHours(hour, 0, 0, 0);            // set hour to send tomorrow
        return tomorrowAtX.getTime() - currentTime;     // subtract tomo millis from epoch from current millis from epoch
    },
};

var mongo = { // depends on: mongoose
    ose: require('mongoose'),
    uri: process.env.MONGO_URI,
    cards: function(){
        return new mongo.ose.Schema({          // Read only by doorboto -- Write only by Interface
            id: mongo.ose.Schema.ObjectId,
            uid: {type: String, required: '{PATH} is required', unique: true}, // UID of card, collection find key
            holder: {type: String, required: '{PATH} is required'},            // for quickly leaving messages about dated cards without looking up member Maybe not needed
            memberID: {type: String, required: '{PATH} is required'},          // _id of member object fastest way to acurately look up a member
            cardToken: {type: String},                                         // 8 byte QID unique to member, proposing to use in conjunction with UID
            expiry: {type: Number},                                            // expiration of this member
            validity: {type: String, required: '{PATH} is required'}           // activeMember, nonMember, expired, revoked, lost, stolen
        });
    },
    rejections: function(){
        return new mongo.ose.Schema({// list of rejected cards, interface can grab last to register new members instead of using socket.io Write only by doorboto
            id: mongo.ose.Schema.ObjectId,
            uid: {type: String, required: '{PATH} is required'},
            holder: {type: String},                                            // if in db note member this could change if card are reused
            validity: {type: String, required: '{PATH} is required'},          // validity at time of scan, set to unregistered if not in db
            timeOf: {type: Date, default: Date.now}
        });
    },
    connectAndDo: function(collection, success, fail){
        var connection = mongo.ose.createConnection(mongo.uri);
        var dbModel = connection.model(collection, mongo[collection]());
        connection.on('connected', function(){
            success(dbModel, function callClose(){
                connection.close();
            });
        });
        connection.on('disconnected', function(){
            console.log('disconnected from db');
        });
    },
    saveTheRejects: function(card){  // TODO will not work in current situation
        var cardToSave = { // make sure we are only saving feilds that are in our schema, though this might be schema's job
            uid: card.uid,
            holder: card.holder,
            validity: card.validity
        };
        var rejectDoc = new mongo.rejections(cardToSave);
        rejectDoc.save(function(error){
            if(error){console.log('Could not save reject: ' + cardToSave.uid);}
        });
    }
};

var slack = {
    io: require('socket.io-client'),                         // to connect to our slack intergration server
    firstConnect: false,
    connected: false,
    init: function(intergrationServer, authToken){
        try {
            slack.io = slack.io(intergrationServer);         // slack https server
            slack.firstConnect = true;
        } catch (error){
            console.log('could not connect to ' + intergrationServer + ' cause:' + error);
            setTimeout(slack.init, 60000);                   // try again in a minute maybe we are disconnected from the network
        }
        if(slack.firstConnect){
            slack.io.on('connect', function authenticate(){  // connect with masterslacker
                slack.io.emit('authenticate', {
                    token: authToken,
                    slack: {
                        username: 'Doorboto2',
                        // channel: 'whos_at_the_space', // TODO COMMENT THIS IN WHEN YOU DEPLOY IDIOT
                        channel: 'test_channel',
                        iconEmoji: ':robot_face:'
                    }
                }); // its important lisner know that we are for real
                slack.connected = true;
            });
            slack.io.on('disconnect', function disconnected(){slack.connected = false;});
        }
    },
    send: function(msg){
        if(slack.connected){ slack.io.emit('msg', msg);
        } else { console.log('404:'+msg); }
    },
    pm: function(handle, msg){
        if(slack.connected){ slack.io.emit('pm', {userhandle: handle, msg: msg});
        } else { console.log('404:'+msg);}
    }
};

var arduino = {                          // does not need to be connected to and arduino, will try to connect to one though
    RETRY_DELAY: 5000,
    serialport: require('serialport'),   // yun DO NOT NPM INSTALL -> opkg install node-serialport, use global lib
    init: function(arduinoPort){
        arduino.serial = new arduino.serialport.SerialPort(arduinoPort, {
            baudrate: 9600,              // remember to set you sketch to go this same speed
            parser: arduino.serialport.parsers.readline('\n'),
            autoOpen: false
        });
        arduino.serial.on('open', arduino.open);
        arduino.serial.on('data', arduino.read);
        arduino.serial.on('close', arduino.close);
        arduino.serial.on('error', arduino.error);
    },
    open: function(){console.log('connected to something');},    // what to do when serial connection opens up with arduino
    read: function(data){                                        // getting data from Arduino, only expect a card ID
        var id = data.slice(0, data.length-1);                   // exclude newline char from card ID
        auth.orize(id, arduino.grantAccess, arduino.denyAccess); // create authorization function
    },
    close: function(){arduino.init();},                 // try to re-establish if serial connection is interupted
    error: function(error){                             // given something went wrong try to re-establish connection
        setTimeout(arduino.init, arduino.RETRY_DELAY);  // retry every half a minute NOTE this will keep a heroku server awake
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

// High level start up sequence
auth.storage.init()                                                         // set up local cache
    .then(function localCacheIsUp(){                                        // when local cache is
        // arduino.init(process.env.ARDUINO_PORT);                             // serial connect to arduino
        cron.init(3);                                // run a time based stream that updates local cache
        // slack.init(process.env.MASTER_SLACKER, process.env.CONNECT_TOKEN);  // set up connection to our slack intergration server
    });
