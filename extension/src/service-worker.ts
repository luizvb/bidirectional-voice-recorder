import { deleteRecording, getRecording, listRecordings } from './storage';
import { getRecordingStatus, uploadRecording } from './api';
import type { CaptureState, RuntimeMessage } from './types';

const STATE_KEY = 'captureState';
const ACTIVE_PHASES = new Set(['preparing', 'recording', 'paused']);

async function getState(): Promise<CaptureState> {
  const result = await chrome.storage.local.get(STATE_KEY);
  return (result[STATE_KEY] as CaptureState | undefined) || { phase: 'idle' };
}

async function setState(state: CaptureState) {
  await chrome.storage.local.set({ [STATE_KEY]: state });
  chrome.runtime.sendMessage({ type: 'STATE_CHANGED', state }).catch(() => {});
  await chrome.action.setBadgeText({ text: state.phase === 'recording' ? 'REC' : state.phase === 'paused' ? 'II' : '' });
  if (state.phase === 'recording') await chrome.action.setBadgeBackgroundColor({ color: '#D4443E' });
}

async function ensureOffscreen() {
  const url = chrome.runtime.getURL('offscreen.html');
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'], documentUrls: [url] });
  if (contexts.length === 0) await chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['USER_MEDIA'], justification: 'Record Google Meet tab audio and microphone after explicit user consent.' });
}

async function currentMeetTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id || !tab.url?.startsWith('https://meet.google.com/')) throw new Error('Open a Google Meet tab before recording.');
  return tab;
}

async function getAuth() {
  return chrome.storage.local.get(['authToken', 'authUser']);
}

async function openAuthTab() {
  return chrome.tabs.create({ url: `${__VOXA_APP_URL__}/extension-auth?extensionId=${chrome.runtime.id}` });
}

async function startCapture(name = 'Google Meet recording') {
  const current = await getState();
  if (ACTIVE_PHASES.has(current.phase)) throw new Error('A recording is already active.');
  const tab = await currentMeetTab();
  const sessionId = crypto.randomUUID();
  await setState({ phase: 'preparing', sessionId, tabId: tab.id });
  await ensureOffscreen();
  // Omitting targetTabId captures the currently active tab and avoids requiring
  // a separate activeTab grant from a toolbar-action click. The tab was already
  // validated as the active Google Meet tab immediately above.
  let streamId: string;
  try {
    streamId = await chrome.tabCapture.getMediaStreamId();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not been invoked|activeTab/i.test(message)) {
      throw new Error('Chrome needs one activation click for this Meet tab. Click the Voxa extension icon in the toolbar to reopen the panel, then press Start recording again.');
    }
    throw error;
  }
  const response = await chrome.runtime.sendMessage({ type: 'OFFSCREEN_START', streamId, sessionId, name } satisfies RuntimeMessage);
  if (!response?.ok) throw new Error(response?.error || 'Could not start capture.');
  await setState({ phase: 'recording', sessionId, tabId: tab.id, startedAt: Date.now(), elapsedBeforePauseMs: 0 });
}

