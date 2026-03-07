# Academic Notes App - Backend

Backend API for the Academic Notes Sharing App.

## Tech Stack
- Node.js
- Express
- MongoDB + Mongoose
- JWT authentication
- bcryptjs password hashing
- Google OAuth token verification (`google-auth-library`)
- Multer file uploads

## Features
- Student register/login
- Admin login
- Google sign-in
- JWT protected routes
- Role-based authorization (`student`, `admin`)
- Notes upload/download/manage
- Notes visibility controls (owner/admin hide rules)
- Notes rating (1 to 5)
- Admin moderation for users and notes

## Project Structure
```txt
backend/
  config/
    db.js
    seedAdmin.js
  middleware/
    authMiddleware.js
    roleMiddleware.js
    errorMiddleware.js
  models/
    User.js
    Note.js
  routes/
    authRoutes.js
    noteRoutes.js
    adminRoutes.js
  uploads/
  server.js
```

## Setup
1. Install dependencies:
```bash
npm install
```

2. Create `.env` from `.env.example` and fill values.

3. Start backend:
```bash
npm run dev
```
or
```bash
npm start
```

Server runs at: `http://localhost:5000` by default.

## Environment Variables
- `PORT` (default: `5000`)
- `MONGO_URI` (required)
- `JWT_SECRET` (required)
- `CLIENT_ORIGIN` (default: `*`)
- `DNS_SERVERS` (default: `8.8.8.8,1.1.1.1`)
- `ADMIN_EMAIL` (optional)
- `ADMIN_USERNAME` (optional, default `admin`)
- `ADMIN_PASSWORD` (optional, used for admin seeding)
- `ADMIN_NAME` (optional, default `Admin`)
- `GOOGLE_CLIENT_ID` (optional)
- `GOOGLE_CLIENT_IDS` (optional, comma-separated)

## API Base
`/api`

## Main Endpoints

### Auth (`/api/auth`)
- `POST /register` - Student registration
- `POST /login` - Student local login (username/email + password)
- `POST /admin/login` - Admin login
- `POST /google` - Google login
- `GET /me` - Get current authenticated user

### Notes (`/api/notes`) - Auth required
- `POST /` - Upload note file + metadata
- `GET /feed` - Get visible notes feed
- `GET /mine` - Get current user's notes
- `GET /:id/download` - Download note file
- `PUT /:id` - Update own note metadata
- `PATCH /:id/visibility` - Hide/unhide own note
- `POST /:id/rate` - Rate note (1..5)
- `DELETE /:id` - Delete own note

### Admin (`/api/admin`) - Admin only
- `GET /users` - List users
- `DELETE /users/:id` - Delete user (cannot delete self)
- `PATCH /users/:id/block` - Block/unblock user
- `GET /notes` - List all notes
- `PATCH /notes/:id/visibility` - Hide/unhide any note
- `DELETE /notes/:id` - Delete any note

### Utility
- `GET /api/health` - Health check

## Database Schema (MongoDB / Mongoose)

### `User` collection
| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | String | Yes | trimmed |
| `email` | String | Conditional | required for Google accounts, unique+sparse, lowercase |
| `username` | String | No | unique+sparse, lowercase |
| `password` | String | Conditional | required for local auth, `select: false`, min 6 |
| `authProvider` | String | Yes | enum: `local`, `google` |
| `googleId` | String | No | unique+sparse |
| `role` | String | Yes | enum: `student`, `admin` |
| `isBlocked` | Boolean | Yes | default `false` |
| `createdAt` | Date | Auto | from timestamps |
| `updatedAt` | Date | Auto | from timestamps |

Behavior:
- Password is hashed with bcrypt before save.
- `comparePassword()` instance method is used for login checks.

### `Note` collection
| Field | Type | Required | Notes |
|---|---|---|---|
| `userId` | ObjectId (`User`) | Yes | indexed |
| `title` | String | Yes | trimmed |
| `description` | String | No | default `''` |
| `subject` | String | No | default `''` |
| `semester` | String | No | default `''` |
| `fileName` | String | Yes | original filename |
| `filePath` | String | Yes | server disk path |
| `fileUrl` | String | Yes | relative public path (`/uploads/...`) |
| `fileType` | String | Yes | MIME type |
| `fileSize` | Number | Yes | bytes |
| `isHidden` | Boolean | Yes | default `false`, indexed |
| `hiddenBy` | String/null | No | enum: `owner`, `admin`, `null` |
| `ratings` | Array | No | array of user ratings |
| `ratings[].userId` | ObjectId (`User`) | Yes | rater |
| `ratings[].value` | Number | Yes | min `1`, max `5` |
| `createdAt` | Date | Auto | from timestamps |
| `updatedAt` | Date | Auto | from timestamps |

## Upload Rules
- Accepted files: `PDF`, `JPG`, `JPEG`
- Max size: `10 MB`
- Stored in `backend/uploads/`

## Notes
- This backend stores files locally on disk (`uploads/`).
- In production, you may move file storage to S3/Cloud storage.
