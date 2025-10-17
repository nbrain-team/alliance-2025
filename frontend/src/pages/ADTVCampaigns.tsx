import { useEffect, useMemo, useState } from 'react';
import { adtvApi, isAdtvConfigured } from '../services/adtvClient';

type Campaign = {
  id: string;
  name: string;
  eventType?: string;
  eventDate?: string;
  status?: string;
  totalContacts?: number;
};

export default function ADTVCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        if (!isAdtvConfigured()) {
          setError('ADTV is not configured. Set VITE_ADTV_API_URL.');
          return;
        }
        const list = await adtvApi.listCampaigns();
        if (!mounted) return;
        setCampaigns(list || []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load campaigns');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const header = useMemo(() => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
      <h2 style={{ margin: 0 }}>Alliance AI Automation</h2>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {/* Future: add create campaign modal, import contacts, etc. */}
      </div>
    </div>
  ), []);

  if (loading) return <div>Loading campaigns...</div>;
  if (error) return (
    <div>
      {header}
      <div style={{ color: 'var(--danger, #b91c1c)' }}>{error}</div>
    </div>
  );

  return (
    <div style={{ padding: '1rem', width: '100%', height: '100%', overflow: 'auto' }}>
      {header}
      <div style={{
        border: '1px solid var(--border)',
        borderRadius: 8,
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'var(--sidebar-bg)' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>Name</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>Type</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>Event Date</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>Contacts</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id}>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>{c.name}</td>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>{c.eventType || '-'}</td>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>{c.eventDate ? new Date(c.eventDate).toLocaleDateString() : '-'}</td>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>{c.status || '-'}</td>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>{c.totalContacts ?? '-'}</td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '1rem', color: 'var(--muted, #6b7280)' }}>No campaigns yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


