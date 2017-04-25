// doorboto2.js ~ Copyright 2017 Manchester Makerspace ~ License MIT

function genericErrorHandler(error, onNoError){
    if(error){console.error('Im so sorry I had this error:' + error);}
    else     {onNoError();}
}

var auth = {
    storage: require('node-persist'),
    init: function(){                     // kinda a redundant shortcut but maybe there could be more we want to start up
        return auth.storage.init();       // returns a promise that datastore is ready
    },
    updateCreateMember: function(member){ // setItem works like and upsert, this also creates members
        var consolidatedMemberInfo = {
            'fullname':       member.fullname,
            'expirationTime': member.expirationTime
        };
        return auth.storage.setItem(member.cardID, consolidatedMemberInfo);
    },
    removeMember: function(member){
        return auth.storage.removeItem(member.cardID);
    },
    orize: function(cardID, onSuccess, onFail){
        var inQuestion = { // default member in question
            fullname: 'unregistered card',
            cardID: cardID,
            expirationTime: 0
        };
        auth.storage.forEach(function(key, member){
            if(key === cardID){
                inQuestion = member;         // hold on to info we have about this member in case we need to check source of truth and fail
                inQuestion.cardID = cardID;  // add cardID property to check against database
                if( new Date().getTime() > new Date(member.expirationTime).getTime()){
                    inQuestion = false;      // member is good to go no check needed
                    // TODO the issue with this is that if you have a member thats been revoked they are still going to be let in until the proposed cron runs
                    onSuccess(member.fullname);
                }
            }
        });
        mongo.connectAndDo(auth.sourceOfTruthCheck(inQuestion, onSuccess, onFail), auth.canNotInfo(inQuestion, onFail));
    },
    sourceOfTruthCheck: function(onHandMember, onSuccess, onFail){
        return function onConnectToMongo(){
            mongo.member.findOne({'cardID': onHandMember.cardID}, function onFindMember(error, sourceMember){
                genericErrorHandler(error, function givenNoError(){ // there are only unexpected results
                    if(sourceMember){
                        if(onHandMember.expirationTime){
                            // member has already been let in if we have their expiration date at this point
                        } else {
                            // TODO case for lost and rejected cardIDs
                            if( new Date().getTime() > new Date(sourceMember.expirationTime).getTime()){ // TODO migration for group members
                                onSuccess(sourceMember.fullname);
                            } else { // given member is expired
                                onFail(sourceMember.fullname + ' has expired');
                            }
                        }
                        updateCreateMember(sourceMember);           // update local data store
                    } else {
                        // TODO save rejected card to rejected card collection
                        onFail('unregistered card');
                    }
                });
            });
        };
    },
    canNotInfo: function(member, onFail){
        return function canNotConnectToMongo(){
            if(member){
                onFail('Could not check db for member: ' + member.fullname);
            } // else member has already been let in anyhow
        };
    },
};


var update = {
    ONE_DAY: 86400000,
    init: function(hourToUpdate){
        var runTime = getMillis.toTimeTomorrow(hourToUpdate); // gets millis till this hour tomorrow
        setTimeout(update.cron, runTime);                     // schedual checks daily for warnigs at x hour from here after
    },
    cron: function(){                                         // recursively called every day
        mongo.connectAndDo(update.stream, update.failCase);   // connect to mongo and start an update stream
        setTimeout(update.cron, update.ONE_DAY);              // make upcomming expiration check every interval
    },
    stream: function(){                                       // creates stream of id cards on record to update from
        var cursor = mongo.card.find({'validity': 'active'}).cursor();
        cursor.on('data', update.card);
        // cursor.on('close', update.onClose);
    },
    card: function(card){ // process card documents for mongo stream
        
    },
    failCase: function(){
        console.log('Failed to update local datastore');
    },
    millisToHourTomorrow: function(hour){
        var currentTime = new Date().getTime();         // current millis from epoch
        var tomorrowAtX = new Date();                   // create date object for tomorrow
        tomorrowAtX.setDate(tomorrowAtX.getDate() + 1); // point date to tomorrow
        tomorrowAtX.setHours(hour, 0, 0, 0);            // set hour to send tomorrow
        return tomorrowAtX.getTime() - currentTime;     // subtract tomo millis from epoch from current millis from epoch
    },
};

