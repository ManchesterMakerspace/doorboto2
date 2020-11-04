// slack.mjs Copyright 2020 Manchester Makerspace Licence MIT
import { request } from 'https';

const slackSend = (msg, path = process.env.DOORBOTO_WEBHOOK) => {
  return new Promise((resolve, reject) => {
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
    req.on('error', error => {
      console.log(`slackSend Request issue: ${error}`);
      reject();
    });
    req.write(postData);
    req.end();
  });
};

const adminAttention = (msg, member = 'doorboto admin') => {
  console.log(msg);
  const atChannel = '<!channel> ';
  const msgBlock = '```' + msg + '```';
  const adminMsg = `${atChannel}${msgBlock} Maybe ${member} needs to be reached out to?`;
  slackSend(adminMsg, process.env.MR_WEBHOOK);
};

export { slackSend, adminAttention };
