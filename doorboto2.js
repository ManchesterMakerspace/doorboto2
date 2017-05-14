// doorboto2.js ~ Copyright 2017 Manchester Makerspace ~ License MIT

var cache = {                          // local cache logic for power or database failure events
    persist: require('node-persist'),  // methods for storing JSON objects in local files
    updateCard: function(card){        // processes cards
        var cardInfo = {               // filter down to only the properties we would like to save
            'holder':   card.holder,
            'expiry':   card.expiry,
            'validity': card.validity,
        };
        cache.persist.setItem(card.uid, cardInfo); // setItem works like and upsert, this also creates cards
    },
    removeCard: function(card){cache.persist.removeItem(card.uid);}, // right know we are storing everything
    check: function(cardID, onSuccess, onFail){                      // hold cardID and callbacks in closure
        return function cacheCheck(){                                // returns callback to occur on failed db connection
            var strangerDanger = true;                               // not if card is familiar or not
            cache.persist.forEach(function(key, card){
                if(key === cardID){
                    strangerDanger = false;                          // mark card as now familiar
                    auth.checkRejection(card, onSuccess, onFail);    // check if this card is valid or not
                }
            }); // if card is still unfamiliar after looking for a familiar one
            if(strangerDanger){onFail('no local copy: ' + scannedCard.uid);}
        };
    }
};

var auth = {
    orize: function(cardID, onSuccess, onFail){
        mongo.connectAndDo(
            auth.mongoCardCheck(cardID, onSuccess, onFail), // if we can connect to mongo use db findOne
            cache.check(cardID, onSuccess, onFail)          // otherwise check local back up
        );
    },
    mongoCardCheck: function(cardID, onSuccess, onFail){      // hold important top level items in closure
        return function onConnect(dbModel, close){            // return a callback to execute on connection to mongo
            dbModel.cards.findOne({uid: cardID}, function onCard(error, card){
                if(error){
                    close();                                           // close connection lets move on
                    console.log('mongo findOne error: ' + error);      // Log error to debug possible mongo problem
                    cache.check(cardID, onSuccess, onFail)();          // if there is some sort or read error fallback to local data
                } else if(card){                                       // given we got a record back from mongo
                    if(auth.checkRejection(card, onSuccess, onFail)){  // acceptence logic, this function cares about rejection
                        auth.reject(card, dbModel.rejections, close);  // Rejections: we have to wait till saved to close db
                    } else { close(); }                                // close connection to db regardless
                    cache.updateCard(card);                            // keep local redundant data cache up to date
                } else {                                               // no error, no card, this card is unregistered
                    onFail('unregistered card');                       // we want these to show up somewhere to register new cards
                    auth.reject({uid: cardID}, dbModel.rejections, close); // so lets put them in mongo
                }
            });
        };
    },
    checkRejection: function(card, onSuccess, onFail){                         // When we have an actual record to check
        var rejected = true;                                                   // returns if card was reject if caller cares
        if(card.validity === 'activeMember' || card.validity === 'nonMember'){ // make sure card has been marked with a valid state
            if( new Date().getTime() > new Date(card.expiry).getTime()){       // make sure card is not expired
                onSuccess(card.holder);                                        // THIS IS WHERE WE LET PEOPLE IN! The one and only reason
                rejected = false;                                              // congrats you're not rejected
            } else {onFail(card.holder + ' has expired');}                     // given members time is up we want a polite message
        } else {onFail(card.holder + "'s " + card.validity + ' card was scanned');} // context around rejections is helpful
        return rejected;                                                       // would rather leave calling fuction to decide what to do
    },
    reject: function(card, rejectionModel, close){
        var rejectedCard = new rejectionModel({                      // validates data with mongoose to be updated in mongo
            uid: card.uid,                                           // should always have uid
            holder: card.holder ? card.holder : null,                // we only get this when a recorded card holder is rejected
            validity: card.validity ? card.validity : 'unregistered' // important to know this is an unregistered card if info missing
        });
        rejectedCard.save(function(error){                                            // save is the himalayan word for update
            if(error){console.log(error + ': Could not save reject -> ' + card.uid);} // knowing who it was might be important
            close(); // error or not close connection to db after saving a rejection
        });
    }
};


