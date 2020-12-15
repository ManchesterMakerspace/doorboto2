module.exports = {
  apps: [
    {
      name: 'doorboto',
      script: 'build/doorboto.js',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        MONGODB_URI: process.env.MONGODB_URI,
        DB_NAME: process.env.DB_NAME,
        DOORBOTO_WEBHOOK: process.env.DOORBOTO_WEBHOOK,
        MR_WEBHOOK: process.env.MR_WEBHOOK,
        ARDUINO_PORT: process.env.ARDUINO_PORT,
      },
      env_testing: {
        MONGODB_URI: '',
        DB_NAME: '',
        DOORBOTO_WEBHOOK: '',
        MR_WEBHOOK: '',
        ARDUINO_PORT: '',
      },
    },
  ],
};
