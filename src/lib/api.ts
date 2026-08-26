export const API_BASE_URL = (typeof window !== 'undefined' && window.localStorage.getItem('arctic-api-url'))
  || 'https://syntxapi.onrender.com';
const SESSION_STORAGE_KEY = 'arctic-admin-session';
const DEVICE_STORAGE_KEY = 'arctic-admin-device-id';

export type ApiKey = {
  id: string;
  value: string;
  plan: string;
  category: string | null;
  createdAt: string;
  activatedAt: string | null;
  durationDays: number | null;
  expiresAt: string | null;
  status: 'active' | 'expired' | 'revoked';
  assignedTo: string | null;
  createdBy: string;
  source: 'owner' | 'staff' | 'roulette' | 'level';
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
  passwordAvailable?: boolean;
  plan: string;
  status: 'active' | 'pending' | 'suspended';
  registeredAt: string;
  key: string;
};

export type UserArchiveEntry = {
  id: string;
  userId: string;
  username: string;
  registeredAt: string;
  key: string;
  plan: string;
  archivedAt: string;
};

export type ApiSoftware = {
  id: string;
  name: string;
  description: string;
  version: string;
  game: string;
  category: string | null;
  status: 'live' | 'draft' | 'offline';
  originalFileName: string | null;
  imageFileName: string | null;
  fileSize: number;
  downloadUrl: string | null;
  downloads: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateSoftwareRequest = {
  name: string;
  description?: string;
  version?: string;
  game?: string;
  category?: string;
  status?: 'live' | 'draft' | 'offline';
  fileData?: string;
  fileName?: string;
  fileSize?: number;
  downloadUrl?: string;
};

export type LoaderRelease = {
  id: string;
  version: string;
  notes: string;
  status: 'live' | 'draft';
  current: boolean;
  originalFileName: string | null;
  fileSize: number;
  downloads: number;
  createdAt: string;
  updatedAt: string;
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

export type StaffKeySummary = ApiKey;

export type StaffAccount = {
  id: string;
  username: string;
  discordName: string;
  status: 'active' | 'suspended';
  level: number;
  createdAt: string;
  createdBy: string | null;
  keys?: StaffKeySummary[];
  rewardKeys?: ApiKey[];
  roulette: {
    spinsUsed: number;
    spinsRemaining: number;
    dailyLimit: number;
    resetAt: string;
    enabled: boolean;
  };
  quota: {
    entries: Array<{ plan: string; limit: number; used: number; remaining: number; orderKeys: number; bonusKeys?: number; quotaBonus?: number }>;
    totals: { used: number; orderKeys: number; bonusKeys?: number };
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

  constructor(message: string, status = 0, code?: string) {
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
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const sessionToken = getSessionToken();
  if (sessionToken) headers.set('Authorization', `Bearer ${sessionToken}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch (error) {
    throw new ArcticApiError('The API could not be reached. Check the hosted API service.', 0, 'API_OFFLINE');
  }

  const raw = await response.text();
  let responseBody: unknown = null;
  if (raw) {
    try { responseBody = JSON.parse(raw); } catch { responseBody = null; }
  }

  if (!response.ok) {
    const parsed = (responseBody && typeof responseBody === 'object' ? responseBody : {}) as ErrorBody;
    if (response.status === 401 && path.startsWith('/api/admin/')) handleSessionExpired();
    throw new ArcticApiError(
      typeof parsed.error === 'string' ? parsed.error : `API request failed (${response.status})`,
      response.status,
      typeof parsed.code === 'string' ? parsed.code : undefined,
    );
  }

  return responseBody as T;
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
    try { await request<void>('/api/admin/logout', { method: 'POST' }); }
    finally { if (typeof window !== 'undefined') window.localStorage.removeItem(SESSION_STORAGE_KEY); }
  },
  getCategories: () => request<ApiCategory[]>('/api/admin/categories'),
  createCategory: (name: string) => request<ApiCategory>('/api/admin/categories', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteCategory: (id: string) => request<void>(`/api/admin/categories/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getKeys: () => request<ApiKey[]>('/api/admin/keys'),
  generateKeys: (payload: GenerateKeysRequest) => request<ApiKey[]>('/api/admin/keys', { method: 'POST', body: JSON.stringify(payload) }),
  revokeKey: (id: string) => request<void>(`/api/admin/keys/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'revoked' }) }),
  deleteKey: (id: string) => request<void>(`/api/admin/keys/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getUsers: () => request<ApiUser[]>('/api/admin/users'),
  getUserPassword: (id: string) => request<{ username: string; password: string | null; recoverable: boolean }>(`/api/admin/users/${encodeURIComponent(id)}/password`),
  getUserArchive: () => request<UserArchiveEntry[]>('/api/admin/user-archive'),
  registerUser: (payload: RegisterRequest) => request<ApiUser>('/api/admin/users', { method: 'POST', body: JSON.stringify(payload) }),
  setUserStatus: (id: string, status: ApiUser['status']) => request<void>(`/api/admin/users/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getStaff: () => request<StaffAccount[]>('/api/admin/staff'),
  createStaff: (payload: { username: string; password: string; discordName: string; level?: number }) => request<StaffAccount & { rewardKeys?: ApiKey[] }>('/api/admin/staff', { method: 'POST', body: JSON.stringify(payload) }),
  setStaffStatus: (id: string, status: 'active' | 'suspended') => request<void>(`/api/admin/staff/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  setStaffLevel: (id: string, level: number) => request<{ staff: StaffAccount; rewardKeys: ApiKey[] }>(`/api/admin/staff/${encodeURIComponent(id)}/level`, { method: 'PATCH', body: JSON.stringify({ level }) }),
  setStaffQuota: (id: string, plan: string, amount: number) => request<{ staff: StaffAccount }>(`/api/admin/staff/${encodeURIComponent(id)}/quota`, { method: 'PATCH', body: JSON.stringify({ plan, amount }) }),
  deleteStaff: (id: string) => request<void>(`/api/admin/staff/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  resetStaffDevice: (id: string) => request<{ message: string }>(`/api/admin/staff/${encodeURIComponent(id)}/reset-device`, { method: 'POST' }),
  getOrders: () => request<ApiOrder[]>('/api/admin/orders'),
  fulfillOrder: (id: string, category?: string) => request<FulfillOrderResponse>(`/api/admin/orders/${encodeURIComponent(id)}/fulfill`, { method: 'POST', body: JSON.stringify({ category: category || '' }) }),
  rejectOrder: (id: string) => request<ApiOrder>(`/api/admin/orders/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'rejected' }) }),
  getSoftware: () => request<ApiSoftware[]>('/api/admin/software'),
  createSoftware: (payload: CreateSoftwareRequest) => request<ApiSoftware>('/api/admin/software', { method: 'POST', body: JSON.stringify(payload) }),
  updateSoftware: (id: string, payload: Partial<CreateSoftwareRequest>) => request<ApiSoftware>(`/api/admin/software/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteSoftware: (id: string) => request<void>(`/api/admin/software/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getLoaderReleases: () => request<LoaderRelease[]>('/api/admin/loader/releases'),
  createLoaderRelease: (payload: { version: string; notes?: string; fileData: string; fileName: string; current: boolean }) => request<LoaderRelease>('/api/admin/loader/releases', { method: 'POST', body: JSON.stringify(payload) }),
  setCurrentLoaderRelease: (id: string) => request<LoaderRelease>(`/api/admin/loader/releases/${encodeURIComponent(id)}/current`, { method: 'PATCH', body: JSON.stringify({}) }),
  deleteLoaderRelease: (id: string) => request<void>(`/api/admin/loader/releases/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
