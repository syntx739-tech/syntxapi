import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadLocalEnv() {
  const envFile = path.join(__dirname, 'local.env');
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadLocalEnv();

const PORT = Number(process.env.PORT || 5000) || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_FILE = process.env.ARCTIC_DATA_FILE || path.join(__dirname, 'data', 'arctic-data.json');
const ADMIN_USERNAME = process.env.ARCTIC_ADMIN_USERNAME || 'user42';
const ADMIN_PASSWORD = process.env.ARCTIC_ADMIN_PASSWORD || '';
const DISCORD_WEBHOOK_URL = process.env.ARCTIC_DISCORD_WEBHOOK_URL || '';
const STAFF_ORDER_WEBHOOK_URL = process.env.ARCTIC_STAFF_ORDER_WEBHOOK_URL || '';
const PUBLIC_API_URL = (process.env.ARCTIC_PUBLIC_API_URL || `http://${HOST}:${PORT}`).replace(/\/$/, '');
const ALLOWED_ORIGIN = process.env.ARCTIC_ALLOWED_ORIGIN || '*';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — the browser stays logged in
const RESET_TTL_MS = 10 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_ATTEMPT_LIMIT = 8;

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });

function loadData() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return {
      keys: Array.isArray(data.keys) ? data.keys : [],
      users: Array.isArray(data.users) ? data.users : [],
      staffUsers: Array.isArray(data.staffUsers) ? data.staffUsers : [],
      categories: Array.isArray(data.categories) ? data.categories : [],
      orders: Array.isArray(data.orders) ? data.orders : [],
      admin: data.admin && typeof data.admin === 'object' ? data.admin : null,
      resetRequests: Array.isArray(data.resetRequests) ? data.resetRequests : [],
    };
  } catch {
    return { keys: [], users: [], staffUsers: [], categories: [], orders: [], admin: null, resetRequests: [] };
  }
}

let database = loadData();
const sessions = new Map();
const staffSessions = new Map();
const loginAttempts = new Map();

// ── Session persistence ───────────────────────────────────────────────────
const SESSIONS_FILE = path.join(path.dirname(DATA_FILE), 'arctic-sessions.json');

function loadSessions() {
  try {
    const raw = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
    const now = Date.now();
    if (raw.admin && Array.isArray(raw.admin)) {
      for (const [token, session] of raw.admin) {
        if (session.expiresAt > now) sessions.set(token, session);
      }
    }
    if (raw.staff && Array.isArray(raw.staff)) {
      for (const [token, session] of raw.staff) {
        if (session.expiresAt > now) staffSessions.set(token, session);
      }
    }
    console.log(`Restored ${sessions.size} admin session(s), ${staffSessions.size} staff session(s) from disk.`);
  } catch {
    // No sessions file yet — that's fine.
  }
}

function persistSessions() {
  const temporary = `${SESSIONS_FILE}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify({
    admin: [...sessions.entries()],
    staff: [...staffSessions.entries()],
  }), 'utf8');
  fs.renameSync(temporary, SESSIONS_FILE);
}

loadSessions();

// Staff key plan configuration.
// Each staff account can generate up to these amounts per plan.
const STAFF_KEY_QUOTA = {
  '1 Day': 5,
  '7 Days': 3,
  '30 Days': 2,
  '90 Days': 1,
  '1 Year': 1,
  'Lifetime': 1,
};

// Expiry in days per staff plan. Lifetime has no expiry.
const STAFF_PLAN_DAYS = {
  '1 Day': 1,
  '7 Days': 7,
  '30 Days': 30,
  '90 Days': 90,
  '1 Year': 365,
  'Lifetime': null,
};

function saveData() {
  const temporary = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(database, null, 2), 'utf8');
  fs.renameSync(temporary, DATA_FILE);
}

function json(response, status, body) {
  response.writeHead(status, {
    ...corsHeaders(),
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(body));
}

function html(response, status, body) {
  response.writeHead(status, {
    ...corsHeaders(),
    'Content-Type': 'text/html; charset=utf-8',
  });
  response.end(body);
}

function empty(response, status = 204) {
  response.writeHead(status, corsHeaders());
  response.end();
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Vary': 'Origin',
  };
}

function body(request) {
  return new Promise((resolve, reject) => {
    let raw = '';
    request.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 128 * 1024) request.destroy(new Error('Request body too large.'));
    });
    request.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error('Invalid JSON')); }
    });
    request.on('error', reject);
  });
}

function id(prefix) {
  return `${prefix}-${crypto.randomBytes(8).toString('hex')}`;
}

function randomSegment(length = 4) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(length);
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join('');
}

const PLAN_CODES = {
  '1 Day': '1DAY',
  '7 Days': '7DAY',
  '30 Days': '30DAY',
  '90 Days': '90DAY',
  '1 Year': '1YEAR',
  'Lifetime': 'LIFE',
  'Team': 'TEAM',
  'Trial': 'TRIAL',
};

function generateKey(prefix = 'ARC', plan = 'Lifetime') {
  const cleanPrefix = String(prefix).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'ARC';
  const code = PLAN_CODES[plan] || 'PRO';
  return `${cleanPrefix}-${code}-${randomSegment()}-${randomSegment()}`;
}

function hashPassword(password, salt = crypto.randomBytes(16)) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256');
  return `pbkdf2-sha256$120000$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function verifyPassword(password, encoded) {
  const parts = String(encoded || '').split('$');
  if (parts.length !== 4) return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations)) return false;
  const salt = Buffer.from(parts[2], 'base64');
  const expected = Buffer.from(parts[3], 'base64');
  const actual = crypto.pbkdf2Sync(password, salt, iterations, expected.length, 'sha256');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function expiryFrom(value, createdAt) {
  if (!value || value === 'lifetime') return null;
  const days = Number(value);
  return Number.isFinite(days) && days > 0
    ? new Date(new Date(createdAt).getTime() + days * 86400000).toISOString()
    : null;
}

