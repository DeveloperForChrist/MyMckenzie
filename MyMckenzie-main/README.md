# MyMcKenzie (reorganized)

This project is a static HTML/CSS/JS site reorganized to a more conventional scaffold. It includes Firebase Auth + Firestore integration for sign-up and sign-in flows.

## Local development

From the project root, run a static server:

PowerShell:
```powershell
npx http-server -c-1
# or
python -m http.server 8000
```

Then open `index.html` in the browser:
```
http://localhost:8080/index.html  # http-server default
```

## Auth & backend (Neon + server)

This project has been migrated to a server-backed Neon (Postgres) setup.

1. Run the server in `server/` which exposes minimal endpoints used by the frontend (e.g. `/api/signup`, `/api/signin`, `/api/reset-password`).
2. Configure `server/.env` with your `DATABASE_URL` (Neon) and, if you use Neon Auth (Stack), the appropriate secret keys.
3. Run `npm install` in the `server` folder and start with `npm run start` or `npm run dev`.

When the server is running, the site will call the server endpoints for auth and profile operations.

Files to note:
- Server entry: `server/index.js`
- Frontend signup: `auth/user-signup.html` -> `assets/js/user-signup.js`
- Frontend signin: `auth/signin.html` -> `assets/js/signin.js`
- Frontend password reset: `auth/reset-password.html` -> `assets/js/password-reset.js`

Security notes:
- Keep `server/.env` out of version control. If you use Neon Auth (Stack) secret keys, store them server-side only.
- Rotate any keys that were previously committed.

## Security notes

- This repo contains the Firebase web API key. That is expected for client SDK usage, but lock down Firestore rules before deploying.
- Consider adding Cloud Functions to manage role assignments, and enable email verification enforcement in your app.

Neon / Database secrets

- If you plan to use Neon (Postgres) or any DB, keep secrets out of the repo. Use a local `.env` file (this repo already ignores `.env`) or your CI/CD secret store.
- If any of your Neon/DB keys or publishable/secret keys have been committed, rotate them immediately from the Neon dashboard and replace them in your local environment.

## Quick checks

- Run the link checker:
```powershell
node .\scripts\link_check.js
```

If you want, I can also:
- Add Firestore security rules template and help deploy.
- Wire up email verification flows UI (resend verification link, etc.).
- Replace placeholder pages with real content.

End-to-end test (optional):
- There's a lightweight Puppeteer E2E test at `scripts/e2e/run-join-test.js` that verifies the Join -> User Sign Up navigation.
- To run it locally:
  1. Install puppeteer (one-time):
	  ```powershell
	  npm install puppeteer --save-dev
	  ```
  2. Run the test:
	  ```powershell
	  npm run test:e2e
	  ```
  The script will start a static server and run the headless test. It requires Node.js and network access to download puppeteer the first time.

*** End README ***
