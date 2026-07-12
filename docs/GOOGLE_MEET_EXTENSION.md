# Voxa for Google Meet

Chrome Manifest V3 extension that records the current Google Meet tab and the user's microphone after explicit consent. Audio is stored locally until the private multipart upload and post-meeting transcription complete.

Authentication is not required to start capture. For signed-out users, the finalized recording remains in extension IndexedDB, the Google sign-in flow opens after Stop, and upload resumes automatically under the authenticated account without changing the recording session ID.

## Local build

```bash
npm install
npm run build:extension
```

Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `extension/dist`.

Configuration is read from the repository environment at build time:

```bash
VOXA_EXTENSION_API_URL=http://localhost:3000
VOXA_WEB_APP_URL=http://localhost:5173
VITE_NEON_AUTH_URL=https://your-neon-auth.example/auth
```

The web app route `/extension-auth` must complete Neon Auth sign-in and call:

```js
chrome.runtime.sendMessage(extensionId, {
  type: 'VOXA_AUTH',
  token: accessToken,
  user: { id: user.id, name: user.name, email: user.email }
});
```

The web app origin must match `VOXA_WEB_APP_URL` at build time. Never place client secrets, Deepgram keys, Vercel Blob read-write tokens, or Chrome Web Store refresh tokens in the extension bundle.

## Backend requirements

Apply `app/schema.sql`, then configure:

```bash
NEON_AUTH_URL=https://your-neon-auth.example/auth
NEON_AUTH_JWKS_URL=https://your-neon-auth.example/.well-known/jwks.json
DATABASE_URL=postgresql://...
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
DEEPGRAM_API_KEY=...
APP_URL=https://app.voxa.example
CORS_ALLOWED_ORIGINS=https://app.voxa.example,chrome-extension://EXTENSION_ID
```

Production recording routes require a verified Bearer token. Audio blobs are private and media playback is proxied through the authenticated API.

## Package and publish

```bash
npm run package:extension
```

The deterministic archive is created at `release/voxa-meet-extension.zip`. The first Chrome Web Store listing, privacy disclosure, visibility selection, and first publication remain manual. Later releases can use the Chrome Web Store API with CI secrets.

## Manual smoke test

1. Open a Google Meet with another participant.
2. Open the Voxa Side Panel while signed out.
3. Confirm consent and start recording.
4. Verify local and remote voices, pause, resume, then stop.
5. Complete Google sign-in, verify the auth tab closes, and confirm the Side Panel immediately changes to upload/transcription.
6. Verify the recording is associated with the signed-in account and the local recovery copy is deleted only after processing succeeds.
7. Close or navigate away from the Meet during a second recording and confirm a recoverable local copy appears.
8. Delete the cloud recording and verify authenticated playback and transcript access stop working.