var cron = {  // runs a time based update opperation
    ONE_DAY: 86400000,
    init: function(hourToUpdate){
        mongo.connectAndDo(cron.stream, cron.failCase);          // run an initial sync up on start
        var runTime = cron.millisToHourTomorrow(hourToUpdate);   // gets millis till this hour tomorrow
        setTimeout(cron.update, runTime);                        // schedual checks daily for warnigs at x hour from here after
    },
    update: function(){                                          // recursively called every day
        mongo.connectAndDo(cron.stream, cron.failCase);          // connect to mongo and start an update stream
        setTimeout(cron.update, cron.ONE_DAY);                   // make upcomming expiration check every interval
    },
    stream: function(dbModel, close){                            // Passed dbModel and close event to call when done
        var cursor = dbModel.cards.find({}).cursor();            // grab cursor to parse through all cards
        cursor.on('data', cache.updateCard);                     // local persitence update function to sync w/ source of truth
        cursor.on('close', close);
    },
    failCase: function(error){slack.channelMsg('master_slacker','Failed to update local datastore: ' + error);},
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
        return new mongo.ose.Schema({                                          // Read only by doorboto -- Write only by Interface
            id: mongo.ose.Schema.ObjectId,
            uid: {type: String, required: '{PATH} is required', unique: true}, // UID of card, collection find key
            holder: {type: String, required: '{PATH} is required'},            // leave messages about dated cards without looking up member
            memberID: {type: String, required: '{PATH} is required'},          // _id of member object, fastest way to look up a member
            cardToken: {type: String},                                         // 8 byte QID unique to member, proposing to use w/ UID
            expiry: {type: Number},                                            // expiration of this member
            validity: {type: String, required: '{PATH} is required'}           // activeMember, nonMember, expired, revoked, lost, stolen
        });
    },
    rejections: function(){
        return new mongo.ose.Schema({                                 // rejected cards, Shows cards to register, Write only by doorboto
            id: mongo.ose.Schema.ObjectId,
            uid: {type: String, required: '{PATH} is required'},
            holder: {type: String},                                   // if in db note member this could change if card are reused
            validity: {type: String, required: '{PATH} is required'}, // validity at time of scan, set to unregistered if not in db
            timeOf: {type: Date, default: Date.now}
        });
    },
    connectAndDo: function(success, fail){
        var connection = mongo.ose.createConnection(mongo.uri);
        var dbModel = {}; // object of models to pass on
        dbModel.cards = connection.model('cards', mongo.cards());
        dbModel.rejections = connection.model('rejections', mongo.rejections());

        connection.on('connected', function(){
            success(dbModel, function close(){
                connection.close();
            });
        });
        connection.on('disconnected', function(){
            // console.log('disconnected from db');
        });
        connection.on('error', function(error){       // prevents doorboto2 from completly eating shit
            // slack.channelMsg('master_slacker', error);
            fail(error);                              // there are no errors only unintended results
        });
        // TODO error event for fail case?
    }
};

var slack = {
    io: require('socket.io-client'),                           // to connect to our slack intergration server
    connected: false,                                          // tell us whether to log or send to slack
    init: function(intergrationServer, authToken){
        slack.socketio = slack.io(intergrationServer);
        slack.socketio.on('connect', function authenticate(){  // connect with masterslacker
            slack.socketio.emit('authenticate', {
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
        slack.socketio.on('disconnect', function disconnected(){slack.connected = false;});
    },
    send: function(msg){
        if(slack.connected){ slack.io.emit('msg', msg);
        } else { console.log('404:'+msg); }
    },
    channelMsg: function(channel, msg){
        console.log('slack connected =' + slack.connected);
        if(slack.connected){ slack.socketio.emit('channelMsg', {userhandle: channel, msg: msg});
        } else { console.log('err:' + msg);}
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
        arduino.serial.on('open', arduino.open);
        arduino.serial.on('data', arduino.read);
        arduino.serial.on('close', arduino.close);
        arduino.serial.on('error', arduino.error);
    },
    open: function(){console.log('connected to something');},    // what to do when serial connection opens up with arduino
    read: function(data){                                        // getting data from Arduino, only expect a card ID
        var id = data.slice(0, data.length-1);                   // exclude newline char from card ID
        auth.orize(id, arduino.grantAccess, arduino.denyAccess); // check if this card has access
    },
    close: function(){arduino.init();},                 // try to re-establish if serial connection is interupted
    error: function(error){                             // given something went wrong try to re-establish connection
        setTimeout(arduino.init, arduino.RETRY_DELAY);  // retry every half a minute NOTE this will keep a heroku server awake
    },
    grantAccess: function(memberName){               // is called on successful authorization
        arduino.serial.write('<a>');                 // a char grants access: wakkas help arduino know this is a distinct command
        slack.send(memberName + ' just checked in'); // let members know through slack // TODO need a send to authrized services method
    },                                               // TODO like Kevin's cameras
    denyAccess: function(msg){                       // is called on failed authorization
        arduino.serial.write('<d>');                 // d char denies access: wakkas help arduino know this is a distinct command
        slack.send('denied access: ' + msg);         // let members know through slack
    }
};

// High level start up sequence
cache.persist.init();                                               // set up local cache
arduino.init(process.env.ARDUINO_PORT);                             // serial connect to arduino
cron.init(3);                                                       // run a time based stream that updates local cache
slack.init(process.env.MASTER_SLACKER, process.env.CONNECT_TOKEN);  // set up connection to our slack intergration server
