const { request } = require('https');
const DEFAULT_POST = process.env.STATUS_CAKE_KEY || '';

// non-functional: Putting this in here to remind us to set up a heartbeat

const pingStatusCake = (apiInfo = DEFAULT_POST) => {
  return new Promise((resolve) => {
    if (!apiInfo) {
      return;
    }
    const postData = apiInfo;
    const options = {
      hostname: 'push.statuscake.com',
      port: 443,
      method: 'POST',
      apiInfo,
      headers: {
        'Content-Type': 'application/url',
        'Content-Length': postData.length,
      },
    };
    const req = request(options, resolve);
    // just do it, no need for response
    req.write(postData);
    req.end();
  });
};

module.exports = {
  pingStatusCake,
};