async function processRecording(sessionId: string) {
  const recording = await getRecording(sessionId);
  if (!recording) throw new Error('The local recovery copy was not found.');
  await setState({ phase: 'uploading', sessionId, progress: 0 });
  try {
    const created = await uploadRecording(recording, (progress) => void setState({ phase: 'uploading', sessionId, progress }));
    await setState({ phase: 'transcribing', sessionId, recordingId: created.recordingId, resultUrl: created.resultUrl });
    const deadline = Date.now() + 15 * 60_000;
    while (Date.now() < deadline) {
      const status = await getRecordingStatus(created.recordingId);
      if (status.state === 'ready') {
        await deleteRecording(sessionId);
        await setState({ phase: 'ready', sessionId, recordingId: created.recordingId, resultUrl: status.resultUrl || created.resultUrl });
        return;
      }
      if (status.state === 'failed') throw new Error(status.error || 'Transcription failed.');
      await new Promise((resolve) => setTimeout(resolve, 3_000));
    }
    throw new Error('Transcription is still processing. Open Voxa to check it later.');
  } catch (error) {
    await setState({ phase: 'recoverable', sessionId, error: error instanceof Error ? error.message : String(error) });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  void listRecordings().then(async (items) => {
    if (items.length && (await getState()).phase === 'idle') await setState({ phase: 'recoverable', sessionId: items[0].sessionId, error: 'A local recording is waiting to upload.' });
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!changeInfo.url) return;
  void getState().then((state) => {
    if (state.tabId === tabId && ACTIVE_PHASES.has(state.phase) && !changeInfo.url?.startsWith('https://meet.google.com/')) chrome.runtime.sendMessage({ type: 'OFFSCREEN_STOP' } satisfies RuntimeMessage);
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void getState().then((state) => {
    if (state.tabId === tabId && ACTIVE_PHASES.has(state.phase)) chrome.runtime.sendMessage({ type: 'OFFSCREEN_STOP' } satisfies RuntimeMessage);
  });
});

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (!sender.url?.startsWith(__VOXA_APP_URL__)) return;

  if (message?.type === 'VOXA_CLOSE_AUTH_TAB') {
    sendResponse({ ok: true });
    if (sender.tab?.id) void chrome.tabs.remove(sender.tab.id).catch(() => {});
    return false;
  }

  if (message?.type !== 'VOXA_AUTH' || typeof message.token !== 'string') return;
  void (async () => {
    await chrome.storage.local.set({ authToken: message.token, authUser: message.user || null });
    chrome.runtime.sendMessage({ type: 'AUTH_CHANGED', auth: await getAuth() }).catch(() => {});
    sendResponse({ ok: true });

    const authTabId = sender.tab?.id;
    if (authTabId) setTimeout(() => void chrome.tabs.remove(authTabId).catch(() => {}), 250);

    const state = await getState();
    if (state.phase === 'awaiting_auth' && state.sessionId) await processRecording(state.sessionId);
  })().catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }));
  return true;
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  void (async () => {
    try {
      if (message.type === 'GET_STATE') return sendResponse({ ok: true, state: await getState(), auth: await getAuth() });
      if (message.type === 'START_CAPTURE') {
        if (!message.consent) throw new Error('Confirm consent before recording.');
        await startCapture(message.name);
      }
      if (message.type === 'PAUSE_CAPTURE') {
        const state = await getState();
        await chrome.runtime.sendMessage({ type: 'OFFSCREEN_PAUSE' } satisfies RuntimeMessage);
        await setState({ ...state, phase: 'paused', elapsedBeforePauseMs: (state.elapsedBeforePauseMs || 0) + Date.now() - (state.startedAt || Date.now()) });
      }
      if (message.type === 'RESUME_CAPTURE') {
        const state = await getState();
        await chrome.runtime.sendMessage({ type: 'OFFSCREEN_RESUME' } satisfies RuntimeMessage);
        await setState({ ...state, phase: 'recording', startedAt: Date.now() });
      }
      if (message.type === 'STOP_CAPTURE') await chrome.runtime.sendMessage({ type: 'OFFSCREEN_STOP' } satisfies RuntimeMessage);
      if (message.type === 'OPEN_AUTH') await openAuthTab();
      if (message.type === 'CAPTURE_READY') {
        const auth = await getAuth();
        if (auth.authToken) {
          await processRecording(message.sessionId);
        } else {
          await setState({ phase: 'awaiting_auth', sessionId: message.sessionId });
          await openAuthTab();
        }
      }
      if (message.type === 'CAPTURE_ERROR') await setState({ ...(await getState()), phase: 'failed', error: message.error });
      if (message.type === 'RETRY_UPLOAD') await processRecording(message.sessionId);
      if (message.type === 'DISCARD_LOCAL') {
        await deleteRecording(message.sessionId);
        await setState({ phase: 'idle' });
      }
      sendResponse({ ok: true });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      const current = await getState();
      if (message.type === 'START_CAPTURE' && current.phase === 'preparing') {
        await setState({ phase: 'idle' });
      } else {
        await setState({ ...current, phase: 'failed', error: messageText });
      }
      sendResponse({ ok: false, error: messageText });
    }
  })();
  return true;
});
