# SignBridge AI

SignBridge AI is a React/Vite frontend with a Node.js/Express API and MongoDB/Mongoose persistence. The existing SignBridge backend remains a separate application. The active frontend is structured under `frontend/src/pages/` and `frontend/src/services/`; the teammate-created sources in `frontend/src/pradnya-integration/` are retained as a design reference.

## Requirements

- Node.js 20.19+ (Vite 8 requirement)
- npm
- MongoDB connection string (local or hosted)

## Configure and run

1. Copy `backend/.env.example` to `backend/.env` and set `JWT_SECRET` to a long, unique secret and `MONGODB_URI` to your MongoDB connection string. `GEMINI_API_KEY` is optional and is only needed for existing AI conversation replies. Never commit `.env` files.
2. Copy `frontend/.env.example` to `frontend/.env`. The development default sends `/api` requests through Vite's proxy to `API_PROXY_TARGET`; for production, set `VITE_API_BASE_URL` to the deployed API base URL.
3. In `backend/`, run `npm ci` and then `npm run dev` (API at `http://localhost:5000`).
4. In `frontend/`, run `npm ci` and then `npm run dev` (Vite at `http://localhost:5173`).

Set `FRONTEND_URL` in the backend to the exact frontend origin. Multiple allowed origins can be comma-separated. The API accepts bearer tokens and does not enable credentialed cross-origin cookies.

For production builds, run `npm run build` in `frontend/`; run the backend with `npm start` in `backend/`. Both applications must be deployed and configured separately.

Lesson records can be seeded without deleting existing data with `npm run seed` from `backend/`. The included sample is unpublished and explicitly unverified; it is not shown to learners.

Run the backend API integration test with `npm test` from `backend/`. Run `npm run lint` and `npm run build` from `frontend/`.

## API contracts

All API paths are under `/api`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | No | API health |
| POST | `/auth/register` | No | Create an account with `name`, `email`, and `password` |
| POST | `/auth/login` | No | Return a bearer token and user |
| GET/PATCH | `/profile` | Bearer token | Read/update the signed-in user's name, preferences, and consent |
| GET | `/lessons` | No | List published lesson metadata |
| GET | `/lessons/:id` | No | Read one published lesson and its sign records |
| GET | `/quizzes?lessonId=:id` | Bearer token | List published quizzes without answer keys |
| GET | `/quizzes/:id` | Bearer token | Load quiz questions/options without correct answers |
| POST | `/quizzes/:id/attempts` | Bearer token | Submit one selected option for every question; grade and store the attempt |
| GET | `/progress` | Bearer token | Read progress for the identity in the token |
| PATCH | `/progress/complete-lesson` | Bearer token | Complete one published lesson with `{ "lessonId": "..." }`; duplicate completions do not increase progress |

Profile responses use `profile`; progress responses use `progress`; lesson and quiz lists use `data`. Logging out clears the browser-held bearer token. Tokens are stateless and remain valid until expiry; there is not currently a server-side token revocation endpoint.

## Content and feature status

- Lesson content is stored in the `Lesson` model and only published records are shown. A `verified` flag in stored content is shown as a moderation marker, not as an independent claim that the sign instruction is correct. The included seed content is unpublished and must be replaced with educator-reviewed ISL material before publishing.
- Quizzes use the `Quiz` and `QuizAttempt` models. Correct answers are omitted from quiz-loading responses and included only in grading results after submission.
- Lesson completion is stored once per user/lesson in `LessonCompletion`; progress totals are calculated from published lessons and those records.
- Webcam recognition/translation, community matching, and blockchain credentials are not implemented. Their UI pages are clearly marked unavailable and describe implementation constraints rather than claiming capability.

### Future integration constraints

- **Phase 3 — recognition and communication:** Begin with an explicitly supported, limited vocabulary and communicate measured limitations. Do not claim unrestricted ISL translation. Ask for explicit consent before camera access or any third-party processing; do not send frames or conversations externally by default.
- **Phase 4 — verifiable credentials:** Keep personal information and conversations off-chain. Store only the minimum credential proof or hash needed for verification.
