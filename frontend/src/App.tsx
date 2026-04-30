import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type Contact = {
  id: string;
  properties: Record<string, string>;
};

type Pagination = {
  next?: { after: string };
};

const ERROR_MESSAGES: Record<string, string> = {
  NOT_CONNECTED: 'Not connected. Click "Connect HubSpot" first.',
  REFRESH_FAILED: 'Token refresh failed. Please reconnect.',
  RATE_LIMITED: 'Rate limited by HubSpot. Try again in a moment.',
};

export default function App() {
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('connectionId');
    if (id) {
      setConnectionId(id);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  async function handleConnect() {
    try {
      const res = await fetch(`${API}/connect`);
      const { authorizeUrl } = await res.json();
      window.location.href = authorizeUrl;
    } catch {
      setError('Failed to reach backend.');
    }
  }

  async function handleGetContacts(after?: string) {
    if (!connectionId) {
      setError('NOT_CONNECTED');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = new URL(`${API}/contacts`);
      url.searchParams.set('connectionId', connectionId);
      if (after) url.searchParams.set('after', after);

      const res = await fetch(url.toString());
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'UNKNOWN_ERROR');
        return;
      }

      setContacts(data.contacts);
      setPagination(data.pagination);
    } catch {
      setError('NETWORK_ERROR');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>HubSpot Connector</h1>
      <p style={{ color: '#666', marginTop: 0 }}>OAuth integration — contacts via HubSpot CRM API</p>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button onClick={handleConnect} style={btnStyle('#0066cc')}>
          Connect HubSpot
        </button>
        <button onClick={() => handleGetContacts()} disabled={loading} style={btnStyle('#28a745')}>
          {loading ? 'Loading...' : 'Get Contacts'}
        </button>
      </div>

      {connectionId && (
        <p style={{ color: '#28a745', fontSize: '0.85rem' }}>
          Connected &mdash; <code>{connectionId}</code>
        </p>
      )}

      {error && (
        <p style={{ color: '#cc0000', background: '#fff0f0', padding: '0.75rem', borderRadius: '4px' }}>
          {ERROR_MESSAGES[error] ?? `Error: ${error}`}
        </p>
      )}

      {contacts.length > 0 && (
        <>
          <pre style={{ background: '#f4f4f4', padding: '1rem', borderRadius: '4px', overflow: 'auto', fontSize: '0.8rem' }}>
            {JSON.stringify(contacts, null, 2)}
          </pre>
          {pagination?.next && (
            <button onClick={() => handleGetContacts(pagination.next!.after)} style={btnStyle('#555')}>
              Load Next Page
            </button>
          )}
        </>
      )}
    </div>
  );
}

function btnStyle(bg: string) {
  return {
    background: bg,
    color: '#fff',
    border: 'none',
    padding: '0.5rem 1.25rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  };
}
