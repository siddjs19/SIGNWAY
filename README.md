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

Run the backend API integration test with `npm test` from `backend/`. Run `npm run lint` and `npm run build` from `frontend/`. The isolated continuous-recognition loop tests use Node's built-in runner: `node --test test/islBridgeRecognitionLoop.test.js` from `frontend/`.

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

### Human Practice and demo practitioner sessions

The authenticated `/practitioners` page uses placeholder profiles from `backend/src/demo/practitioners.js`. Profile names, experience, languages, biographies, locations, and availability are illustrative, not verified or real. `GET /api/practitioners` returns this directory. `POST /api/practitioners/sessions` accepts a demo practitioner ID, future ISO `scheduledAt`, and optional message; the stored `PracticeSession` is always `pending` and associated with the authenticated learner, never a client-supplied user ID. `GET /api/practitioners/sessions` returns only the signed-in learner's requests. The demo does not contact practitioners or provide a booking, accept/decline action, or real practitioner response. Session status values reserve `accepted`, `declined`, and `completed` for a future authorized workflow; no status mutation endpoint exists now.

## Content and feature status

### MST Coral Testnet credentials

The isolated `blockchain/` workspace contains the Solidity registry, Hardhat configuration, local contract tests, deploy script, and ABI exporter. The backend verifies the configured RPC chain ID on every registry operation, derives a canonical credential from SignBridge's existing `ISL Learning Path Completed` milestone, hashes that fixed-order JSON with keccak256, and stores the private canonical JSON plus ownership in MongoDB. Only the credential ID, proof hash, issuer address, timestamp, and revocation bit go on-chain. No learner identity, grade, lesson identifiers, or certificate document is on-chain.

Eligibility is the existing progress milestone: every currently published lesson has a `LessonCompletion` for the authenticated learner and the existing progress achievement is present. No quiz score threshold is added. Requests are authenticated; clients cannot supply an issuer, hash, course, or credential ID. Issuance returns pending until the backend can confirm the transaction receipt and matching contract record. Public `/verify/:credentialId` and `GET /api/credentials/verify/:credentialId` reveal only public proof data. Revocation is restricted to authenticated accounts listed in the backend-only `MST_CREDENTIAL_REVOKER_EMAILS` allowlist and still requires the contract issuer role; learner accounts cannot revoke credentials.

Coral network settings are `MST_RPC_URL` (defaults to `https://coralrpc.mstblockchain.com/`), `MST_CHAIN_ID` (must be `54635`), `MST_EXPLORER_URL` (defaults to `https://coral.mstscan.com/`), `MST_CREDENTIAL_CONTRACT_ADDRESS`, `MST_ISSUER_PRIVATE_KEY`, optional `MST_RPC_TIMEOUT_MS`, and optional comma-separated `MST_CREDENTIAL_REVOKER_EMAILS`. The RPC was queried with `eth_chainId` and returned `0xd56b` (54635); the explorer returned HTTP 200 and identifies itself as the MST Coral Testnet Blockscout explorer. No official Coral faucet/test-token process was found in the MST public pages during this implementation. Do not deploy until the official funding process and a funded test issuer wallet are obtained; the deployment script refuses the wrong chain and a zero-balance signer. The backend and deploy script reject other chain IDs rather than falling back to the older MST Testnet.

When official test funding is available:

1. In `blockchain/`, run `npm ci`, copy `.env.example` to `.env`, set the verified Coral RPC and chain ID, and place the funded test issuer key in `MST_ISSUER_PRIVATE_KEY`. Keep this file local and private.
2. Run `npm test` and `npm run compile`.
3. Run `npm run deploy:coral`. Record the printed contract address and transaction hash; this submits a Coral testnet transaction.
4. Run `npm run export-abi` to generate `backend/src/blockchain/abi/CredentialRegistry.json`.
5. In `backend/.env`, set `MST_RPC_URL`, `MST_CHAIN_ID=54635`, `MST_EXPLORER_URL`, `MST_CREDENTIAL_CONTRACT_ADDRESS` to the deployed address, and `MST_ISSUER_PRIVATE_KEY` to the backend-only issuer key. Never place the issuer key in frontend variables.
6. Start the backend and complete all currently published lessons for a learner. On `/credentials`, request the eligible credential; refresh/verify until a confirmed transaction is matched against the registry. Use the share link to verify without authentication.

