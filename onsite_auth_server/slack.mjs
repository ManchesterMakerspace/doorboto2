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

export {
  slackSend,
}