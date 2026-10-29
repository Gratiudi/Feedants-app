const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const isProduction = process.env.NODE_ENV === 'production';

if (!configuredApiUrl && isProduction) {
  throw new Error('EXPO_PUBLIC_API_URL must be set to the deployed API URL before building the web app.');
}

export const API_BASE_URL = (configuredApiUrl || 'http://localhost:5000').replace(/\/+$/, '');
