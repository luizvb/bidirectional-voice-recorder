import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { CaptureState, RuntimeMessage } from '../types';
import './styles.css';

const IDLE: CaptureState = { phase: 'idle' };

function elapsed(state: CaptureState, now: number) {
  const base = state.elapsedBeforePauseMs || 0;
  return state.phase === 'recording' ? base + now - (state.startedAt || now) : base;
}

function formatTime(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

async function send(message: RuntimeMessage) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) throw new Error(response?.error || 'The extension could not complete this action.');
  return response;
}

function App() {
  const [state, setState] = useState<CaptureState>(IDLE);
  const [authenticated, setAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  const [consent, setConsent] = useState(false);
  const [name, setName] = useState('Google Meet recording');
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(true);
  const [localError, setLocalError] = useState('');

  const refresh = async () => {
    const response = await send({ type: 'GET_STATE' });
    setState(response.state || IDLE);
    setAuthenticated(Boolean(response.auth?.authToken));
    setUserName(response.auth?.authUser?.name || response.auth?.authUser?.email || 'Signed in');
    setBusy(false);
  };

  useEffect(() => {
    void refresh().catch((error) => { setLocalError(error.message); setBusy(false); });
    const listener = (message: { type?: string; state?: CaptureState; auth?: { authToken?: string; authUser?: { name?: string; email?: string } } }) => {
      if (message.type === 'STATE_CHANGED' && message.state) setState(message.state);
      if (message.type === 'AUTH_CHANGED') {
        setAuthenticated(Boolean(message.auth?.authToken));
        setUserName(message.auth?.authUser?.name || message.auth?.authUser?.email || 'Signed in');
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  useEffect(() => {
    if (state.phase !== 'recording') return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [state.phase]);

  const active = state.phase === 'recording' || state.phase === 'paused';
  const status = useMemo(() => ({
    idle: 'Ready to record', preparing: 'Requesting access', recording: 'Recording', paused: 'Paused',
    awaiting_auth: 'Recording saved locally', uploading: `Uploading ${state.progress || 0}%`, transcribing: 'Creating transcript', ready: 'Transcript ready',
    failed: 'Action needed', recoverable: 'Recording saved locally'
  })[state.phase], [state.phase, state.progress]);

  const run = async (action: () => Promise<unknown>) => {
    setLocalError('');
    setBusy(true);
    try { await action(); } catch (error) { setLocalError(error instanceof Error ? error.message : String(error)); } finally { setBusy(false); }
  };

  if (busy && state.phase === 'idle') return <main className="shell"><div className="skeleton" /><div className="skeleton short" /></main>;

  return (
    <main className="shell">
      <header className="brand">
        <div className="brand-lockup">
          <img src="/icon-48.png" alt="" aria-hidden="true" />
          <div><span className="wordmark">Voxa</span><span className="context">Google Meet recorder</span></div>
        </div>
        <button className="account" onClick={() => chrome.tabs.create({ url: `${__VOXA_APP_URL__}/extension-auth?extensionId=${chrome.runtime.id}` })}>
          {authenticated ? userName : 'Sign in'}
        </button>
      </header>

      <section className={`status status-${state.phase}`} aria-live="polite">
        <span className="status-mark" aria-hidden="true" />
        <div className="status-copy"><span className="eyebrow">Capture status</span><strong>{status}</strong><span>{active ? formatTime(elapsed(state, now)) : state.phase === 'uploading' ? 'Keep Chrome open' : 'Voxa keeps the recovery copy until processing succeeds.'}</span></div>
      </section>

      {state.phase === 'idle' && (
        <section className="setup">
          <div className="section-heading"><span className="eyebrow">New conversation</span><h1>Record this meeting</h1><p>Capture the Meet audio and turn it into a searchable conversation in Voxa.</p></div>
          <label htmlFor="recording-name">Conversation title</label>
          <input id="recording-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} />
          <label className="consent">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>I informed the participants and have permission to record this meeting.</span>
          </label>
          <button className="primary" disabled={!consent || busy} onClick={() => run(() => send({ type: 'START_CAPTURE', consent, name }))}>
            Start recording
          </button>
          <p className="helper">Voxa captures this Meet tab and your microphone. If you are not signed in, the recording stays on this device and login is requested only after you stop.</p>
        </section>
      )}

      {active && (
        <section className="controls">
          <button className="secondary" disabled={busy} onClick={() => run(() => send({ type: state.phase === 'recording' ? 'PAUSE_CAPTURE' : 'RESUME_CAPTURE' }))}>
            {state.phase === 'recording' ? 'Pause' : 'Resume'}
          </button>
          <button className="danger" disabled={busy} onClick={() => run(() => send({ type: 'STOP_CAPTURE' }))}>Stop and transcribe</button>
          <p className="helper">Closing or leaving the Meet tab stops the recording and preserves a recovery copy.</p>
        </section>
      )}

      {(state.phase === 'preparing' || state.phase === 'uploading' || state.phase === 'transcribing') && (
        <section className="processing"><div className="progress"><span style={{ width: state.phase === 'uploading' ? `${state.progress || 4}%` : '100%' }} /></div><p>Do not close Chrome while Voxa secures your recording.</p></section>
      )}

      {state.phase === 'awaiting_auth' && state.sessionId && (
        <section className="recovery">
          <h1>Your recording is safe.</h1>
          <p>Sign in to attach this recording to your Voxa account, upload it privately, and create the transcript.</p>
          <button className="primary" disabled={busy} onClick={() => run(() => send({ type: 'OPEN_AUTH' }))}>Sign in and continue</button>
          <button className="text-button" onClick={() => run(() => send({ type: 'DISCARD_LOCAL', sessionId: state.sessionId! }))}>Discard local copy</button>
        </section>
      )}

      {state.phase === 'ready' && (
        <section className="result"><h1>Your conversation is ready.</h1><p>The recording and transcript are available in Voxa.</p><button className="primary" onClick={() => chrome.tabs.create({ url: state.resultUrl || __VOXA_APP_URL__ })}>Open in Voxa</button></section>
      )}

      {(state.phase === 'recoverable' || state.phase === 'failed') && state.sessionId && (
        <section className="recovery"><h1>Your recording is safe.</h1><p>{state.error || 'Upload it when your connection is available.'}</p>{authenticated ? <button className="primary" disabled={busy} onClick={() => run(() => send({ type: 'RETRY_UPLOAD', sessionId: state.sessionId! }))}>Retry upload</button> : <button className="primary" disabled={busy} onClick={() => run(() => send({ type: 'OPEN_AUTH' }))}>Sign in and retry</button>}<button className="text-button" onClick={() => run(() => send({ type: 'DISCARD_LOCAL', sessionId: state.sessionId! }))}>Discard local copy</button></section>
      )}

      {(localError || (state.phase === 'failed' && !state.sessionId)) && <p className="error" role="alert">{localError || state.error}</p>}

      <footer>Audio is retained privately until you delete it in Voxa.</footer>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
