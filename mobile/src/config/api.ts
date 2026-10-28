import { Platform } from 'react-native';

// When running in the browser, localhost works.
// On a physical phone (Expo Go), localhost refers to the phone itself,
// so we point to your computer's local Wi-Fi IP address.
export const API_BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:5000' 
  : 'http://192.168.8.180:5000';