function publicUser(user, key) {
  return {
    id: user.id,
    username: user.username,
    password: '********',
    passwordSet: true,
    plan: key?.plan || 'Unknown',
    status: user.status,
    registeredAt: user.registeredAt,
    key: key?.value || '',
  };
}

function publicKey(key, user) {
  const allocatedStaff = key.allocatedToStaffId
    ? database.staffUsers.find((staffUser) => staffUser.id === key.allocatedToStaffId)
    : null;
  return {
    id: key.id,
    value: key.value,
    plan: key.plan,
    category: key.category || null,
    createdAt: key.createdAt,
    expiresAt: key.expiresAt,
    status: key.status,
    assignedTo: user?.username || allocatedStaff?.username || null,
    uses: key.uses,
    maxUses: key.maxUses,
    source: key.generatedByStaffId ? 'staff' : 'owner',
  };
}

function publicOrder(order, includeFulfilledKeys = false) {
  const result = {
    id: order.id,
    username: order.username,
    discordName: order.discordName,
    items: order.items,
    createdAt: order.createdAt,
    status: order.status || 'pending',
    fulfilledAt: order.fulfilledAt || null,
    rejectedAt: order.rejectedAt || null,
  };
  if (includeFulfilledKeys) {
    const keyIds = Array.isArray(order.fulfilledKeyIds) ? order.fulfilledKeyIds : [];
    result.fulfilledKeys = keyIds
      .map((keyId) => database.keys.find((key) => key.id === keyId))
      .filter(Boolean)
      .map((key) => publicKey(key, null));
  }
  return result;
}

function findKey(value) {
  return database.keys.find((key) => key.value === String(value || '').trim());
}

function registerUser(input) {
  const username = String(input.username || '').trim();
  const password = String(input.password || '');
  const keyValue = String(input.key || '').trim();
  if (!username || !password || !keyValue) return { error: 'Username, password, and license key are required.' };

  const key = findKey(keyValue);
  if (!key) return { error: 'License key is invalid.' };
  if (key.status !== 'active') return { error: 'License key is not active.' };
  if (key.assignedUserId) return { error: 'License key is already assigned to a user.' };
  if (key.expiresAt && new Date(key.expiresAt) <= new Date()) return { error: 'License key has expired.' };
  if (database.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) return { error: 'Username is already registered.' };

  const user = {
    id: id('user'),
    username,
    passwordHash: hashPassword(password),
    registeredAt: input.registeredAt || new Date().toISOString(),
    status: 'active',
    keyId: key.id,
  };
  database.users.unshift(user);
  key.assignedUserId = user.id;
  key.uses += 1;
  saveData();
  return { user: publicUser(user, key) };
}

function ensureAdminRecord() {
  if (database.admin?.passwordHash) return;
  if (!ADMIN_PASSWORD) {
    console.warn('Admin login is not configured. Create server/local.env with ARCTIC_ADMIN_PASSWORD.');
    return;
  }
  database.admin = {
    username: ADMIN_USERNAME,
    passwordHash: hashPassword(ADMIN_PASSWORD),
    deviceId: null,
    deviceBoundAt: null,
  };
  saveData();
}

function clientAddress(request) {
  return String(request.headers['x-forwarded-for'] || request.socket.remoteAddress || 'unknown').split(',')[0].trim();
}

function rateLimitKey(request, username) {
  return `${clientAddress(request)}:${username.toLowerCase()}`;
}

