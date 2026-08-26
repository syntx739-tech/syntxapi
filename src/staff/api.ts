const API_BASE_URL = (typeof window !== 'undefined' && window.localStorage.getItem('arctic-api-url'))
  || 'https://syntxapi.onrender.com';
const SESSION_STORAGE_KEY = 'arctic-staff-session';

export type StaffQuotaEntry = {
  plan: string;
  limit: number;
  used: number;
  remaining: number;
  orderKeys: number;
};

export type StaffQuota = {
  entries: StaffQuotaEntry[];
  totals: { used: number; orderKeys: number };
};

export type StaffUser = {
  id: string;
  username: string;
  discordName: string;
  status: 'active' | 'suspended';
  createdAt: string;
  createdBy: string | null;
  quota: StaffQuota;
};

export type StaffKey = {
  id: string;
  value: string;
  plan: string;
  category?: string | null;
  createdAt: string;
  expiresAt: string | null;
  status: 'active' | 'expired' | 'revoked';
  assignedTo?: string | null;
  uses: number;
  maxUses: number;
  source: 'staff' | 'owner';
};

export type StaffOrderItem = { plan: string; quantity: number };

export type StaffOrder = {
  id: string;
  username: string;
  discordName: string;
  items: StaffOrderItem[];
  createdAt: string;
  status: 'pending' | 'fulfilled' | 'rejected';
  fulfilledAt: string | null;
  rejectedAt: string | null;
  fulfilledKeys: StaffKey[];
};

export class ArcticApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ArcticApiError';
    this.status = status;
    this.code = code;
  }
}

function getSessionToken(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(SESSION_STORAGE_KEY) ?? '';
}

function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  const existing = window.localStorage.getItem('arctic-staff-device-id');
  if (existing) return existing;
  const generated = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem('arctic-staff-device-id', generated);
  return generated;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const sessionToken = getSessionToken();
  if (sessionToken) headers.set('Authorization', `Bearer ${sessionToken}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const raw = await response.text();
  let body: unknown = null;

  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    const parsed = (body && typeof body === 'object' ? body : {}) as { error?: unknown; code?: unknown };
    if (response.status === 401 && path.startsWith('/api/staff/')) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      window.dispatchEvent(new Event('arctic-staff-expired'));
    }
    throw new ArcticApiError(
      typeof parsed.error === 'string' ? parsed.error : `API request failed (${response.status})`,
      response.status,
      typeof parsed.code === 'string' ? parsed.code : undefined,
    );
  }

  return body as T;
}

export const staffApi = {
  getStoredSessionToken: getSessionToken,
  login: (username: string, password: string) => request<{ sessionToken: string; expiresAt: string; user: StaffUser }>('/api/staff/login', {
    method: 'POST',
    body: JSON.stringify({ username, password, deviceId: getDeviceId() }),
  }).then((result) => {
    window.localStorage.setItem(SESSION_STORAGE_KEY, result.sessionToken);
    return result;
  }),
  getMe: () => request<StaffUser>('/api/staff/me'),
  logout: async () => {
    try {
      await request<void>('/api/staff/logout', { method: 'POST' });
    } finally {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  },
  getQuota: () => request<StaffQuota>('/api/staff/quota'),
  getKeys: () => request<StaffKey[]>('/api/staff/keys'),
  generateKeys: (plan: string, quantity: number) => request<StaffKey[]>('/api/staff/keys', {
    method: 'POST',
    body: JSON.stringify({ plan, quantity }),
  }),
  placeOrder: (discordName: string, items: StaffOrderItem[]) => request<{ order: StaffOrder; webhook: { sent: boolean; configured: boolean }; warning?: string }>('/api/staff/orders', {
    method: 'POST',
    body: JSON.stringify({ discordName, items }),
  }),
  getOrders: () => request<StaffOrder[]>('/api/staff/orders'),
};
