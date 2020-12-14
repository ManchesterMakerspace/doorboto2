// slack_test.js Copyright 2020 Manchester Makerspace MIT Licence

const { slackSend, adminAttention } = require('./slack.js');

const itCanSendAdminMsg = async () => {
  await adminAttention(
    'Yo this might be a more important message',
    'test admin'
  );
};

const itCanSendMsg = async () => {
  await slackSend('Yo this is a test message');
};

module.exports = {
  itCanSendAdminMsg,
  itCanSendMsg,
};