function isLoginRateLimited(key) {
  const entry = loginAttempts.get(key);
  if (!entry) return false;
  if (entry.resetAt <= Date.now()) {
    loginAttempts.delete(key);
    return false;
  }
  return entry.count >= LOGIN_ATTEMPT_LIMIT;
}

function recordLoginFailure(key) {
  const current = loginAttempts.get(key);
  if (!current || current.resetAt <= Date.now()) {
    loginAttempts.set(key, { count: 1, resetAt: Date.now() + LOGIN_WINDOW_MS });
    return;
  }
  current.count += 1;
}

function clearLoginFailures(key) {
  loginAttempts.delete(key);
}

function readSessionToken(request) {
  const authorization = String(request.headers.authorization || '');
  if (authorization.toLowerCase().startsWith('bearer ')) return authorization.slice(7).trim();
  return String(request.headers['x-admin-token'] || '').trim();
}

function getAdminSession(request) {
  const token = readSessionToken(request);
  if (!token) return null;
  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  if (!database.admin?.deviceId || session.deviceId !== database.admin.deviceId) return null;
  return { token, ...session };
}

function adminAuthorized(request) {
  return Boolean(getAdminSession(request));
}

function readStaffToken(request) {
  const authorization = String(request.headers.authorization || '');
  if (authorization.toLowerCase().startsWith('bearer ')) return authorization.slice(7).trim();
  return String(request.headers['x-staff-token'] || '').trim();
}

function getStaffSession(request) {
  const token = readStaffToken(request);
  if (!token) return null;
  const session = staffSessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    staffSessions.delete(token);
    return null;
  }
  return { token, ...session };
}

function staffAuthorized(request) {
  return Boolean(getStaffSession(request));
}

function findStaffUser(username) {
  return database.staffUsers.find((user) => user.username.toLowerCase() === String(username || '').toLowerCase());
}

function publicStaffUser(user) {
  return {
    id: user.id,
    username: user.username,
    discordName: user.discordName || '',
    status: user.status,
    createdAt: user.createdAt,
    createdBy: user.createdBy || null,
    quota: staffQuota(user.id),
  };
}

// Keys generated by this staff user, grouped by plan.
function staffUsedQuota(staffId) {
  const counts = {};
  for (const key of database.keys) {
    if (key.generatedByStaffId === staffId && key.plan) {
      counts[key.plan] = (counts[key.plan] || 0) + 1;
    }
  }
  return counts;
}

function staffQuota(staffId) {
  const used = staffUsedQuota(staffId);
  const entries = Object.entries(STAFF_KEY_QUOTA).map(([plan, limit]) => ({
    plan,
    limit,
    used: used[plan] || 0,
    remaining: Math.max(limit - (used[plan] || 0), 0),
  }));
  return { entries, totals: { used: Object.values(used).reduce((sum, value) => sum + value, 0) } };
}

async function sendStaffOrderWebhook(order) {
  if (!STAFF_ORDER_WEBHOOK_URL) return { sent: false, configured: false };
  const itemLines = order.items
    .map((item) => `${item.quantity}x ${item.plan} keys`)
    .join('\n');
  const payload = {
    content: `@everyone\n**${order.username}**   ${itemLines}`,
  };
  try {
    const response = await fetch(STAFF_ORDER_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify(payload),
    });
    return { sent: response.ok, configured: true };
  } catch {
    return { sent: false, configured: true };
  }
}

function staffPlanExpiry(plan, createdAt) {
  const days = STAFF_PLAN_DAYS[plan];
  if (days == null) return null;
  return new Date(new Date(createdAt).getTime() + days * 86400000).toISOString();
}

async function handleStaffLogin(request, response) {
  const input = await body(request);
  const username = String(input.username || '').trim();
  const password = String(input.password || '');
  const user = findStaffUser(username);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return json(response, 401, { error: 'Invalid staff credentials.', code: 'INVALID_CREDENTIALS' });
  }
  if (user.status !== 'active') {
    return json(response, 403, { error: 'This staff account is not active.', code: 'STAFF_SUSPENDED' });
  }
  const sessionToken = crypto.randomBytes(32).toString('base64url');
  staffSessions.set(sessionToken, { userId: user.id, username: user.username, expiresAt: Date.now() + SESSION_TTL_MS });
  persistSessions();
  return json(response, 200, {
    sessionToken,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    user: publicStaffUser(user),
  });
}