var mongo = { // depends on: mongoose
    uri: process.env.MONGO_URI,
    ose: require('mongoose'),
    options: null,                                                              // this is where one would normally put auth info and so on
    Schema: mongo.oseSchema,
    member: mongo.ose.model('member', new mongo.Schema({                        // Member collection schema: Read only by doorboto -- Write only by interface
        id: mongo.Schema.ObjectId,                                              // unique id of document
        fullname: {type: String, required: '{PATH} is required', unique: true}, // full name of user
        cardID: {type: String, required: '{PATH} is required', unique: true},   // user card id                                        TODO deprecate
        status: {type: String, Required: '{PATH} is required'},                 // type of account, admin, mod, ect                    TODO deprecate
        accesspoints: [String],                                                 // points of access member (door, machine, ect)        TODO depracate
        expirationTime: {type: Number},                                         // pre-calculated time of expiration                   TODO depracate
        groupName: {type: String},                                              // potentially member is in a group/partner membership TODO depracate
        groupKeystone: {type: Boolean},                                         // notes who holds expiration date for group           TODO depracate
        groupSize: {type: Number},                                              // notes how many members in group given in one        TODO depracate
        password: {type: String},                                               // for admin cards only
        email: {type: String},                                                  // store email of member for prosterity sake
        slackHandle: {type: String},                                            // store slack username
        notificationAck: {type: Boolean},                                       // recognizes a notification was sent out
        expiredAck: {type: Boolean},                                            // recognizes doorboto was updated with expiration
        cardToken: {type: String, unique: true},                                // TODO add 8 byte QID to write to key cards
        // pick a random 4 byte number and convert to hex, try to write, try again if not unique
    })),
    cards: mongo.ose.model('card', new mongo.Schema({                           // Read only by doorboto -- Write only by Interface
        id: mongo.Schema.ObjectId,
        cardID: {type: String, required: '{PATH} is required', unique: true},   // UID of card, collection find key
        memberName: {type: String, required: '{PATH} is required'},             // for quickly leaving messages about dated cards without looking up member Maybe not needed
        memberID: {type: String, required: '{PATH} is required'},               // _id of member object fastest way to acurately look up a member
        cardToken: {type: String},                                              // 8 byte QID unique to member, proposing to use in conjunction with UID
        expirationTime: {type: Number},                                         // expiration of this member
        validity: {type: String, required: '{PATH} is required'}                // active, expired, revoked, lost, stolen
    })),
    rejections: mongo.ose.model('rejections', new mongo.Schema({                // list of rejected cards, interface can grab last to register new members instead of using socket.io Write only by doorboto
        id: mongo.Schema.ObjectId,
        cardID: {type: String, required: '{PATH} is required'},
        timeOf: {type: Date, default: Date.now},
    })),
    connectAndDo: function(success, fail){
        mongo.ose.connect(mongo.uri, mongo.options, function onConnect(error){
            if(error){
                console.error('Mongo issue:' + error);
                fail(error);
            } else {
                success();
                mongo.ose.connection.close(); // close connection when we are done
            }
        });
    }
    /* init: function(){ // just
        var Schema = mongo.ose.Schema; var ObjectId = Schema.ObjectId;
        mongo.member = mongo.ose.model('member', new Schema({                         // create user object property
            id: ObjectId,                                                             // unique id of document
            fullname: { type: String, required: '{PATH} is required', unique: true }, // full name of user
            cardID: { type: String, required: '{PATH} is required', unique: true },   // user card id
            status: {type: String, Required: '{PATH} is required'},                   // type of account, admin, mod, ect
            accesspoints: [String],                                                   // points of access member (door, machine, ect)
            expirationTime: {type: Number},                                           // pre-calculated time of expiration
            groupName: {type: String},                                                // potentially member is in a group/partner membership
            groupKeystone: {type: Boolean},                                           // notes who holds expiration date for group
            groupSize: {type: Number},                                                // notes how many members in group given in one
            password: {type: String},                                                 // for admin cards only
            email: {type: String},                                                    // store email of member for prosterity sake
            slackHandle: {type: String},                                              // store slack username
            notificationAck: {type: Boolean},                                         // recognizes a notification was sent out
            expiredAck: {type: Boolean}                                               // recognizes doorboto was updated with expiration
        }));
    }, */
};

var slack = {
    io: require('socket.io-client'),                         // to connect to our slack intergration server
    firstConnect: false,
    connected: false,
    init: function(intergrationServer, authToken){
        try {
            slack.io = slack.io(intergrationServer); // slack https server
            slack.firstConnect = true;
        } catch (error){
            console.log('could not connect to ' + intergrationServer + ' cause:' + error);
            setTimeout(slack.init, 60000); // try again in a minute maybe we are disconnected from the network
        }
        if(slack.firstConnect){
            slack.io.on('connect', function authenticate(){  // connect with masterslacker
                slack.io.emit('authenticate', {
                    token: authToken,
                    slack: {
                        username: 'Doorboto2',
                        // channel: 'whos_at_the_space',
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


// High level start up sequence
arduino.init(process.env.ARDUINO_PORT);                             // serial connect to arduino
// mongo.init(); might be need if you can build properties in right order
slack.init(process.env.MASTER_SLACKER, process.env.CONNECT_TOKEN);  // set up connection to our slack intergration server
auth.init(); // <-- returns that things are connected TODO does that matter ?