Run the backend tests with `npm test` in `backend/`, frontend lint/build with `npm run lint` and `npm run build` in `frontend/`, and contract tests with `npm test` in `blockchain/`. Deployment and first issuance remain blocked on confirmed official test-token instructions, funded wallet availability, and a deployed contract address.

- The dashboard Recognition Studio processes camera frames locally, selects the hand with the largest landmark bounding box, and collects a rolling sequence of 30 wrist-relative MediaPipe frames. After explicit consent and user action, only those normalized coordinates are sent through the authenticated backend to Jestally; raw camera frames are not uploaded. The MediaPipe WASM runtime is downloaded from jsDelivr and its model from Google-hosted storage.
- `POST /api/recognition/landmarks` accepts a JSON `sequence` array of exactly 30 frames, each frame containing 63 finite x/y/z features. The backend forwards `{ "sequence": [...] }` to Jestally using `x-api-key` and returns `{ "success": true, "prediction": { "sign": "...", "confidence": 0.9, "top3": [{ "sign": "...", "confidence": 0.8 }] } }`. A successful provider response without a sign is returned as `{ "success": true, "prediction": null, "abstained": true, "message": "..." }`. Request and response formats were verified against Jestally's [web app source](https://github.com/Shada0/jestally/blob/main/web/index.html) and [camera extension](https://github.com/Shada0/jestally/blob/main/extension/cam-ext.html). Provider response values are validated before returning; API credentials remain backend-only.
- Configure `JESTALLY_API_URL` and `JESTALLY_API_KEY` in the backend environment. `JESTALLY_API_TIMEOUT_MS` optionally sets the request timeout (default 10000 ms, maximum 60000 ms). Missing or invalid settings return an explicit service error. The recognition output is experimental; provider confidence does not guarantee correctness, and it must not be used as evidence of lesson completion or ISL proficiency.
- Recognition Studio also offers a separate experimental ISL Bridge option. Start the existing camera, grant consent, and select **Start recognition**; the browser immediately samples a JPEG frame and then samples at a 700 ms interval. Captures are resized to a maximum width of 480 pixels and encoded at JPEG quality 0.65. One request is allowed at a time; scheduled frames are skipped while a request is pending, and stopping cancels future captures and suppresses late results without stopping the camera. Each frame is posted to the authenticated `POST /api/recognition/isl-bridge/frame` backend endpoint, which accepts `{ "image": "data:image/jpeg;base64,...", "language": "en" }`, validates JPEG MIME/base64/signature and a 2 MiB image limit, then proxies the request to `https://shridalisingh-isl-bridge.hf.space/predict`. Responses contain `sign`, `word`, and `sentence`; empty provider fields remain empty, and displayed sentences are provider output without reconstruction. The hosted demo receives camera images after consent. It is an unaffiliated public demo with no SignBridge-controlled retention or availability, and its Flask source maintains shared in-memory recognition state, so results may be delayed or affected by concurrent visitors. The model is described by its author as isolated fingerspelling for 34 signs, not continuous ISL translation. `ISL_BRIDGE_API_TIMEOUT_MS` optionally sets each frame request timeout (default 15000 ms, maximum 60000 ms). This mode does not replace or change the landmark/Jestally mode. Continuous operation has not been validated against the hosted provider.
- Published lessons are returned in module and lesson order. Existing category, objective, and resource fields are reused alongside optional module labels, prerequisite references, and practice prompts; the learner catalogue groups those published records into an ordered path. Recommendations select the earliest incomplete published lesson whose prerequisites are complete.
- Lesson content is stored in the `Lesson` model and only published records are shown. A `verified` flag in stored content is shown as a moderation marker, not as an independent claim that the sign instruction is correct. The included seed content is unpublished and must be replaced with educator-reviewed ISL material before publishing.
- The first three beginner lessons reference ISLRTC’s [Basic Communication Skills in Indian Sign Language playlist](https://www.youtube.com/playlist?list=PLFjydPMg4DapfRTBMokl09Ht-fhMOAYf6). Public playlist-feed metadata and YouTube oEmbed title/availability/embeddability were checked on 2026-10-29. Linked video titles are **Guideline** (`5PF6JXzYyUI`), **Module 1.2 Greeting and salutations in Indian Sign Language** (`5vHmvYA8Z6Q`), **Module 1.3 Some polite useful phrases.** (`neE5Fg4FVtA`), and **Module 2.2 Introducing oneself (name, work, place, etc.)** (`mc_NxVJlhi8`). The player uses YouTube’s confirmed embed URL and always links to the original video and playlist with ISLRTC attribution. This metadata check does not verify video contents, individual sign demonstrations, or SignBridge-written explanations and quiz questions. The seed script inserts lesson drafts and legacy source-check quizzes unpublished; the new course-resource quizzes are published with review status pending. Publishing a local development lesson for UI testing does not establish qualified ISL review.
- Quizzes use the `Quiz` and `QuizAttempt` models. Correct answers are omitted from quiz-loading responses and included only in grading results after submission.
- Lesson completion is stored once per user/lesson in `LessonCompletion`; progress totals are calculated from published lessons and those records.
- Lesson starts/resumes, last access, and recent activity are stored in the user's existing `Progress` document. Quiz attempts remain separate and do not complete lessons. The seed adds metadata-supported takeaways and checklists only when those fields are missing; it does not overwrite existing lesson content, review status, or review notes.
- Quiz question records support single-choice, multiple-choice, and video-based formats, with optional topic/difficulty and question-level review status. Delivery endpoints omit answer keys and explanations; multi-select answers are validated and graded server-side. Per-question attempt results are persisted. Review suggestions are generated only from incorrect answers on qualified-review ISL-learning content; resource checks never generate language-skill recommendations.
- Webcam recognition remains experimental and limited as described above; Human Practice profiles are demo placeholders. Blockchain credential issuance is implemented for MST Coral Testnet, but no contract has been deployed and issuance remains unavailable until a funded issuer and contract address are configured.

### Future integration constraints

- **Phase 3 — recognition and communication:** Begin with an explicitly supported, limited vocabulary and communicate measured limitations. Do not claim unrestricted ISL translation. Ask for explicit consent before camera access or any third-party processing; do not send frames or conversations externally by default.
- **Phase 4 — verifiable credentials:** Keep personal information and conversations off-chain. Store only the minimum credential proof or hash needed for verification.

### Quiz assessments

The assessment center is available at `/quiz`; lesson quizzes use `/quiz/lesson/:lessonId`. Full-course overview, question loading, and attempt submission use authenticated `/quizzes/full-course`, `/quizzes/full-course/questions`, and `/quizzes/full-course/attempts` endpoints. A full-course ISL-learning assessment requires published quizzes attached to published lessons, explicitly classified as ISL-learning content, with `contentReviewStatus: "reviewed"`. Questions are interleaved across lessons, duplicate prompts are removed, and the test requires at least five eligible questions across two lessons. When that reviewed bank is unavailable but sufficient published course-metadata questions exist, the same route offers a clearly labeled **Full-course resource check** instead; metadata questions are never presented as ISL proficiency, and the resource check does not claim pass/fail. Results are graded and stored with assessment type and lesson-level breakdowns. Pass/fail for the reviewed learning assessment is reported only when selected quizzes share the same configured passing score. No time limit or attempt restriction is configured.
