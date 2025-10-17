import { useEffect, useState } from 'react';

type Conversation = {
  id: string;
  channel: string;
  contact?: {
    name: string;
    email?: string;
    phone?: string;
  };
  messages: Array<{
    id: string;
    direction: 'in' | 'out';
    text: string;
    createdAt: string;
  }>;
};

export default function ADTVInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const BASE_URL = (import.meta as any).env?.VITE_ADTV_API_URL || 'https://adtv-events-server.onrender.com';
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${BASE_URL}/api/conversations`, { headers });
        if (!res.ok) throw new Error('Failed to load conversations');
        const data = await res.json();
        setConversations(data || []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load inbox');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div>Loading inbox...</div>;
  if (error) return <div style={{ color: 'var(--danger, #b91c1c)' }}>{error}</div>;

  return (
    <div style={{ padding: '1rem', width: '100%', height: '100%', overflow: 'auto' }}>
      <h2 style={{ marginBottom: '1rem' }}>Alliance AI Automation - Inbox</h2>
      <div style={{ display: 'grid', gap: '1rem' }}>
        {conversations.map((convo) => (
          <div
            key={convo.id}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '1rem',
              background: 'var(--bg)',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
              {convo.contact?.name || 'Unknown Contact'} ({convo.channel})
            </div>
            {convo.contact?.email && <div style={{ fontSize: '0.875rem', color: 'var(--muted, #6b7280)' }}>{convo.contact.email}</div>}
            {convo.contact?.phone && <div style={{ fontSize: '0.875rem', color: 'var(--muted, #6b7280)' }}>{convo.contact.phone}</div>}
            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {convo.messages.slice(0, 3).map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    padding: '0.5rem',
                    background: msg.direction === 'in' ? 'var(--sidebar-bg)' : 'var(--primary-bg, #f3f4f6)',
                    borderRadius: 4,
                    fontSize: '0.875rem',
                  }}
                >
                  <strong>{msg.direction === 'in' ? '→' : '←'}</strong> {msg.text.slice(0, 100)}
                  {msg.text.length > 100 && '...'}
                </div>
              ))}
            </div>
          </div>
        ))}
        {conversations.length === 0 && (
          <div style={{ color: 'var(--muted, #6b7280)' }}>No conversations yet.</div>
        )}
      </div>
    </div>
  );
}