async function sendDeviceResetWebhook(username, token) {
  if (!DISCORD_WEBHOOK_URL || !PUBLIC_API_URL) return false;
  const approvalUrl = `${PUBLIC_API_URL}/api/admin/device-reset/approve?token=${encodeURIComponent(token)}`;
  const payload = {
    content: `ARCTIC device reset requested for admin ${username}.`,
    embeds: [{
      title: 'ARCTIC admin device reset',
      description: 'Approve this one-time request only if you initiated it.',
      color: 5814783,
      fields: [{ name: 'Account', value: username, inline: true }, { name: 'Expires', value: '10 minutes', inline: true }],
    }],
    components: [{
      type: 1,
      components: [{ type: 2, style: 5, label: 'Approve device reset', url: approvalUrl }],
    }],
  };

  const webhookUrl = DISCORD_WEBHOOK_URL.includes('?')
    ? `${DISCORD_WEBHOOK_URL}&with_components=true`
    : `${DISCORD_WEBHOOK_URL}?with_components=true`;
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.ok;
}

async function createDeviceResetRequest(username, deviceId) {
  if (!DISCORD_WEBHOOK_URL || !PUBLIC_API_URL) return { sent: false, configured: false };
  const token = crypto.randomBytes(32).toString('hex');
  database.resetRequests = database.resetRequests.filter((item) => item.expiresAt > Date.now() && !item.usedAt);
  database.resetRequests.push({
    tokenHash: sha256(token),
    username,
    deviceId,
    createdAt: Date.now(),
    expiresAt: Date.now() + RESET_TTL_MS,
    usedAt: null,
  });
  saveData();

  try {
    const sent = await sendDeviceResetWebhook(username, token);
    if (!sent) {
      database.resetRequests = database.resetRequests.filter((item) => item.tokenHash !== sha256(token));
      saveData();
    }
    return { sent, configured: true };
  } catch {
    database.resetRequests = database.resetRequests.filter((item) => item.tokenHash !== sha256(token));
    saveData();
    return { sent: false, configured: true };
  }
}

function resetApprovalPage(title, message, success) {
  const color = success ? '#34d399' : '#f87171';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ARCTIC device reset</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#08080a;color:#f8fafc;font:16px system-ui,sans-serif}.panel{max-width:520px;margin:24px;padding:32px;border:1px solid #2a2a32;border-radius:12px;background:#101015;text-align:center}h1{color:${color};font-size:22px}p{color:#a1a1aa;line-height:1.6}</style></head><body><main class="panel"><h1>${title}</h1><p>${message}</p></main></body></html>`;
}

async function handleAdminLogin(request, response) {
  const input = await body(request);
  const username = String(input.username || '').trim();
  const password = String(input.password || '');
  const deviceId = String(input.deviceId || '').trim();
  const attemptKey = rateLimitKey(request, username || 'unknown');

  if (isLoginRateLimited(attemptKey)) {
    return json(response, 429, { error: 'Too many login attempts. Try again later.', code: 'RATE_LIMITED' });
  }
  if (!database.admin?.passwordHash) {
    return json(response, 503, { error: 'Admin login is not configured on the API server.', code: 'ADMIN_NOT_CONFIGURED' });
  }
  if (!username || !password || !deviceId || username.toLowerCase() !== String(database.admin.username).toLowerCase() || !verifyPassword(password, database.admin.passwordHash)) {
    recordLoginFailure(attemptKey);
    return json(response, 401, { error: 'Invalid admin credentials.', code: 'INVALID_CREDENTIALS' });
  }
  clearLoginFailures(attemptKey);

  if (!database.admin.deviceId) {
    database.admin.deviceId = deviceId;
    database.admin.deviceBoundAt = new Date().toISOString();
    saveData();
  } else if (database.admin.deviceId !== deviceId) {
    const reset = await createDeviceResetRequest(database.admin.username, deviceId);
    if (!reset.sent) {
      return json(response, 423, {
        error: reset.configured
          ? 'This browser is not authorized and the Discord reset message could not be sent.'
          : 'This browser is not authorized. Configure the Discord reset webhook on the API server.',
        code: reset.configured ? 'RESET_DELIVERY_FAILED' : 'RESET_NOT_CONFIGURED',
      });
    }
    return json(response, 423, { error: 'This browser is not authorized. A reset approval link was sent to Discord.', code: 'DEVICE_LOCKED' });
  }

  const sessionToken = crypto.randomBytes(32).toString('base64url');
  sessions.set(sessionToken, { username: database.admin.username, deviceId, expiresAt: Date.now() + SESSION_TTL_MS });
  persistSessions();
  return json(response, 200, {
    sessionToken,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    user: { username: database.admin.username, deviceBound: true },
  });
}

