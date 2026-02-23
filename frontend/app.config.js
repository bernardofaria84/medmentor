module.exports = function ({ config }) {
  return {
    ...config,
    extra: {
      EXPO_PUBLIC_BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL,
    },
  };
};
