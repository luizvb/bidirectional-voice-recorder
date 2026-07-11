# Chrome Web Store privacy checklist

## Single purpose

Voxa records a Google Meet tab and the user's microphone after explicit consent, then creates a private recording and transcript in the user's Voxa account.

## Permission justifications

- `activeTab`: confirm the user explicitly selected the current Google Meet tab.
- `tabCapture`: capture audio from the selected Meet tab only after the user presses Start recording.
- `offscreen`: keep the Web Audio and MediaRecorder pipeline active without injecting code into Google Meet.
- `sidePanel`: provide persistent recording controls and an unambiguous recording indicator.
- `storage`: preserve recording state and local recovery data after browser service-worker suspension.
- `https://meet.google.com/*`: restrict the recording experience to Google Meet.
- Voxa API and Auth origins: authenticate the user, upload encrypted-in-transit audio, and retrieve processing state.

## Data disclosure draft

The extension processes account identity, authentication information, audio communications, user-generated recording names, recording metadata, and transcripts. Audio is sent to Voxa infrastructure and Deepgram solely to provide recording and transcription. Structured account and recording data is stored in Neon. Audio is stored privately using Vercel Blob until the user deletes it.

Voxa does not use this data for personalized advertising and does not permit human access except when the user gives specific support consent, when required for security, or when legally required.

The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Publication assets still required

- Public homepage on a verified Voxa domain.
- Privacy policy and terms of service URLs.
- Support email and support page.
- 128px extension icon, store icon, screenshots, and promotional assets.
- Accurate data-use checkboxes matching this document.
- Demonstration video showing consent, recording indicator, stop, upload, transcript, and deletion.
