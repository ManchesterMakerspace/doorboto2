// slack.mjs Copyright 2020 Manchester Makerspace Licence MIT
const { request } = require('https');
const DEFAULT_WEBHOOK = process.env.DOORBOTO_WEBHOOK || ''

const slackSend = (msg, path = DEFAULT_WEBHOOK) => {
  return new Promise((resolve) => {
    if(!path){
      console.log(msg);
      return;
    }
    const postData = JSON.stringify({ text: msg });
    const options = {
      hostname: 'hooks.slack.com',
      port: 443,
      method: 'POST',
      path,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
      },
    };
    const req = request(options, resolve);
    // just do it, no need for response
    req.write(postData);
    req.end();
  });
};

const adminAttention = async (msg, member = 'doorboto admin') => {
  const atChannel = '<!channel> ';
  const msgBlock = '```' + msg + '```';
  const adminMsg = `${atChannel}${msgBlock} Maybe ${member} needs to be reached out to?`;
  await slackSend(adminMsg, process.env.MR_WEBHOOK);
};

module.exports = { slackSend, adminAttention };
