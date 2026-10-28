# Feedants mobile app

Expo Router app for iOS, Android, and web. For repository setup, API configuration, and registration behavior, see the [root README](../README.md).

## Run locally

```powershell
Copy-Item .env.example .env
npm ci
npx expo start
```

Set `EXPO_PUBLIC_API_URL` in `mobile/.env` to the API origin. The local default is `http://localhost:5000`; use `http://10.0.2.2:5000` in the Android emulator or your computer's LAN IP (for example `http://192.168.1.25:5000`) on a physical phone. Public Expo variables are included in the client bundle and must never contain secrets.

Participants register directly for open competitions; the app does not collect entry fees or contact a payment provider. Registration reserves a spot and unlocks video submission when the submission window opens. To enable video uploads, set `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` and `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET` to your restricted unsigned video-upload preset. The API must have the matching `CLOUDINARY_CLOUD_NAME`. Uploaded files use the configured Cloudinary account.
