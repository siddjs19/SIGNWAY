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

Lesson records and starter question banks can be seeded without deleting existing data by running `npm run seed` from `backend/`. The script uses idempotent insert-only upserts. It adds four four-option course-resource questions for each of the three ISLRTC lessons (12 total) as published lesson quizzes when their lesson is published. These test verified source/course metadata, not ISL proficiency; the quiz content remains pending qualified review. ISLRTC lesson drafts remain unpublished on a fresh database. Correct answers remain server-side until submission. The course-resource check is offered separately and does not make an ISL proficiency assessment available.

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

Progress also provides authenticated `POST /progress/access-lesson` to record a start or resume of a published lesson. Profile responses use `profile`; progress responses use `progress`; lesson and quiz lists use `data`. Logging out clears the browser-held bearer token. Tokens are stateless and remain valid until expiry; there is not currently a server-side token revocation endpoint.

## Content and feature status

- Lesson content is stored in the `Lesson` model and only published records are shown. A `verified` flag in stored content is shown as a moderation marker, not as an independent claim that the sign instruction is correct. The included seed content is unpublished and must be replaced with educator-reviewed ISL material before publishing.
- The first three beginner lessons reference ISLRTC’s [Basic Communication Skills in Indian Sign Language playlist](https://www.youtube.com/playlist?list=PLFjydPMg4DapfRTBMokl09Ht-fhMOAYf6). Public playlist-feed metadata and YouTube oEmbed title/availability/embeddability were checked on 2026-10-29. Linked video titles are **Guideline** (`5PF6JXzYyUI`), **Module 1.2 Greeting and salutations in Indian Sign Language** (`5vHmvYA8Z6Q`), **Module 1.3 Some polite useful phrases.** (`neE5Fg4FVtA`), and **Module 2.2 Introducing oneself (name, work, place, etc.)** (`mc_NxVJlhi8`). The player uses YouTube’s confirmed embed URL and always links to the original video and playlist with ISLRTC attribution. This metadata check does not verify video contents, individual sign demonstrations, or SignBridge-written explanations and quiz questions. The seed script inserts lesson drafts and legacy source-check quizzes unpublished; the new course-resource quizzes are published with review status pending. Publishing a local development lesson for UI testing does not establish qualified ISL review.
- Quizzes use the `Quiz` and `QuizAttempt` models. Correct answers are omitted from quiz-loading responses and included only in grading results after submission.
- Lesson completion is stored once per user/lesson in `LessonCompletion`; progress totals are calculated from published lessons and those records.
- Lesson starts/resumes, last access, and recent activity are stored in the user's existing `Progress` document. Quiz attempts remain separate and do not complete lessons. The seed adds metadata-supported takeaways and checklists only when those fields are missing; it does not overwrite existing lesson content, review status, or review notes.
- Webcam recognition/translation, community matching, and blockchain credentials are not implemented. Their UI pages are clearly marked unavailable and describe implementation constraints rather than claiming capability.

### Future integration constraints

- **Phase 3 — recognition and communication:** Begin with an explicitly supported, limited vocabulary and communicate measured limitations. Do not claim unrestricted ISL translation. Ask for explicit consent before camera access or any third-party processing; do not send frames or conversations externally by default.
- **Phase 4 — verifiable credentials:** Keep personal information and conversations off-chain. Store only the minimum credential proof or hash needed for verification.

### Quiz assessments

The assessment center is available at `/quiz`; lesson quizzes use `/quiz/lesson/:lessonId`. Full-course overview, question loading, and attempt submission use authenticated `/quizzes/full-course`, `/quizzes/full-course/questions`, and `/quizzes/full-course/attempts` endpoints. A full-course ISL-learning assessment requires published quizzes attached to published lessons, explicitly classified as ISL-learning content, with `contentReviewStatus: "reviewed"`. Questions are interleaved across lessons, duplicate prompts are removed, and the test requires at least five eligible questions across two lessons. When that reviewed bank is unavailable but sufficient published course-metadata questions exist, the same route offers a clearly labeled **Full-course resource check** instead; metadata questions are never presented as ISL proficiency, and the resource check does not claim pass/fail. Results are graded and stored with assessment type and lesson-level breakdowns. Pass/fail for the reviewed learning assessment is reported only when selected quizzes share the same configured passing score. No time limit or attempt restriction is configured.
