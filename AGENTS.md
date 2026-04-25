# AGENTS.md

## Project Overview
- Project type: Chrome Extension (Manifest V3) + optional Node/Express backend.
- Main goal: Export and navigate AI chats (ChatGPT, Gemini, Claude; some code also references Perplexity/DeepSeek).
- Frontend stack: TypeScript, React, styled-components, webpack.
- Backend stack: Node.js, Express, Stripe, Firebase Admin.

## Repo Layout
- `src/content/content.tsx`: Main content script logic (question extraction, navigation, export, PDF generation).
- `src/popup/popup.tsx`: Extension popup UI.
- `src/background/background.ts`: Service worker/background listeners.
- `src/utils/browser.ts`: Safe wrappers around `chrome.*` APIs.
- `src/utils/constants.ts`: Platform/domain constants and IDs.
- `public/manifest.json`: Chrome extension manifest and permissions.
- `webpack.config.js`: Build config and asset copy.
- `backend/server.js`: Backend API entry point.
- `docs/backend-api.md`: Backend endpoint documentation.

## Common Commands
- Frontend install: `npm install`
- Frontend dev build (watch): `npm start`
- Frontend production build: `npm run build`
- Load extension: Chrome -> `chrome://extensions` -> "Load unpacked" -> `dist`
- Backend install: `cd backend && npm install`
- Backend dev server: `cd backend && npm run dev`

## Environment Notes
- Frontend expects Firebase config in `src/config/firebase.ts` (if using subscription/cloud features).
- Backend expects env vars from `backend/.env` (see `backend/.env.example`).
- Never commit secrets or `.env` values.

## Editing Guardrails
- Keep Manifest V3 compatibility; avoid remote executable scripts.
- If adding platform support, update all of:
  - `src/content/content.tsx` selectors/extraction logic
  - `src/utils/constants.ts` domain constants
  - `public/manifest.json` host permissions + content script `matches`
  - `README.md` / `CONTRIBUTING.md` docs where relevant
- Keep `chrome.*` calls routed through `src/utils/browser.ts` wrappers when possible.
- For export changes, validate Markdown/JSON/Text/HTML and PDF paths.

## Validation Checklist (After Changes)
- Run `npm run build` from repo root and confirm webpack completes.
- If backend changed, run `cd backend && npm run dev` and check startup/endpoint health.
- Manual smoke test in Chrome on supported chat sites:
  - Detect prompts/questions
  - Jump-to-question navigation
  - Copy/export (Markdown, JSON, Text, HTML, PDF)
- Confirm no unnecessary permission expansion in `public/manifest.json`.

## Known Gaps / Caveats
- No real automated test suite is configured (`npm test` exits with placeholder).
- Large logic surface lives in `src/content/content.tsx`; prefer focused edits and verify site-specific selectors carefully.
- `README.md` and code are not fully aligned on supported platforms; trust manifest/content-script behavior as source of truth.
