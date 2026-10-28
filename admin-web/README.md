# Feedants Studio

Organizer dashboard built with React, TypeScript, and Vite. Repository setup, API environment variables, deployment, and registration behavior are documented in the [root README](../README.md).

## Run locally

```powershell
npm ci
npm run dev
```

Set `VITE_API_URL` in `admin-web/.env` when the backend is not at `http://localhost:5000`. Vite variables are public client configuration—do not put secrets in them.

The preview supports admin sign-in, API-backed overview data, and creating competitions. Demo registrations created by the participant app appear as `Demo · unpaid`; uploaded performances appear in Submissions and are stored in the configured Cloudinary account. Editing/deleting competitions, result publishing, and real payment processing are not implemented as live dashboard actions.
