const PRODUCTION_API_URL = 'https://backend-lake-ten-68.vercel.app';

function resolveApiUrl(env = process.env) {
  const configuredUrl = env.VOXA_API_URL || env.VITE_API_URL || PRODUCTION_API_URL;
  return configuredUrl.replace(/\/+$/, '');
}

module.exports = {
  PRODUCTION_API_URL,
  resolveApiUrl
};
