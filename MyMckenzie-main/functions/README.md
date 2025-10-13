Firebase Function: Gemini proxy

Steps to deploy and configure:

1. Install dependencies and login to Firebase CLI

   npm install
   firebase login

2. Set the Gemini API key in Functions config (preferred) or environment variable.

   # Using functions config (recommended):
   firebase functions:config:set gemini.key="YOUR_GEMINI_API_KEY"

   # Or set an environment variable in your hosting environment: GEMINI_API_KEY

3. Deploy the function

   firebase deploy --only functions:api

4. Update your frontend to point `window.GEN_PROXY_URL` to the deployed function if it's not hosted under the same domain.

Notes:
- This proxy keeps the Gemini key out of client bundles. For production, validate incoming requests (e.g. verify Firebase ID tokens) and add rate limiting.

Environment variable options

- Local (PowerShell) development: set an env var before starting the emulator:

   # PowerShell
   $env:GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";
   npm run start

- Firebase Functions config (recommended):

   firebase functions:config:set gemini.key="YOUR_GEMINI_API_KEY"
   # Then deploy with: firebase deploy --only functions:api

- Google Cloud Functions / environment variables: If deploying outside the Firebase CLI, set the environment variable GEMINI_API_KEY via your cloud provider's UI or CLI.

Security note
- Do not commit the key to source control. Use CI/CD secret stores or the cloud project's secret manager for production deployments.
