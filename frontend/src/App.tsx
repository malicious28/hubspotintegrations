import { useState, useEffect, useRef, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type Contact = {
  id: string;
  properties: Record<string, string>;
};

type Pagination = { next?: { after: string } };
type ChatMessage = { role: 'user' | 'assistant'; text: string };
type TokenStatus = { connected: boolean; expiresAt?: number; expired?: boolean };

const ERROR_MESSAGES: Record<string, string> = {
  NOT_CONNECTED: 'Not connected — authorize via HubSpot first.',
  REFRESH_FAILED: 'Session expired. Please reconnect.',
  RATE_LIMITED: 'Rate limited by HubSpot. Try again shortly.',
  NETWORK_ERROR: 'Cannot reach the backend. Make sure the server is running.',
};

export default function App() {
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('connectionId');
    if (id) { setConnectionId(id); window.history.replaceState({}, '', '/'); }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (!connectionId) return;
    const poll = async () => {
      try {
        const res = await fetch(`${API}/status?connectionId=${connectionId}`);
        if (res.ok) setTokenStatus(await res.json());
      } catch { /* silent */ }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [connectionId]);

  function formatCountdown(expiresAt: number) {
    const ms = expiresAt - Date.now();
    if (ms <= 0) return 'Expired';
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}m ${s}s`;
  }

  async function handleConnect() {
    setError(null);
    try {
      const res = await fetch(`${API}/connect`);
      const { authorizeUrl } = await res.json();
      window.location.href = authorizeUrl;
    } catch { setError('NETWORK_ERROR'); }
  }

  async function handleGetContacts(after?: string) {
    if (!connectionId) { setError('NOT_CONNECTED'); return; }
    setLoading(true); setError(null);
    try {
      const url = new URL(`${API}/contacts`);
      url.searchParams.set('connectionId', connectionId);
      if (after) url.searchParams.set('after', after);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'UNKNOWN_ERROR'); return; }
      setContacts(data.contacts);
      setPagination(data.pagination);
    } catch { setError('NETWORK_ERROR'); }
    finally { setLoading(false); }
  }

  async function handleChat() {
    if (!chatInput.trim() || !connectionId) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatLoading(true);
    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId, message: msg }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        text: res.ok ? data.reply : `Error: ${data.error}`,
      }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', text: 'Network error. Try again.' }]);
    } finally { setChatLoading(false); }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, sans-serif; background: #fff; color: #111; }
        .chat-input:focus { outline: none; border-color: rgba(139,92,246,0.5); box-shadow: 0 0 0 3px rgba(139,92,246,0.1); }
        .send-btn:hover:not(:disabled) { opacity: 0.9; }
        .action-btn:hover:not(:disabled) { opacity: 0.85; }
        tr:hover td { background: #FAFAFA; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.25); border-radius: 4px; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#fff' }}>

        {/* Header */}
        <header style={{
          background: '#fff',
          borderBottom: '1px solid #F0F0F0',
          padding: '0.9rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: 30, height: 30,
              background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(139,92,246,0.35)',
            }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 13 }}>H</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em' }}>HubSpot Connector</span>
          </div>
          {connectionId
            ? <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', background: 'linear-gradient(135deg, #EDE9FE, #F5F3FF)', color: '#6D28D9', padding: '0.3rem 0.85rem', borderRadius: 20, fontWeight: 600, border: '1px solid #DDD6FE' }}>● Connected</span>
                {tokenStatus?.expiresAt && (
                  <span style={{ fontSize: '0.7rem', color: tokenStatus.expired ? '#DC2626' : '#9CA3AF', fontFamily: 'monospace' }}>
                    {tokenStatus.expired ? 'Token expired' : `Token: ${formatCountdown(tokenStatus.expiresAt)}`}
                  </span>
                )}
              </div>
            : <span style={{ fontSize: '0.75rem', color: '#9CA3AF', padding: '0.3rem 0.85rem', borderRadius: 20, border: '1px solid #F0F0F0' }}>Not connected</span>
          }
        </header>

        <div style={{ maxWidth: 860, margin: '2.5rem auto', padding: '0 1.5rem' }}>

          {/* Action Bar */}
          <div style={{
            background: '#fff',
            border: '1px solid #F0F0F0',
            borderRadius: 12,
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            <button className="action-btn" onClick={handleConnect} style={gradientBtn()}>
              Connect HubSpot
            </button>
            <button className="action-btn" onClick={() => handleGetContacts()} disabled={loading} style={outlineBtn(loading)}>
              {loading ? 'Fetching…' : 'Get Contacts'}
            </button>
            {connectionId && (
              <button className="action-btn" onClick={async () => {
                await fetch(`${API}/debug/expire`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ connectionId }),
                });
                setTokenStatus(prev => prev ? { ...prev, expired: true, expiresAt: 0 } : prev);
              }} style={{ ...outlineBtn(), color: '#DC2626', borderColor: '#FECACA', fontSize: '0.8rem' }}>
                Expire Token
              </button>
            )}
            {connectionId && (
              <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'monospace' }}>
                {connectionId.slice(0, 8)}…
              </span>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#FFF5F5',
              border: '1px solid #FED7D7',
              borderRadius: 10,
              padding: '0.85rem 1rem',
              marginBottom: '1.5rem',
              color: '#C53030',
              fontSize: '0.875rem',
            }}>
              {ERROR_MESSAGES[error] ?? `Error: ${error}`}
            </div>
          )}

          {/* Contacts Table */}
          {contacts.length > 0 && (() => {
            const q = searchQuery.toLowerCase();
            const filtered = q
              ? contacts.filter(c =>
                  (c.properties.firstname || '').toLowerCase().includes(q) ||
                  (c.properties.lastname || '').toLowerCase().includes(q) ||
                  (c.properties.email || '').toLowerCase().includes(q)
                )
              : contacts;
            return (
            <div style={{
              background: '#fff',
              border: '1px solid #F0F0F0',
              borderRadius: 12,
              overflow: 'hidden',
              marginBottom: '1.5rem',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                  Contacts <span style={{ color: '#9CA3AF', fontWeight: 400, fontSize: '0.82rem' }}>({q ? `${filtered.length} of ${contacts.length}` : contacts.length})</span>
                </span>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  style={{ flex: 1, maxWidth: 260, padding: '0.4rem 0.75rem', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none' }}
                />
                {pagination?.next && (
                  <button className="action-btn" onClick={() => handleGetContacts(pagination.next!.after)} style={{ ...gradientBtn(), padding: '0.35rem 0.9rem', fontSize: '0.78rem' }}>
                    Next Page →
                  </button>
                )}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#FAFAFA' }}>
                    {['First Name', 'Last Name', 'Email', 'ID'].map(h => (
                      <th key={h} style={{ padding: '0.65rem 1.5rem', textAlign: 'left', color: '#9CA3AF', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #F0F0F0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0
                    ? <tr><td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>No contacts match your search.</td></tr>
                    : filtered.map((c, i) => (
                      <tr key={c.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F7F7F7' : 'none', transition: 'background 0.1s' }}>
                        <td style={{ padding: '0.75rem 1.5rem' }}>{c.properties.firstname || '—'}</td>
                        <td style={{ padding: '0.75rem 1.5rem' }}>{c.properties.lastname || '—'}</td>
                        <td style={{ padding: '0.75rem 1.5rem' }}>{c.properties.email || '—'}</td>
                        <td style={{ padding: '0.75rem 1.5rem', color: '#9CA3AF', fontFamily: 'monospace', fontSize: '0.72rem' }}>{c.id}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
            );
          })()}

          {/* Chat — Glassmorphism */}
          {connectionId && (
            <div style={{
              background: 'rgba(255,255,255,0.55)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.8)',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(139,92,246,0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
              position: 'relative',
            }}>
              {/* Gradient glow behind chat */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(135deg, rgba(139,92,246,0.04) 0%, rgba(109,40,217,0.03) 100%)',
                pointerEvents: 'none',
                zIndex: 0,
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ padding: '0.7rem 1.25rem', borderBottom: '1px solid rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                    boxShadow: '0 0 6px rgba(139,92,246,0.6)',
                  }} />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Ask about your contacts</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#8B5CF6', fontWeight: 500 }}>Powered by Claude</span>
                </div>

                <div style={{ height: 180, overflowY: 'auto', padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {chatMessages.length === 0 && (
                    <div style={{ color: '#9CA3AF', fontSize: '0.82rem', textAlign: 'center', marginTop: '2rem', lineHeight: 1.8 }}>
                      Try asking:<br />
                      <em>"How many contacts do I have?"</em><br />
                      <em>"List contacts with no email."</em>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <span style={{
                        background: msg.role === 'user'
                          ? 'linear-gradient(135deg, #8B5CF6, #6D28D9)'
                          : 'rgba(255,255,255,0.75)',
                        color: msg.role === 'user' ? '#fff' : '#111',
                        padding: '0.6rem 0.95rem',
                        borderRadius: msg.role === 'user' ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                        fontSize: '0.875rem',
                        maxWidth: '78%',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.55,
                        border: msg.role === 'assistant' ? '1px solid rgba(139,92,246,0.15)' : 'none',
                        boxShadow: msg.role === 'user'
                          ? '0 2px 12px rgba(139,92,246,0.3)'
                          : '0 1px 4px rgba(0,0,0,0.06)',
                        backdropFilter: msg.role === 'assistant' ? 'blur(8px)' : 'none',
                      }}>
                        {msg.text}
                      </span>
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <span style={{
                        background: 'rgba(255,255,255,0.7)',
                        border: '1px solid rgba(139,92,246,0.15)',
                        color: '#8B5CF6',
                        padding: '0.6rem 0.95rem',
                        borderRadius: '14px 14px 14px 3px',
                        fontSize: '0.82rem',
                        backdropFilter: 'blur(8px)',
                      }}>
                        Thinking…
                      </span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div style={{ padding: '0.6rem 0.85rem', borderTop: '1px solid rgba(139,92,246,0.08)', display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(10px)' }}>
                  <input
                    className="chat-input"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChat()}
                    placeholder="Ask something about your contacts..."
                    style={{
                      flex: 1,
                      padding: '0.6rem 0.9rem',
                      border: '1px solid rgba(139,92,246,0.2)',
                      borderRadius: 10,
                      fontSize: '0.875rem',
                      fontFamily: 'inherit',
                      background: 'rgba(255,255,255,0.7)',
                      backdropFilter: 'blur(8px)',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}
                  />
                  <button
                    className="send-btn"
                    onClick={handleChat}
                    disabled={chatLoading || !chatInput.trim()}
                    style={gradientBtn(chatLoading || !chatInput.trim())}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function gradientBtn(disabled = false): React.CSSProperties {
  return {
    background: disabled ? '#E5E7EB' : 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
    color: disabled ? '#9CA3AF' : '#fff',
    border: 'none',
    padding: '0.55rem 1.25rem',
    borderRadius: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
    whiteSpace: 'nowrap' as const,
    boxShadow: disabled ? 'none' : '0 2px 8px rgba(139,92,246,0.3)',
    transition: 'opacity 0.15s',
  };
}

function outlineBtn(disabled = false): React.CSSProperties {
  return {
    background: '#fff',
    color: disabled ? '#9CA3AF' : '#111',
    border: `1px solid ${disabled ? '#E5E7EB' : '#E5E7EB'}`,
    padding: '0.55rem 1.25rem',
    borderRadius: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
    whiteSpace: 'nowrap' as const,
    transition: 'opacity 0.15s',
  };
}