async function handle(request, response) {
  if (request.method === 'OPTIONS') return empty(response);
  const url = new URL(request.url, `http://${HOST}:${PORT}`);
  const pathname = url.pathname;

  if (request.method === 'GET' && pathname === '/api/health') {
    return json(response, 200, { status: 'ok', service: 'arctic-api', utc: new Date().toISOString() });
  }

  if (request.method === 'POST' && pathname === '/api/admin/login') {
    return handleAdminLogin(request, response);
  }

  if (request.method === 'POST' && pathname === '/api/staff/login') {
    return handleStaffLogin(request, response);
  }

  if (pathname.startsWith('/api/staff/') && !staffAuthorized(request)) {
    return json(response, 401, { error: 'Staff login required.', code: 'STAFF_LOGIN_REQUIRED' });
  }

  if (request.method === 'GET' && pathname === '/api/admin/device-reset/approve') {
    const token = String(url.searchParams.get('token') || '');
    const requestItem = database.resetRequests.find((item) => item.tokenHash === sha256(token) && !item.usedAt);
    if (!requestItem || requestItem.expiresAt <= Date.now()) {
      return html(response, 410, resetApprovalPage('Link expired', 'This device reset link is no longer valid.', false));
    }
    database.admin.deviceId = null;
    database.admin.deviceBoundAt = null;
    requestItem.usedAt = Date.now();
    database.resetRequests = database.resetRequests.filter((item) => item !== requestItem);
    saveData();
    return html(response, 200, resetApprovalPage('Device reset approved', 'The next successful login will bind the new browser device.', true));
  }

  if (pathname.startsWith('/api/admin/') && !adminAuthorized(request)) {
    return json(response, 401, { error: 'Admin login required.', code: 'ADMIN_LOGIN_REQUIRED' });
  }

  try {
    if (request.method === 'POST' && pathname === '/api/admin/logout') {
      const session = getAdminSession(request);
      if (session) { sessions.delete(session.token); persistSessions(); }
      return empty(response);
    }

    // ── Staff endpoints ────────────────────────────────────────────────────

    if (request.method === 'POST' && pathname === '/api/staff/logout') {
      const session = getStaffSession(request);
      if (session) { staffSessions.delete(session.token); persistSessions(); }
      return empty(response);
    }

    if (request.method === 'GET' && pathname === '/api/staff/me') {
      const session = getStaffSession(request);
      const user = database.staffUsers.find((item) => item.id === session.userId);
      if (!user) return json(response, 401, { error: 'Staff account no longer exists.', code: 'STAFF_GONE' });
      return json(response, 200, publicStaffUser(user));
    }

    if (request.method === 'GET' && pathname === '/api/staff/quota') {
      const session = getStaffSession(request);
      const user = database.staffUsers.find((item) => item.id === session.userId);
      return json(response, 200, publicStaffUser(user).quota);
    }

    if (request.method === 'GET' && pathname === '/api/staff/keys') {
      const session = getStaffSession(request);
      const keys = database.keys
        .filter((key) => key.generatedByStaffId === session.userId || key.allocatedToStaffId === session.userId)
        .map((key) => publicKey(key, null));
      return json(response, 200, keys);
    }

    if (request.method === 'POST' && pathname === '/api/staff/keys') {
      const session = getStaffSession(request);
      const user = database.staffUsers.find((item) => item.id === session.userId);
      if (!user) return json(response, 401, { error: 'Staff account no longer exists.', code: 'STAFF_GONE' });
      if (user.status !== 'active') return json(response, 403, { error: 'This staff account is not active.', code: 'STAFF_SUSPENDED' });

      const input = await body(request);
      const plan = String(input.plan || '');
      const quantity = Math.max(1, Number(input.quantity) || 1);
      const limit = STAFF_KEY_QUOTA[plan];
      if (limit == null) return json(response, 400, { error: 'This key plan is not available to staff.', code: 'INVALID_PLAN' });

      const used = staffUsedQuota(user.id)[plan] || 0;
      const remaining = Math.max(limit - used, 0);
      if (quantity > remaining) {
        return json(response, 400, {
          error: `Quota exceeded for ${plan}: ${used}/${limit} used, only ${remaining} remaining.`,
          code: 'QUOTA_EXCEEDED',
        });
      }

      const createdAt = new Date().toISOString();
      const generated = Array.from({ length: quantity }, () => {
        let value;
        do { value = generateKey('ARC', plan); } while (findKey(value));
        return {
          id: id('key'), value, plan, createdAt,
          expiresAt: staffPlanExpiry(plan, createdAt), status: 'active',
          assignedUserId: null, uses: 0, maxUses: 1,
          generatedByStaffId: user.id,
        };
      });
      database.keys.unshift(...generated);
      saveData();
      return json(response, 200, generated.map((key) => publicKey(key, null)));
    }

    if (request.method === 'POST' && pathname === '/api/staff/orders') {
      const session = getStaffSession(request);
      const user = database.staffUsers.find((item) => item.id === session.userId);
      if (!user) return json(response, 401, { error: 'Staff account no longer exists.', code: 'STAFF_GONE' });
      if (user.status !== 'active') return json(response, 403, { error: 'This staff account is not active.', code: 'STAFF_SUSPENDED' });

      const input = await body(request);
      const discordName = String(input.discordName || '').trim();
      const rawItems = Array.isArray(input.items) ? input.items : [];
      const items = rawItems
        .map((item) => ({
          plan: String(item.plan || ''),
          quantity: Math.max(1, Number(item.quantity) || 1),
        }))
        .filter((item) => STAFF_KEY_QUOTA[item.plan] != null);

      if (!discordName || items.length === 0) {
        return json(response, 400, { error: 'Discord name and at least one item are required.', code: 'INVALID_ORDER' });
      }

      const order = {
        id: id('order'),
        userId: user.id,
        username: user.username,
        discordName,
        items,
        createdAt: new Date().toISOString(),
        status: 'pending',
        fulfilledAt: null,
        rejectedAt: null,
        fulfilledKeyIds: [],
      };
      if (!database.orders) database.orders = [];
      database.orders.unshift(order);
      saveData();

      const result = await sendStaffOrderWebhook(order);
      if (!result.sent) {
        return json(response, 200, {
          order: publicOrder(order, true),
          webhook: { sent: false, configured: result.configured },
          warning: result.configured
            ? 'Bestellung gespeichert, aber die Discord-Nachricht konnte nicht gesendet werden.'
            : 'Bestellung gespeichert. Discord-Webhook ist auf dem Server nicht konfiguriert.',
        });
      }
      return json(response, 200, { order: publicOrder(order, true), webhook: { sent: true, configured: true } });
    }

    if (request.method === 'GET' && pathname === '/api/staff/orders') {
      const session = getStaffSession(request);
      const orders = (database.orders || [])
        .filter((order) => order.userId === session.userId)
        .map((order) => publicOrder(order, true));
      return json(response, 200, orders);
    }

    // ── Admin staff management ─────────────────────────────────────────────

    if (request.method === 'GET' && pathname === '/api/admin/staff') {
      return json(response, 200, database.staffUsers.map(publicStaffUser));
    }

    if (request.method === 'POST' && pathname === '/api/admin/staff') {
      const adminSession = getAdminSession(request);
      const input = await body(request);
      const username = String(input.username || '').trim();
      const password = String(input.password || '');
      const discordName = String(input.discordName || '').trim();
      if (!username || !password) return json(response, 400, { error: 'Username and password are required.', code: 'INVALID_STAFF' });
      if (findStaffUser(username)) return json(response, 400, { error: 'A staff account with this username already exists.', code: 'STAFF_EXISTS' });
      if (database.users.some((item) => item.username.toLowerCase() === username.toLowerCase())) {
        return json(response, 400, { error: 'This username is already used by a loader user.', code: 'STAFF_EXISTS' });
      }
      const user = {
        id: id('staff'),
        username,
        passwordHash: hashPassword(password),
        discordName,
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: adminSession?.username || null,
      };
      database.staffUsers.unshift(user);
      saveData();
      return json(response, 200, publicStaffUser(user));
    }

    const staffStatus = pathname.match(/^\/api\/admin\/staff\/([^/]+)\/status$/);
    if (request.method === 'PATCH' && staffStatus) {
      const user = database.staffUsers.find((item) => item.id === decodeURIComponent(staffStatus[1]));
      if (!user) return json(response, 404, { error: 'Staff account not found.' });
      const input = await body(request);
      if (!['active', 'suspended'].includes(input.status)) return json(response, 400, { error: 'Invalid staff status.' });
      user.status = input.status;
      saveData();
      return empty(response);
    }

    const staffDelete = pathname.match(/^\/api\/admin\/staff\/([^/]+)$/);
    if (request.method === 'DELETE' && staffDelete) {
      const index = database.staffUsers.findIndex((item) => item.id === decodeURIComponent(staffDelete[1]));
      if (index < 0) return json(response, 404, { error: 'Staff account not found.' });
      database.staffUsers.splice(index, 1);
      saveData();
      return empty(response);
    }

    if (request.method === 'GET' && pathname === '/api/admin/me') {
      const session = getAdminSession(request);
      return json(response, 200, { username: session.username, expiresAt: new Date(session.expiresAt).toISOString(), deviceBound: true });
    }

    if (request.method === 'POST' && pathname === '/api/auth/register') {
      const result = registerUser(await body(request));
      return result.error ? json(response, 400, result) : json(response, 200, result.user);
    }

    if (request.method === 'POST' && pathname === '/api/auth/login') {
      const input = await body(request);
      const username = String(input.username || '').trim();
      const key = findKey(input.key);
      const user = database.users.find((item) => item.username.toLowerCase() === username.toLowerCase());
      const valid = user && key && user.keyId === key.id && user.status === 'active' && key.status === 'active'
        && (!key.expiresAt || new Date(key.expiresAt) > new Date()) && verifyPassword(String(input.password || ''), user.passwordHash);
      if (!valid) return json(response, 401, { error: 'Invalid credentials.' });
      return json(response, 200, { user: publicUser(user, key), sessionToken: crypto.randomBytes(32).toString('base64') });
    }

    // ── Admin order management ───────────────────────────────────────────────

    if (request.method === 'GET' && pathname === '/api/admin/orders') {
      return json(response, 200, (database.orders || []).map((order) => publicOrder(order, true)));
    }

    const orderFulfill = pathname.match(/^\/api\/admin\/orders\/([^/]+)\/fulfill$/);
    if (request.method === 'POST' && orderFulfill) {
      const order = (database.orders || []).find((item) => item.id === decodeURIComponent(orderFulfill[1]));
      if (!order) return json(response, 404, { error: 'Order not found.', code: 'ORDER_NOT_FOUND' });
      if ((order.status || 'pending') !== 'pending') return json(response, 409, { error: 'Only pending orders can be fulfilled.', code: 'ORDER_ALREADY_HANDLED' });

      const staffUser = database.staffUsers.find((item) => item.id === order.userId);
      if (!staffUser) return json(response, 400, { error: 'The staff account for this order no longer exists.', code: 'STAFF_GONE' });

      const input = await body(request);
      const category = String(input.category || '').trim() || null;
      if (category && !database.categories.some((item) => item.name === category)) {
        return json(response, 400, { error: 'Selected category does not exist.', code: 'INVALID_CATEGORY' });
      }

      const createdAt = new Date().toISOString();
      const generated = [];
      for (const item of order.items) {
        const plan = String(item.plan || '');
        const quantity = Math.max(1, Number(item.quantity) || 1);
        if (STAFF_PLAN_DAYS[plan] === undefined) {
          return json(response, 400, { error: `Unsupported order plan: ${plan}.`, code: 'INVALID_PLAN' });
        }
        for (let index = 0; index < quantity; index += 1) {
          let value;
          do { value = generateKey('ARC', plan); } while (findKey(value));
          generated.push({
            id: id('key'),
            value,
            plan,
            createdAt,
            expiresAt: staffPlanExpiry(plan, createdAt),
            status: 'active',
            assignedUserId: null,
            allocatedToStaffId: staffUser.id,
            generatedByStaffId: null,
            uses: 0,
            maxUses: 1,
            category,
            orderId: order.id,
          });
        }
      }

      database.keys.unshift(...generated);
      order.status = 'fulfilled';
      order.fulfilledAt = createdAt;
      order.rejectedAt = null;
      order.fulfilledKeyIds = generated.map((key) => key.id);
      saveData();
      return json(response, 200, {
        order: publicOrder(order, true),
        keys: generated.map((key) => publicKey(key, null)),
      });
    }

    const orderStatus = pathname.match(/^\/api\/admin\/orders\/([^/]+)\/status$/);
    if (request.method === 'PATCH' && orderStatus) {
      const order = (database.orders || []).find((item) => item.id === decodeURIComponent(orderStatus[1]));
      if (!order) return json(response, 404, { error: 'Order not found.', code: 'ORDER_NOT_FOUND' });
      const input = await body(request);
      if (input.status !== 'rejected') return json(response, 400, { error: 'Only rejection is supported for this order action.', code: 'INVALID_ORDER_STATUS' });
      if ((order.status || 'pending') !== 'pending') return json(response, 409, { error: 'Only pending orders can be rejected.', code: 'ORDER_ALREADY_HANDLED' });
      order.status = 'rejected';
      order.rejectedAt = new Date().toISOString();
      saveData();
      return json(response, 200, publicOrder(order, true));
    }

    // ── Admin key categories ────────────────────────────────────────────────

    if (request.method === 'GET' && pathname === '/api/admin/categories') {
      return json(response, 200, database.categories);
    }

    if (request.method === 'POST' && pathname === '/api/admin/categories') {
      const input = await body(request);
      const name = String(input.name || '').trim();
      if (!name) return json(response, 400, { error: 'Category name is required.', code: 'INVALID_CATEGORY' });
      if (database.categories.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
        return json(response, 400, { error: 'A category with this name already exists.', code: 'CATEGORY_EXISTS' });
      }
      const category = { id: id('category'), name, createdAt: new Date().toISOString() };
      database.categories.push(category);
      saveData();
      return json(response, 200, category);
    }

    const categoryDelete = pathname.match(/^\/api\/admin\/categories\/([^/]+)$/);
    if (request.method === 'DELETE' && categoryDelete) {
      const index = database.categories.findIndex((item) => item.id === decodeURIComponent(categoryDelete[1]));
      if (index < 0) return json(response, 404, { error: 'Category not found.' });
      database.categories.splice(index, 1);
      saveData();
      return empty(response);
    }

    if (request.method === 'GET' && pathname === '/api/admin/keys') {
      return json(response, 200, database.keys.map((key) => publicKey(key, database.users.find((user) => user.id === key.assignedUserId))));
    }

    if (request.method === 'POST' && pathname === '/api/admin/keys') {
      const input = await body(request);
      const quantity = Math.max(1, Number(input.quantity) || 1);
      const createdAt = new Date().toISOString();
      const category = String(input.category || '').trim() || null;
      const generated = Array.from({ length: quantity }, () => {
        let value;
        do { value = generateKey(input.prefix, input.plan); } while (findKey(value));
        return {
          id: id('key'), value, plan: input.plan || 'Lifetime', createdAt,
          expiresAt: expiryFrom(input.expiry, createdAt), status: 'active',
          assignedUserId: null, uses: 0, maxUses: Math.max(1, Number(input.maxUses) || 1),
          category,
        };
      });
      database.keys.unshift(...generated);
      saveData();
      return json(response, 200, generated.map((key) => publicKey(key, null)));
    }

    const keyStatus = pathname.match(/^\/api\/admin\/keys\/([^/]+)\/status$/);
    if (request.method === 'PATCH' && keyStatus) {
      const key = database.keys.find((item) => item.id === decodeURIComponent(keyStatus[1]));
      if (!key) return json(response, 404, { error: 'License key not found.' });
      const input = await body(request);
      if (!['active', 'expired', 'revoked'].includes(input.status)) return json(response, 400, { error: 'Invalid key status.' });
      key.status = input.status;
      saveData();
      return empty(response);
    }

    const keyDelete = pathname.match(/^\/api\/admin\/keys\/([^/]+)$/);
    if (request.method === 'DELETE' && keyDelete) {
      const index = database.keys.findIndex((item) => item.id === decodeURIComponent(keyDelete[1]));
      if (index < 0) return json(response, 404, { error: 'License key not found.' });
      if (database.keys[index].assignedUserId) return json(response, 400, { error: 'Assigned license keys cannot be deleted.' });
      database.keys.splice(index, 1);
      saveData();
      return empty(response);
    }

    if (request.method === 'GET' && pathname === '/api/admin/users') {
      return json(response, 200, database.users.map((user) => publicUser(user, database.keys.find((key) => key.id === user.keyId))));
    }

    if (request.method === 'POST' && pathname === '/api/admin/users') {
      const result = registerUser(await body(request));
      return result.error ? json(response, 400, result) : json(response, 200, result.user);
    }

    const userStatus = pathname.match(/^\/api\/admin\/users\/([^/]+)\/status$/);
    if (request.method === 'PATCH' && userStatus) {
      const user = database.users.find((item) => item.id === decodeURIComponent(userStatus[1]));
      if (!user) return json(response, 404, { error: 'User not found.' });
      const input = await body(request);
      if (!['active', 'pending', 'suspended'].includes(input.status)) return json(response, 400, { error: 'Invalid user status.' });
      user.status = input.status;
      saveData();
      return empty(response);
    }

    return json(response, 404, { error: 'Not found.' });
  } catch (error) {
    console.error(error);
    return json(response, 400, { error: error.message || 'Request failed.' });
  }
}

ensureAdminRecord();

http.createServer((request, response) => {
  handle(request, response).catch((error) => {
    console.error(error);
    json(response, 500, { error: 'Internal server error.' });
  });
}).listen(PORT, HOST, () => {
  console.log(`ARCTIC API listening on http://${HOST}:${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
  console.log(`Admin login: ${database.admin?.passwordHash ? 'configured' : 'not configured'}`);
  console.log(`Discord reset: ${DISCORD_WEBHOOK_URL && PUBLIC_API_URL ? 'configured' : 'not configured'}`);
  console.log(`Staff orders Discord: ${STAFF_ORDER_WEBHOOK_URL ? 'configured' : 'not configured'}`);
  console.log(`Staff accounts: ${database.staffUsers.length}`);
});
