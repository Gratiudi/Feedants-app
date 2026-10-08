# Feedants — Comprehensive Competition & Talent Showcase Platform

Feedants is a full-stack, cross-platform competition ecosystem designed for performers, artists, and creators. It allows participants to discover competitions, register, submit performance media, and track results, while providing organizers with a centralized administrative dashboard.

---

## 🏛 Architecture & Project Structure

The project is organized as a **monorepo** consisting of three core applications:

```text
feedant-app/
├── backend/          # Node.js / Express REST API with MongoDB Atlas
├── mobile/           # React Native (Expo) cross-platform app (iOS, Android, Web)
├── admin-web/        # React + TypeScript + Vite administrative dashboard
└── README.md
```

### 1. `backend/` (Core API Engine)
- **Runtime**: Node.js & Express.
- **Database**: MongoDB Atlas via Mongoose.
- **Authentication**: JWT (JSON Web Tokens) with `bcryptjs` password hashing and role-based access control (`user` vs `admin`).
- **Dynamic State Computation**: Evaluates registration windows, submission deadlines, and results dynamically per request to prevent database state drift.
- **Concurrency Protection**: Uses atomic conditional updates (`findOneAndUpdate` with `$inc`) to guarantee spots are never overbooked.
- **Payments**: Integrated payment architecture ready for Chapa / online gateways.

### 2. `mobile/` (Participant Application)
- **Framework**: Expo Router (React Native) supporting iOS, Android, and Web.
- **Features**:
  - Live competition browsing with Ethiopian Birr (ETB) & international currency formatting.
  - Rich competition detail screens with jury profiles, judging criteria, and prize tiers.
  - Dynamic action CTA button driven by server state:
    - `Pay & Register`
    - `Submission opens soon`
    - `Upload Submission` (Cloudinary media upload)
    - `Submitted — Registered`
    - `Awaiting Results`
    - `View Results`
  - Integrated User Profile header and one-click Logout / Session refresh.

### 3. `admin-web/` (Organizer & Judge Dashboard)
- **Framework**: React 19, TypeScript, and Vite.
- **Features**:
  - Secure Admin authentication with role validation.
  - Real-time competition creation and spots monitoring.
  - Winner designation and result publishing.

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- Node.js 18+ and npm
- A MongoDB connection string (local or MongoDB Atlas)

---

### Step 1: Backend Setup

```bash
cd backend
npm install
```

Create or verify `backend/.env`:
```env
MONGODB_URI=your_mongodb_connection_string
PORT=5000
ADMIN_SECRET=dev-admin-secret
JWT_SECRET=super-secret-dev-jwt-key-2026
CHAPA_SECRET_KEY=CHASECK_TEST_placeholder
```

#### Seed the Database
Populate Ethiopian & International competitions and judges:
```bash
npm run seed
```

#### Start Backend Server
```bash
npm run dev
```
The API server will run at `http://localhost:5000`.

---

### Step 2: Mobile App Setup (Expo)

```bash
cd ../mobile
npm install
npx expo start
```
- Press **`w`** to open in your web browser.
- Scan the QR code with **Expo Go** on Android/iOS to run on a physical device.

---

### Step 3: Admin Web Dashboard Setup (Vite)

```bash
cd ../admin-web
npm install
npm run dev
```
Open `http://localhost:5173` to access the administrator panel.

---

## 📡 API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user account | No |
| `POST` | `/api/auth/login` | Log in and receive JWT token | No |

### Competitions (`/api/competitions`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/competitions` | List all competitions sorted by date | No |
| `GET` | `/api/competitions/:id` | Get details of a single competition | No |
| `GET` | `/api/competitions/:id/state` | Get current user's state & dynamic button CTA | Optional JWT |
| `POST` | `/api/competitions` | Create a new competition | Admin (`role: admin`) |
| `POST` | `/api/competitions/:id/register` | Atomically reserve a spot & register user | User JWT |
| `POST` | `/api/competitions/:id/submissions`| Submit performance media URL | User JWT |
| `POST` | `/api/competitions/:id/results` | Announce winners & publish results | Admin |

### Health Check
- `GET /health` — Returns `{ "status": "ok" }`.

---

## 🔄 Dynamic Competition & User State Engine

Instead of relying on fragile cron jobs to toggle database status fields, competition states are computed at request time:

$$\text{Registration} = \begin{cases} \text{open} & \text{if } \text{now} \le \text{registerBefore} \text{ and } \text{spotsBooked} < \text{totalSpots} \\ \text{closed} & \text{otherwise} \end{cases}$$

$$\text{Submission} = \begin{cases} \text{not\_started} & \text{if } \text{now} < \text{submissionStart} \\ \text{open} & \text{if } \text{submissionStart} \le \text{now} \le \text{submissionEnd} \\ \text{closed} & \text{if } \text{now} > \text{submissionEnd} \end{cases}$$

This ensures registration status is always 100% accurate, even during high concurrency or timezone variations.

---

## 🛡 Security & Concurrency

1. **Spot Overbooking Protection**:
   ```javascript
   Competition.findOneAndUpdate(
     { _id: competitionId, spotsBooked: { $lt: competition.totalSpots } },
     { $inc: { spotsBooked: 1 } },
     { new: true }
   );
   ```
2. **Password Security**: Passwords are never stored in plaintext and are hashed using `bcryptjs` with salt factor 10. `passwordHash` is excluded from standard queries by default (`select: false`).
3. **Role Enforcement**: Protected routes use the `requireAdmin` middleware to verify the user token's role claim before allowing destructive operations.
