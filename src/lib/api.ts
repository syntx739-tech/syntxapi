const API_BASE_URL = (typeof window !== 'undefined' && window.localStorage.getItem('arctic-api-url'))
  || 'https://syntxapi.onrender.com';
const SESSION_STORAGE_KEY = 'arctic-admin-session';
const DEVICE_STORAGE_KEY = 'arctic-admin-device-id';

export type ApiKey = {
  id: string;
  value: string;
  plan: string;
  category: string | null;
  createdAt: string;
  expiresAt: string | null;
  status: 'active' | 'expired' | 'revoked';
  assignedTo: string | null;
  uses: number;
  maxUses: number;
};

export type ApiCategory = {
  id: string;
  name: string;
  createdAt: string;
};

export type ApiUser = {
  id: string;
  username: string;
  password: string;
  passwordSet: boolean;
  plan: string;
  status: 'active' | 'pending' | 'suspended';
  registeredAt: string;
  key: string;
};

export type GenerateKeysRequest = {
  plan: string;
  expiry: string;
  maxUses: number;
  prefix: string;
  quantity: number;
  category?: string;
};

export type RegisterRequest = {
  username: string;
  password: string;
  key: string;
  registeredAt?: string;
};

export type StaffAccount = {
  id: string;
  username: string;
  discordName: string;
  status: 'active' | 'suspended';
  createdAt: string;
  createdBy: string | null;
  deviceId: string | null;
  deviceBoundAt: string | null;
  quota: {
    entries: Array<{ plan: string; limit: number; used: number; remaining: number }>;
    totals: { used: number };
  };
};

export type ApiOrderItem = { plan: string; quantity: number };

export type ApiOrder = {
  id: string;
  username: string;
  discordName: string;
  items: ApiOrderItem[];
  createdAt: string;
  status: 'pending' | 'fulfilled' | 'rejected';
  fulfilledAt: string | null;
  rejectedAt: string | null;
  fulfilledKeys: ApiKey[];
};

export type FulfillOrderResponse = {
  order: ApiOrder;
  keys: ApiKey[];
};

export type AdminLoginResponse = {
  sessionToken: string;
  expiresAt: string;
  user: { username: string; deviceBound: boolean };
};

type ErrorBody = { error?: unknown; code?: unknown };

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
  const existing = window.localStorage.getItem(DEVICE_STORAGE_KEY);
  if (existing) return existing;

  const generated = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(DEVICE_STORAGE_KEY, generated);
  return generated;
}

function handleSessionExpired() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  window.dispatchEvent(new Event('arctic-auth-expired'));
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
    const parsed = (body && typeof body === 'object' ? body : {}) as ErrorBody;
    if (response.status === 401 && path.startsWith('/api/admin/')) handleSessionExpired();
    throw new ArcticApiError(
      typeof parsed.error === 'string' ? parsed.error : `API request failed (${response.status})`,
      response.status,
      typeof parsed.code === 'string' ? parsed.code : undefined,
    );
  }

  return body as T;
}

export const arcticApi = {
  getStoredSessionToken: getSessionToken,
  loginAdmin: (username: string, password: string) => request<AdminLoginResponse>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password, deviceId: getDeviceId() }),
  }).then((result) => {
    window.localStorage.setItem(SESSION_STORAGE_KEY, result.sessionToken);
    return result;
  }),
  getAdminSession: () => request<{ username: string; expiresAt: string; deviceBound: boolean }>('/api/admin/me'),
  logout: async () => {
    try {
      await request<void>('/api/admin/logout', { method: 'POST' });
    } finally {
      if (typeof window !== 'undefined') window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  },
  getCategories: () => request<ApiCategory[]>('/api/admin/categories'),
  createCategory: (name: string) => request<ApiCategory>('/api/admin/categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  }),
  deleteCategory: (id: string) => request<void>(`/api/admin/categories/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }),
  getKeys: () => request<ApiKey[]>('/api/admin/keys'),
  generateKeys: (payload: GenerateKeysRequest) => request<ApiKey[]>('/api/admin/keys', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  revokeKey: (id: string) => request<void>(`/api/admin/keys/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'revoked' }),
  }),
  deleteKey: (id: string) => request<void>(`/api/admin/keys/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }),
  getUsers: () => request<ApiUser[]>('/api/admin/users'),
  registerUser: (payload: RegisterRequest) => request<ApiUser>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  setUserStatus: (id: string, status: ApiUser['status']) => request<void>(`/api/admin/users/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
  getStaff: () => request<StaffAccount[]>('/api/admin/staff'),
  getOrders: () => request<ApiOrder[]>('/api/admin/orders'),
  fulfillOrder: (id: string, category?: string) => request<FulfillOrderResponse>(`/api/admin/orders/${encodeURIComponent(id)}/fulfill`, {
    method: 'POST',
    body: JSON.stringify({ category: category || '' }),
  }),
  rejectOrder: (id: string) => request<ApiOrder>(`/api/admin/orders/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'rejected' }),
  }),
  createStaff: (payload: { username: string; password: string; discordName: string }) => request<StaffAccount>('/api/admin/staff', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  setStaffStatus: (id: string, status: 'active' | 'suspended') => request<void>(`/api/admin/staff/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
  deleteStaff: (id: string) => request<void>(`/api/admin/staff/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }),
  resetStaffDevice: (id: string) => request<{ message: string }>(`/api/admin/staff/${encodeURIComponent(id)}/reset-device`, {
    method: 'POST',
  }),
};
