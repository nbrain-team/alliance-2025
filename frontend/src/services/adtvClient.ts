const BASE_URL = (import.meta as any).env?.VITE_ADTV_API_URL || '';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

async function request<T = any>(method: HttpMethod, path: string, body?: any): Promise<T> {
  const url = `${String(BASE_URL).replace(/\/$/, '')}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  } as RequestInit);

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`ADTV ${method} ${path} failed: ${res.status} ${errText}`);
  }
  return (await res.json()) as T;
}

export const adtvApi = {
  // Campaigns
  listCampaigns: () => request<any[]>('GET', '/api/campaigns'),
  createCampaign: (data: {
    name: string;
    ownerName: string;
    ownerEmail: string;
    eventType: string;
    eventDate: string;
    templateId?: string;
  }) => request<any>('POST', '/api/campaigns', data),
  getCampaignStats: (id: string) => request<any>('GET', `/api/campaigns/${id}/stats`),

  // Contacts
  bulkAddContacts: (campaignId: string, contacts: any[]) =>
    request<{ count: number }>('POST', `/api/campaigns/${campaignId}/contacts/bulk`, { contacts }),

  // Messaging
  sendSms: (payload: { to?: string; text: string; contactId?: string }) =>
    request('POST', '/api/sms/send', payload),
};

export function isAdtvConfigured(): boolean {
  return Boolean(BASE_URL);
}


