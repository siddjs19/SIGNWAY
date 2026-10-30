# SignBridge AI

A full-stack Indian Sign Language learning and communication platform.

## What's included
- React + Vite frontend with a consistent responsive light-theme application shell.
- Node.js + Express + MongoDB backend with JWT authentication.
- Dashboard, Lessons, Curriculum, Practitioner, Credentials, AI Communicator, and Profile pages.
- Real MongoDB-backed lesson progress, practice requests, profile preferences, and conversation history.
- Groq-powered conversational responses with a deterministic, inventory-constrained ISL video planner.
- Camera preview and configurable ISL Bridge recognition adapter.
- Smart-contract source and Hardhat deployment scaffold for the MST Blockchain credential registry.
- Seed data and the supplied ISL animated MP4 library (151 files).

## Theme
- Blue Violet: `#8A2BE2`
- Deep Purple: `#5A1FCF`
- Light Purple: `#C084FC`
- White background.

## Requirements
- Node.js 20+
- MongoDB 6+ (local or Atlas)
- Groq API key for AI chat (optional; the app explains when it is not configured)
- A modern browser with camera permission for camera preview.

## Run locally

### 1. Backend
```bash
cd backend
cp .env.example .env
# Set MONGODB_URI and JWT_SECRET. Add GROQ_API_KEY to enable AI replies.
npm install
npm run seed
npm run dev
```
Backend runs at `http://localhost:5000`.

### 2. Frontend
In another terminal:
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`.

### Demo account
If `SEED_DEMO_USER=true` in backend `.env`, seed creates:
- Email: `demo@signbridge.ai`
- Password: `SignBridge123!`

Change this password before exposing the app publicly. Seed is idempotent and does not delete existing records.

## Groq
Set:
```env
GROQ_API_KEY=your_key
GROQ_MODEL=llama-3.3-70b-versatile
```
The backend calls Groq's OpenAI-compatible chat-completions endpoint. There is no silent Gemini fallback. If Groq is not configured, the Communicator returns a clear configuration error.

## ISL video library
The inventory at `frontend/src/data/islVideoInventory.json` was generated from the actual MP4 filenames in `frontend/public/assets/videos/isl/library/`. Regenerate it after adding/removing files:
```bash
cd frontend
npm run inventory
```
The clips are treated as media assets, not proof of linguistic correctness. Asset metadata defaults to `verified: false` and `source_asset_not_linguistically_reviewed`. Add source/creator/license attribution in `frontend/public/assets/videos/isl/library/ATTRIBUTION.md` after confirming the exact attribution wording and source details. The original filenames are preserved.

## Recognition
The camera panel supports local camera preview and a backend adapter for the existing ISL Bridge endpoint. Configure `ISL_BRIDGE_URL` if you want to enable the external recognition call. Recognition is a prototype adapter and does not claim unrestricted continuous ISL understanding.

## MST Blockchain credentials
The contract is in `blockchain/contracts/CredentialRegistry.sol`. Deployment is intentionally not performed and no contract address is fabricated. Configure RPC, deployer key, and chain settings in `blockchain/.env` before deploying. Review the contract and run its tests before using it for real credentials.

## Important limitations
- ISL word-video sequencing is inventory-constrained and deterministic; English word order is not represented as validated ISL grammar.
- Practitioner cards are explicitly illustrative. Practice requests are saved to MongoDB but no real practitioner is contacted or guaranteed to accept.
- Credentials page reports blockchain configuration honestly. It does not invent deployment or transaction data.
- The recognition integration is a configurable prototype adapter; model quality/latency depends on the configured provider.
