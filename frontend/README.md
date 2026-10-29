# SignBridge AI frontend

The active React application uses `src/App.jsx`, screens under `src/pages/`, and the centralized API client under `src/services/`. The teammate-authored dashboard source remains under `src/pradnya-integration/` as a design reference; the active dashboard is inspired by its structure and uses the existing backend integrations.

Tailwind CSS v4 is already installed and configured through `@tailwindcss/vite` in `vite.config.js`. Global Tailwind imports and the SignBridge palette are defined in `src/index.css`. The dashboard shell, responsive navigation, page layouts, overview cards, shared card surfaces, buttons, settings navigation, and screen grids use Tailwind utilities. Specialized media, toggles, and detailed lesson/quiz presentation remain in `src/pages/Dashboard.css`.

The backend's insert-only seed script includes three ISLRTC lessons with verified video metadata, YouTube oEmbed URLs, original source links, and review-pending quizzes; it inserts them unpublished. A development-only publication change for frontend testing does not change their pending review status or establish qualified ISL review. See the repository README for exact video titles and content-verification scope.

From this directory:

```sh
npm ci
npm run dev
npm run lint
npm run build
```

The Vite development server runs on port `5173`. API requests default to `/api` and are proxied to `http://localhost:5000`. Copy `.env.example` to `.env` to configure the development proxy target; set `VITE_API_BASE_URL` to the API base URL for a separately deployed backend.

See the repository [README](../README.md) for backend setup, environment variables, API contracts, and feature status.

Lesson detail routes keep the responsive primary video player above the overview, with additional resources selectable beneath it. The routed assessment center is available at `/quiz`, lesson quizzes at `/quiz/lesson/:lessonId`, and the full-course test at `/quiz/full-course`.
