import { useEffect, useState } from 'react';
import { Check, LoaderCircle, TriangleAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getAuthToken } from '../platform/auth-token';
import Login from './Login';

type HandoffState = 'waiting' | 'sending' | 'success' | 'error';

const extensionId = new URLSearchParams(window.location.search).get('extensionId') || '';
const validExtensionId = /^[a-p]{32}$/.test(extensionId);

export default function ExtensionAuth() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [handoffState, setHandoffState] = useState<HandoffState>('waiting');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoading || !isAuthenticated || handoffState !== 'waiting') return;

    if (!validExtensionId) {
      setError('The extension request is invalid. Return to the Voxa extension and try again.');
      setHandoffState('error');
      return;
    }

    if (!globalThis.chrome?.runtime?.sendMessage) {
      setError('Chrome could not connect this page to the Voxa extension. Confirm that the extension is installed and enabled.');
      setHandoffState('error');
      return;
    }

    setHandoffState('sending');
    void getAuthToken()
      .then((token) => chrome.runtime.sendMessage(extensionId, {
        type: 'VOXA_AUTH',
        token,
        user: user ? { id: user.id, name: user.name, email: user.email } : null,
      }))
      .then((response) => {
        if (!response?.ok) throw new Error(response?.error || 'The extension did not accept the session.');
        setHandoffState('success');
      })
      .catch((handoffError) => {
        setError(handoffError instanceof Error ? handoffError.message : String(handoffError));
        setHandoffState('error');
      });
  }, [handoffState, isAuthenticated, isLoading, user]);

  if (isLoading) {
    return <main className="extension-auth-page"><section className="extension-auth-card"><LoaderCircle className="spin" /><h1>Checking your Voxa session</h1></section></main>;
  }

  if (!isAuthenticated) {
    return <main className="extension-auth-page"><section className="extension-auth-card extension-auth-login"><Login /></section></main>;
  }

  return (
    <main className="extension-auth-page">
      <section className="extension-auth-card">
        <span className={`extension-auth-icon is-${handoffState}`} aria-hidden>
          {handoffState === 'success' ? <Check /> : handoffState === 'error' ? <TriangleAlert /> : <LoaderCircle className="spin" />}
        </span>
        <span className="eyebrow">Voxa for Google Meet</span>
        <h1>{handoffState === 'success' ? 'Extension connected' : handoffState === 'error' ? 'Connection failed' : 'Connecting your extension'}</h1>
        <p>{handoffState === 'success' ? 'Your Voxa session is now available in the Chrome extension. You can close this tab.' : error || 'Keep this tab open while Voxa securely sends your session to the extension.'}</p>
        {handoffState === 'success' && <button className="button button-primary" type="button" onClick={() => window.close()}>Close this tab</button>}
        {handoffState === 'error' && <button className="button button-secondary" type="button" onClick={() => window.location.reload()}>Try again</button>}
      </section>
    </main>
  );
}
