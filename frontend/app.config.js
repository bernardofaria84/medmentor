const appJson = require('./app.json');

module.exports = ({ config }) => ({
  ...appJson.expo,
  extra: {
    EXPO_PUBLIC_BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL,
  },
});
