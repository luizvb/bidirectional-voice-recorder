import { readFile } from 'node:fs/promises';
import path from 'node:path';

const required = ['CWS_CLIENT_ID', 'CWS_CLIENT_SECRET', 'CWS_REFRESH_TOKEN', 'CWS_PUBLISHER_ID', 'CWS_EXTENSION_ID'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing ${key}. Keep Chrome Web Store credentials in CI secrets.`);
}

const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: process.env.CWS_CLIENT_ID,
    client_secret: process.env.CWS_CLIENT_SECRET,
    refresh_token: process.env.CWS_REFRESH_TOKEN,
    grant_type: 'refresh_token'
  })
});
if (!tokenResponse.ok) throw new Error(`Could not refresh Chrome Web Store token (${tokenResponse.status}).`);
const { access_token: accessToken } = await tokenResponse.json();
const root = path.resolve(import.meta.dirname, '..');
const archive = await readFile(path.join(root, 'release', 'voxa-meet-extension.zip'));
const base = `https://chromewebstore.googleapis.com`;
const item = `publishers/${process.env.CWS_PUBLISHER_ID}/items/${process.env.CWS_EXTENSION_ID}`;

const uploadResponse = await fetch(`${base}/upload/v2/${item}:upload`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/zip' },
  body: archive
});
if (!uploadResponse.ok) throw new Error(`Chrome Web Store upload failed (${uploadResponse.status}): ${await uploadResponse.text()}`);

const publishResponse = await fetch(`${base}/v2/${item}:publish`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}` }
});
if (!publishResponse.ok) throw new Error(`Chrome Web Store publish failed (${publishResponse.status}): ${await publishResponse.text()}`);
console.log(JSON.stringify(await publishResponse.json(), null, 2));
