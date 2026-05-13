# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Two independent projects in one tree:

- `backend/` — Python Flask API (`app.py`) backed by a local SQLite file (`shilpakala.db`). Dependencies in `requirements.txt` (flask, flask-cors, Pillow).
- `frontend/` — Expo / React Native app (Expo SDK 54, React Native 0.81, React 19) using `@react-navigation` for stack + bottom-tabs. Screens live in `frontend/screens/`.

There is no root-level package manager, monorepo tool, or test suite.

## Common commands

Backend (from `backend/`):
```bash
pip install -r requirements.txt
python app.py            # serves on 0.0.0.0:5001 with debug=True; auto-creates shilpakala.db
curl http://localhost:5001/health
```

Frontend (from `frontend/`):
```bash
npm install              # or: yarn (a .yarn/ dir is checked in)
npm start                # expo start
npm run ios              # expo start --ios
npm run android          # expo start --android
npm run web              # expo start --web
```

## Backend ↔ frontend wiring

Every screen hardcodes the backend host:
```js
const BACKEND_URL = 'http://192.168.1.44:5001';
```
This literal appears in `LoginScreen.js`, `SignupScreen.js`, `GalleryScreen.js`, and `PreviewScreen.js`. When running on a different machine or network, update **all four** occurrences — there is no shared config module. Use the dev machine's LAN IP (not `localhost`) so the phone/emulator can reach it.

## Architecture

### Auth & session model
- Passwords are SHA-256 hashed (no salt) and stored in the `users` table.
- `/login` and `/signup` return `{ success, name, email }` — there are no tokens, cookies, or sessions. The client treats "having a user object" as being logged in.
- Auth state lives **only** in `App.js`'s `useState(user)`. It is not persisted, so reloading the app logs the user out. All downstream API calls identify the user by passing `user.email` in the request body or URL path.

### Navigation
`App.js` swaps the entire stack based on whether `user` is set:
- Logged out: `Login` / `Signup` screens.
- Logged in: `MainTabs` (bottom tabs: `My Photos` = `GalleryScreen`, `Add New` = `AddNewScreen`) plus modal-style `Camera` and `Preview` screens pushed onto the stack.

The `Preview` screen is the workflow hub — it receives an image (from camera or picker), calls `/brand-image` to overlay the artisan banner, then optionally `POST`s to `/save-photo` (new) or `PUT`s to `/photo/<id>` (edit). `GalleryScreen` lists saved photos via `/photos/<email>` and deletes via `/photo/<id>`.

### Backend endpoints (`backend/app.py`)
- `POST /signup`, `POST /login` — user auth, SQLite-backed.
- `POST /brand-image` — input `{ image: base64, artisan_name, wood_type, price }`, returns `{ image: base64 }` with a brown banner + "HANDMADE" badge composited via Pillow. Pure transform — does not touch the DB.
- `POST /save-photo`, `GET /photos/<email>`, `PUT /photo/<id>`, `DELETE /photo/<id>` — CRUD over the `photos` table. Image bytes are stored as base64 **strings inside SQLite**, which is why the DB file is multi-MB even with few rows; keep this in mind before adding queries that `SELECT *` over many rows.
- `GET /health` — sanity check, returns user/photo counts.

### Image branding (`add_branding` in `app.py`)
Draws a fixed 500px-tall brown banner at the bottom of the image with the artisan name, `wood_type | Rs.price`, and "Handmade in Karnataka". Font lookup tries DejaVu (Linux) then Helvetica (macOS) then PIL's default. The banner geometry assumes a tall product photo — very small or very wide images will look wrong because the banner height and font sizes are absolute pixels, not relative.

## Gotchas

- The committed `shilpakala.db` contains real-looking user/photo data. Don't blow it away casually; back it up before schema changes (there are no migrations — `init_db` only runs `CREATE TABLE IF NOT EXISTS`).
- Image payloads travel as base64 JSON through `/brand-image` and `/save-photo`. Flask's default request size limit is 16 MB — large photos from a phone camera can exceed this once base64-encoded.
- CORS is wide open (`CORS(app)` with no origin restriction) and the server runs with `debug=True`. Fine for local dev, not safe to expose.
