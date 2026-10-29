# Feedants

Feedants is a competition platform for performers, organizers, and judges. It contains an Expo participant app, an Express/MongoDB API, and a React admin workspace.

Participants can register directly for open competitions, then upload a performance during the submission window. Registration reserves a spot but does not collect payment; video submissions are uploaded to the configured Cloudinary account.

## Project layout

- `backend/` — Express API, authentication, MongoDB models, catalog seed.
- `mobile/` — Expo Router app for iOS, Android, and web.
- `admin-web/` — Vite/React organizer dashboard.

## Run locally

Requirements: Node.js 20+ and npm, plus MongoDB (Atlas or local).

1. Copy `backend/.env.example` to `backend/.env`, set `MONGODB_URI`, and replace `JWT_SECRET` with a long random value. Keep secrets out of Git.
2. Start the API:

   ```powershell
   cd backend
   npm ci
   npm run seed
   npm run dev
   ```

   `npm run seed` adds the sample judges and competitions only when they are missing. It does not delete or overwrite existing records.

3. In a separate terminal, start the participant app:

   ```powershell
   cd mobile
   Copy-Item .env.example .env
   npm ci
   npx expo start
   ```

   Set `EXPO_PUBLIC_API_URL` in `mobile/.env` to the API's reachable address. For an Android emulator, use `http://10.0.2.2:5000`; for a physical phone, use your computer's LAN address, for example `http://192.168.1.25:5000`. `localhost` on a phone refers to the phone itself. Set the same Cloudinary cloud name in `backend/.env` and `mobile/.env`; restrict the unsigned preset to video uploads with a size limit in Cloudinary.

4. In another terminal, start the organizer dashboard:

   ```powershell
   cd admin-web
   npm ci
   npm run dev
   ```

   Copy `admin-web/.env.example` to `admin-web/.env` and configure `VITE_API_URL` when the backend is not at `http://localhost:5000`.

The API health check is `GET /health`. The admin login requires an existing account with the `admin` role; public signup creates participant accounts only.

## Registration and payment behavior

| Area | Available in preview |
| --- | --- |
| Browse and search competitions | Reads the API catalog |
| Create organizer competitions | Writes a competition through the authenticated admin API |
| Participant account signup and login | Creates/authenticates a participant account |
| Participant registration | Direct registration; unique per user and competition, spot-limited, no payment collected |
| Payment webhook API | Real payment processing is not configured (`501 Not Implemented`) |
| Performance uploads | Uploads videos to the configured unsigned Cloudinary preset and stores the submission record |
| Admin participants, entries, and published results | Reads existing API data |
| Edit/delete competitions and publish results from the dashboard | Not available in this preview |

Seeded competition and judge content is illustrative. The seed script does not create participants, registrations, submissions, or winners. The seed script is non-destructive; review existing database records before displaying them publicly. Registration records use the separate `demo` payment status and are not proof of payment.

## Deployment configuration

Deploy the backend, organizer dashboard, and participant website separately.

### Backend (for example, Render)

- Root directory: `backend`
- Build command: `npm ci`
- Start command: `node server.js`
- Set `MONGODB_URI`, a new random `JWT_SECRET`, `NODE_ENV=production`, and `CORS_ORIGINS`.
- Set `CLOUDINARY_CLOUD_NAME` to the Cloudinary account used by the app so the API only accepts video URLs hosted in that account.
- `CORS_ORIGINS` is a comma-separated list of exact browser origins for the deployed admin and participant website, with no trailing slash (for example `https://feedants.example.com`). In production, browser requests from other origins are not allowed.
- Render provides `PORT`.
- Verify the service using `/health`.

### Admin web (for example, Vercel)

- Root directory: `admin-web`
- Build command: `npm run build`
- Output directory: `dist`
- Set `VITE_API_URL` to the deployed HTTPS API origin.

### Participant website (Render Static Site)

- Root directory: `mobile`
- Build command: `npm ci && npx expo export --platform web`
- Publish directory: `dist`
- Set `EXPO_PUBLIC_API_URL` to the deployed backend's HTTPS origin (for example `https://feedants-api.onrender.com`) in the static site's **build environment**.
- Set `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` and `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET` to an **unsigned preset restricted to video uploads** in the matching Cloudinary account. These are public client configuration values, not secrets.
- Add the static site's exact public origin to the backend's `CORS_ORIGINS`, then redeploy the backend and rebuild the static site after changing environment variables.
- Configure a rewrite from `/*` to `/index.html` if direct visits to nested routes return 404.
- Never put server secrets in Expo public variables; `EXPO_PUBLIC_*` values are shipped in the client bundle.

## Production readiness

This project is deployable as an interactive competition app, but it does not process real payments. The public unsigned upload preset is only appropriate when restricted to the intended video formats and size limits. Competition edit/delete and result-publishing workflows are not available in the dashboard. The web clients also store bearer tokens in browser storage. Before operating with real-money entry fees, add server-verified payment processing, use a secured upload flow and storage policy, implement the missing organizer workflows, move browser authentication to an appropriate secure cookie/session design, set production CORS origins, review database access and backups, and have payment and file-upload flows security-reviewed.
