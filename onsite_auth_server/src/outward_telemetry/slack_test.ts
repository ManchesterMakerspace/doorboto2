// slack_test Copyright 2020 Manchester Makerspace MIT Licence

import { slackSend, adminAttention } from './slack';

const itCanSendAdminMsg = async () => {
  await adminAttention(
    'Yo this might be a more important message',
    'test admin'
  );
};

const itCanSendMsg = async () => {
  await slackSend('Yo this is a test message');
};

export { itCanSendAdminMsg, itCanSendMsg };
