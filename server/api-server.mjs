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
const DATA_DIR = process.env.ARCTIC_DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = process.env.ARCTIC_DATA_FILE || path.join(DATA_DIR, 'arctic-data.json');
const DATA_BACKUP_FILE = `${DATA_FILE}.bak`;
const ADMIN_USERNAME = process.env.ARCTIC_ADMIN_USERNAME || 'user42';
const ADMIN_PASSWORD = process.env.ARCTIC_ADMIN_PASSWORD || '';
const DISCORD_WEBHOOK_URL = process.env.ARCTIC_DISCORD_WEBHOOK_URL || '';
const KEY_PING_WEBHOOK_URL = process.env.ARCTIC_KEY_PING_WEBHOOK_URL || '';
const STAFF_ORDER_WEBHOOK_URL = process.env.ARCTIC_STAFF_ORDER_WEBHOOK_URL || '';
const OWNER_ROLE_ID = String(process.env.ARCTIC_OWNER_ROLE_ID || '').trim();
const ERROR_WEBHOOK_URL = process.env.ARCTIC_ERROR_WEBHOOK_URL || '';
const PUBLIC_API_URL = (process.env.ARCTIC_PUBLIC_API_URL || 'https://syntxapi.onrender.com').replace(/\/$/, '');
const ALLOWED_ORIGIN = process.env.ARCTIC_ALLOWED_ORIGIN || '*';
const SOFTWARE_DIR = path.join(path.dirname(DATA_FILE), 'software');
const LOADER_DIR = path.join(path.dirname(DATA_FILE), 'loader');
const SUPABASE_URL = String(process.env.ARCTIC_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_KEY = String(process.env.ARCTIC_SUPABASE_SERVICE_KEY || '');
const SUPABASE_STATE_ID = 'main';
const REMOTE_STATE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — the browser stays logged in
const RESET_TTL_MS = 10 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_ATTEMPT_LIMIT = 8;

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });

function emptyData() {
  return { keys: [], users: [], staffUsers: [], categories: [], orders: [], software: [], loaderReleases: [], userArchive: [], admin: null, resetRequests: [] };
}

function loadData() {
  for (const candidate of [DATA_FILE, DATA_BACKUP_FILE]) {
    try {
      const data = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      if (!data || typeof data !== 'object') continue;
      return {
        keys: Array.isArray(data.keys) ? data.keys : [],
        users: Array.isArray(data.users) ? data.users : [],
        staffUsers: Array.isArray(data.staffUsers) ? data.staffUsers : [],
        categories: Array.isArray(data.categories) ? data.categories : [],
        orders: Array.isArray(data.orders) ? data.orders : [],
        software: Array.isArray(data.software) ? data.software : [],
        loaderReleases: Array.isArray(data.loaderReleases) ? data.loaderReleases : [],
        userArchive: Array.isArray(data.userArchive) ? data.userArchive : [],
        admin: data.admin && typeof data.admin === 'object' ? data.admin : null,
        resetRequests: Array.isArray(data.resetRequests) ? data.resetRequests : [],
      };
    } catch {
      // Try the last known-good backup before falling back to an empty database.
    }
  }
  return emptyData();
}

function normalizeDatabase(data) {
  const normalized = {
    keys: Array.isArray(data?.keys) ? data.keys : [],
    users: Array.isArray(data?.users) ? data.users : [],
    staffUsers: Array.isArray(data?.staffUsers) ? data.staffUsers : [],
    categories: Array.isArray(data?.categories) ? data.categories : [],
    orders: Array.isArray(data?.orders) ? data.orders : [],
    software: Array.isArray(data?.software) ? data.software : [],
    loaderReleases: Array.isArray(data?.loaderReleases) ? data.loaderReleases : [],
    userArchive: Array.isArray(data?.userArchive) ? data.userArchive : [],
    admin: data?.admin && typeof data.admin === 'object' ? data.admin : null,
    resetRequests: Array.isArray(data?.resetRequests) ? data.resetRequests : [],
  };

  // Older records sometimes stored an expiry timestamp at creation time. Clear it
  // until the key is actually activated, so every new license follows one rule.
  const seenKeyValues = new Set();
  normalized.keys = normalized.keys.filter((key) => {
    const identity = String(key.value || key.id || '');
    if (!identity || seenKeyValues.has(identity)) return false;
    seenKeyValues.add(identity);
    return true;
  }).map((key) => ({
    ...key,
    activatedAt: key.activatedAt || null,
    expiresAt: key.activatedAt ? (key.expiresAt || null) : null,
    uses: Number(key.uses) || 0,
    maxUses: Math.max(1, Number(key.maxUses) || 1),
    status: ['active', 'expired', 'revoked'].includes(key.status) ? key.status : 'active',
  }));

  // Migrate the old plain user shape once. New registrations always use a hash,
  // while passwordPlain is kept only for the owner-only recovery endpoint.
  normalized.users = normalized.users.map((user) => {
    if (user.passwordHash) return user;
    const legacyPassword = typeof user.password === 'string' ? user.password : '';
    return {
      ...user,
      passwordHash: legacyPassword ? hashPassword(legacyPassword) : '',
      passwordPlain: legacyPassword || undefined,
    };
  });

  normalized.staffUsers = normalized.staffUsers.map((user) => ({
    ...user,
    level: Math.max(0, Math.min(5, Number(user.level) || 0)),
    levelRewardsClaimed: Array.isArray(user.levelRewardsClaimed) ? user.levelRewardsClaimed : [],
    rouletteSpinsUsed: Number(user.rouletteSpinsUsed) || 0,
  }));
  return normalized;
}

let database = normalizeDatabase(loadData());
const sessions = new Map();
const staffSessions = new Map();
const loginAttempts = new Map();
let remoteWriteQueue = Promise.resolve();
let dataReady = Promise.resolve();

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
  '2 Days': 2,
  '7 Days': 7,
  '30 Days': 30,
  '90 Days': 90,
  '1 Year': 365,
  'Lifetime': null,
};

function saveData() {
  const temporary = `${DATA_FILE}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(database, null, 2), 'utf8');
    if (fs.existsSync(DATA_FILE)) fs.copyFileSync(DATA_FILE, DATA_BACKUP_FILE);
    fs.renameSync(temporary, DATA_FILE);
  } catch (error) {
    try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch { /* keep the original error */ }
    console.error(`Local persistence write failed: ${error.message}`);
    throw error;
  }
  queueRemoteSave();
}

function supabaseHeaders() {
  return {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };
}

// ── Supabase Storage (survives Render's ephemeral disk) ──────────────────

const SUPABASE_STORAGE_BUCKET = process.env.ARCTIC_SUPABASE_BUCKET || 'software';

async function storageUpload(remotePath, buffer) {
  if (!REMOTE_STATE_ENABLED) return false;
  try {
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${remotePath}?upsert=true`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/octet-stream',
      },
      body: buffer,
    });
    if (!response.ok) {
      console.error(`Storage upload failed for ${remotePath}: ${response.status} ${await response.text().catch(() => '')}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Storage upload error for ${remotePath}: ${error.message}`);
    return false;
  }
}

function storagePublicUrl(remotePath) {
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${remotePath}`;
}

async function loadRemoteData() {
  if (!REMOTE_STATE_ENABLED) return false;
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/arctic_state?id=eq.${encodeURIComponent(SUPABASE_STATE_ID)}&select=payload`, {
      headers: supabaseHeaders(),
    });
    if (!response.ok) throw new Error(`Remote state read failed (${response.status})`);
    const rows = await response.json();
    if (Array.isArray(rows) && rows[0]?.payload && typeof rows[0].payload === 'object') {
      const remoteDatabase = normalizeDatabase(loadDataFromObject(rows[0].payload));
      const localHasRecords = hasDatabaseRecords(database);
      const remoteHasRecords = hasDatabaseRecords(remoteDatabase);
      // A newly-created remote row can legitimately be empty. Do not let that
      // empty row erase a local dataset during the first deploy; migrate the
      // existing data into remote storage instead.
      if (!remoteHasRecords && localHasRecords) {
        console.warn('Remote ARCTIC state is empty; preserving local records and migrating them to remote storage.');
        await persistRemoteData();
      } else {
        database = remoteDatabase;
      }
      console.log('Loaded ARCTIC data from remote persistent storage.');
      return true;
    }
    await persistRemoteData();
  } catch (error) {
    console.error(`Remote persistence unavailable: ${error.message}`);
  }
  return false;
}

function hasDatabaseRecords(data) {
  return ['keys', 'users', 'staffUsers', 'categories', 'orders', 'software', 'loaderReleases', 'userArchive']
    .some((collection) => Array.isArray(data?.[collection]) && data[collection].length > 0);
}

function loadDataFromObject(data) {
  return {
    keys: Array.isArray(data.keys) ? data.keys : [],
    users: Array.isArray(data.users) ? data.users : [],
    staffUsers: Array.isArray(data.staffUsers) ? data.staffUsers : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
    orders: Array.isArray(data.orders) ? data.orders : [],
    software: Array.isArray(data.software) ? data.software : [],
    loaderReleases: Array.isArray(data.loaderReleases) ? data.loaderReleases : [],
    userArchive: Array.isArray(data.userArchive) ? data.userArchive : [],
    admin: data.admin && typeof data.admin === 'object' ? data.admin : null,
    resetRequests: Array.isArray(data.resetRequests) ? data.resetRequests : [],
  };
}

function queueRemoteSave() {
  if (!REMOTE_STATE_ENABLED) return;
  remoteWriteQueue = remoteWriteQueue.then(() => persistRemoteData()).catch((error) => {
    console.error(`Remote persistence write failed: ${error.message}`);
  });
}

async function persistRemoteData() {
  if (!REMOTE_STATE_ENABLED) return;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/arctic_state`, {
    method: 'POST',
    headers: { ...supabaseHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: SUPABASE_STATE_ID, payload: database, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(`Remote state write failed (${response.status})`);
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
      if (raw.length > 128 * 1024 * 1024) request.destroy(new Error('Request body too large. Maximum 128 MB.'));
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
  '2 Days': '2DAY',
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

function isHttpUrl(value) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function expiryDaysFrom(value) {
  if (!value || value === 'lifetime') return null;
  const days = Number(value);
  return Number.isFinite(days) && days > 0 ? days : null;
}

function activateKey(key, activatedAt = new Date().toISOString()) {
  if (!key || key.activatedAt) return key;
  key.activatedAt = activatedAt;
  const days = Number(key.durationDays);
  key.expiresAt = Number.isFinite(days) && days > 0
    ? new Date(new Date(activatedAt).getTime() + days * 86400000).toISOString()
    : null;
  return key;
}

function keyIsExpired(key) {
  if (!key?.expiresAt) return false;
  if (new Date(key.expiresAt) > new Date()) return false;
  if (key.status === 'active') key.status = 'expired';
  return true;
}

function publicUser(user, key, includePassword = false) {
  return {
    id: user.id,
    username: user.username,
    password: includePassword && user.passwordPlain ? user.passwordPlain : '********',
    passwordSet: true,
    passwordAvailable: Boolean(user.passwordPlain),
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
  const generatedByStaff = key.generatedByStaffId
    ? database.staffUsers.find((staffUser) => staffUser.id === key.generatedByStaffId)
    : null;
  const source = key.source || (key.generatedByStaffId ? 'staff' : 'owner');
  return {
    id: key.id,
    value: key.value,
    plan: key.plan,
    category: key.category || null,
    createdAt: key.createdAt,
    activatedAt: key.activatedAt || null,
    durationDays: key.durationDays ?? null,
    expiresAt: key.expiresAt || null,
    status: keyIsExpired(key) ? 'expired' : key.status,
    assignedTo: user?.username || allocatedStaff?.username || null,
    createdBy: generatedByStaff?.username || (source === 'roulette' ? 'Roulette bonus' : source === 'level' ? 'Level reward' : 'Owner'),
    uses: key.uses || 0,
    maxUses: key.maxUses || 1,
    source,
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

function publicSoftware(sw) {
  return {
    id: sw.id,
    name: sw.name,
    description: sw.description,
    version: sw.version,
    game: sw.game,
    category: sw.category || null,
    status: sw.status,
    imageFileName: sw.imageFileName || null,
    originalFileName: sw.originalFileName || null,
    fileSize: sw.fileSize || 0,
    downloadUrl: sw.downloadUrl || null,
    downloads: sw.downloads || 0,
    createdAt: sw.createdAt,
    updatedAt: sw.updatedAt,
  };
}

function publicLoaderRelease(release) {
  return {
    id: release.id,
    version: release.version,
    notes: release.notes || '',
    status: release.status,
    current: Boolean(release.current),
    originalFileName: release.originalFileName || null,
    fileSize: release.fileSize || 0,
    downloads: release.downloads || 0,
    createdAt: release.createdAt,
    updatedAt: release.updatedAt,
  };
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
  if (key.status !== 'active' || keyIsExpired(key)) return { error: 'License key is not active.' };
  if (key.assignedUserId || Number(key.uses) >= Number(key.maxUses || 1)) return { error: 'License key is already assigned to a user.' };
  if (database.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) return { error: 'Username is already registered.' };

  const user = {
    id: id('user'),
    username,
    passwordHash: hashPassword(password),
    // Kept only for the owner-only credential view. Existing hash-only users remain non-recoverable.
    passwordPlain: password,
    registeredAt: input.registeredAt || new Date().toISOString(),
    status: 'active',
    keyId: key.id,
  };
  database.users.unshift(user);
  database.userArchive.unshift({
    id: id('archive'),
    userId: user.id,
    username: user.username,
    registeredAt: user.registeredAt,
    key: key.value,
    plan: key.plan,
    archivedAt: new Date().toISOString(),
  });
  activateKey(key);
  key.assignedUserId = user.id;
  key.uses = (key.uses || 0) + 1;
  saveData();
  void sendKeyActivationWebhook(user, key, 'Registration');
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

function publicStaffUser(user, includeKeys = false) {
  const config = levelConfig(user.level);
  const result = {
    id: user.id,
    username: user.username,
    discordName: user.discordName || '',
    status: user.status,
    level: Math.max(0, Math.min(5, Number(user.level) || 0)),
    createdAt: user.createdAt,
    createdBy: user.createdBy || null,
    quota: staffQuota(user.id),
    roulette: rouletteState(user),
    permissions: {
      analytics: Boolean(config.analytics),
      fullKeypanel: Boolean(config.fullKeypanel),
    },
  };
  if (includeKeys) {
    result.keys = database.keys
      .filter((key) => key.generatedByStaffId === user.id || key.allocatedToStaffId === user.id)
      .map((key) => publicKey(key, null));
  }
  return result;
}

// Keys generated by this staff user, grouped by plan.
function staffUsedQuota(staffId) {
  const counts = {};
  for (const key of database.keys) {
    const isQuotaKey = key.generatedByStaffId === staffId && key.source !== 'roulette' && key.source !== 'level' && !key.bonusType;
    if (isQuotaKey && key.plan) counts[key.plan] = (counts[key.plan] || 0) + 1;
  }
  return counts;
}

// Keys allocated to this staff user via fulfilled orders, grouped by plan.
function staffOrderKeyCount(staffId) {
  const counts = {};
  for (const key of database.keys) {
    if (key.allocatedToStaffId === staffId && key.source === 'owner' && key.orderId && key.plan) {
      counts[key.plan] = (counts[key.plan] || 0) + 1;
    }
  }
  return counts;
}

const STAFF_LEVELS = {
  0: { label: 'Trainee', rouletteSpins: 0, analytics: false, fullKeypanel: false, rewards: [] },
  1: { label: 'Junior', rouletteSpins: 0, analytics: false, fullKeypanel: false, rewards: [{ plan: '2 Days', quantity: 1 }] },
  2: { label: 'Reseller', rouletteSpins: 1, analytics: false, fullKeypanel: false, rewards: [{ plan: '1 Day', quantity: 2 }] },
  3: { label: 'Senior reseller', rouletteSpins: 3, analytics: false, fullKeypanel: false, rewards: [{ plan: '7 Days', quantity: 1 }, { plan: '1 Day', quantity: 2 }] },
  4: { label: 'Lead', rouletteSpins: 4, analytics: true, fullKeypanel: false, rewards: [{ plan: '90 Days', quantity: 1 }, { plan: '30 Days', quantity: 2 }, { plan: '7 Days', quantity: 1 }] },
  5: { label: 'Manager', rouletteSpins: 4, analytics: true, fullKeypanel: true, rewards: [{ plan: 'Lifetime', quantity: 1 }] },
};

function levelConfig(level) {
  return STAFF_LEVELS[Math.max(0, Math.min(5, Number(level) || 0))];
}

function rouletteDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function rouletteState(user) {
  const config = levelConfig(user.level);
  const day = rouletteDayKey();
  const spinsUsed = user.rouletteDay === day ? Number(user.rouletteSpinsUsed) || 0 : 0;
  return {
    spinsUsed,
    spinsRemaining: Math.max(config.rouletteSpins - spinsUsed, 0),
    dailyLimit: config.rouletteSpins,
    resetAt: `${new Date(Date.now() + 86400000).toISOString().slice(0, 10)}T00:00:00.000Z`,
    enabled: config.rouletteSpins > 0,
  };
}

// Extra generation allowance a staff member can receive from the owner, keyed by plan.
function staffQuotaBonus(staffId) {
  const user = database.staffUsers.find((item) => item.id === staffId);
  const bonus = (user && typeof user.quotaBonus === 'object' && user.quotaBonus) || {};
  const result = {};
  for (const [plan, amount] of Object.entries(bonus)) {
    const value = Number(amount) || 0;
    if (value > 0) result[plan] = value;
  }
  return result;
}

function staffQuota(staffId) {
  const used = staffUsedQuota(staffId);
  const orderCounts = staffOrderKeyCount(staffId);
  const bonusCounts = {};
  for (const key of database.keys) {
    if (key.generatedByStaffId === staffId && (key.source === 'roulette' || key.source === 'level' || key.bonusType)) {
      bonusCounts[key.plan] = (bonusCounts[key.plan] || 0) + 1;
    }
  }
  const quotaBonus = staffQuotaBonus(staffId);
  const totalOrderKeys = Object.values(orderCounts).reduce((sum, value) => sum + value, 0);
  const entries = Object.entries(STAFF_KEY_QUOTA).map(([plan, baseLimit]) => {
    const limit = baseLimit + (Number(quotaBonus[plan]) || 0);
    return {
      plan,
      limit,
      used: used[plan] || 0,
      remaining: Math.max(limit - (used[plan] || 0), 0),
      orderKeys: orderCounts[plan] || 0,
      bonusKeys: bonusCounts[plan] || 0,
      quotaBonus: Number(quotaBonus[plan]) || 0,
    };
  });
  return { entries, totals: { used: Object.values(used).reduce((sum, value) => sum + value, 0), orderKeys: totalOrderKeys, bonusKeys: Object.values(bonusCounts).reduce((sum, value) => sum + value, 0) } };
}

async function sendStaffOrderWebhook(order) {
  if (!STAFF_ORDER_WEBHOOK_URL) return { sent: false, configured: false };
  const itemLines = order.items
    .map((item) => `**${item.quantity}× ${item.plan}**`)
    .join('\n');
  const ownerMention = OWNER_ROLE_ID ? `<@&${OWNER_ROLE_ID}>` : 'Owner team';
  const payload = {
    content: ownerMention,
    embeds: [{
      title: '📦 New key request',
      description: `**${order.username}** has requested additional license keys.`,
      color: 3447003,
      fields: [
        { name: 'Requested keys', value: itemLines, inline: true },
        { name: 'Discord', value: order.discordName || 'Not provided', inline: true },
        { name: 'Received', value: new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(order.createdAt)) + ' UTC', inline: false },
      ],
      footer: { text: 'ARCTIC Keypanel • fulfil from the Orders tab' },
      timestamp: order.createdAt,
    }],
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

async function sendKeyActivationWebhook(user, key, method) {
  if (!KEY_PING_WEBHOOK_URL) return false;
  const payload = {
    embeds: [{
      title: '🔐 ARCTIC license activated',
      description: 'A license key has been used for the first time. Its expiry clock starts now.',
      color: 3447003,
      fields: [
        { name: 'User', value: String(user?.username || 'Unknown'), inline: true },
        { name: 'Plan', value: String(key?.plan || 'Unknown'), inline: true },
        { name: 'Key', value: `\`${String(key?.value || 'Unknown')}\``, inline: false },
        { name: 'Activated via', value: String(method || 'Authentication'), inline: true },
        { name: 'Expires', value: key?.expiresAt ? new Date(key.expiresAt).toISOString() : 'Never', inline: true },
      ],
      footer: { text: 'ARCTIC Keypanel • first use recorded' },
      timestamp: key?.activatedAt || new Date().toISOString(),
    }],
  };
  try {
    const response = await fetch(KEY_PING_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function createManagedKey({ plan, ownerId = null, staffId = null, source = 'owner', bonusType = null, category = null, orderId = null, createdAt = new Date().toISOString() }) {
  let value;
  do { value = generateKey('ARC', plan); } while (findKey(value));
  return {
    id: id('key'),
    value,
    plan,
    createdAt,
    activatedAt: null,
    durationDays: STAFF_PLAN_DAYS[plan] ?? null,
    expiresAt: null,
    status: 'active',
    assignedUserId: null,
    allocatedToStaffId: staffId,
    generatedByStaffId: source === 'owner' ? null : staffId,
    generatedByOwner: ownerId,
    uses: 0,
    maxUses: 1,
    category,
    orderId,
    source,
    bonusType,
  };
}

function createBonusKeys(staffUser, rewards, level) {
  const generated = [];
  const createdAt = new Date().toISOString();
  for (const reward of rewards) {
    for (let index = 0; index < reward.quantity; index += 1) {
      generated.push(createManagedKey({
        plan: reward.plan,
        staffId: staffUser.id,
        source: 'level',
        bonusType: `level-${level}`,
        createdAt,
      }));
    }
  }
  return generated;
}

function awardLevelRewards(staffUser, oldLevel, newLevel) {
  const granted = [];
  const claimed = new Set(Array.isArray(staffUser.levelRewardsClaimed) ? staffUser.levelRewardsClaimed : []);
  for (let level = oldLevel + 1; level <= newLevel; level += 1) {
    if (claimed.has(level)) continue;
    const rewards = levelConfig(level).rewards;
    const keys = createBonusKeys(staffUser, rewards, level);
    database.keys.unshift(...keys);
    granted.push(...keys);
    claimed.add(level);
  }
  staffUser.levelRewardsClaimed = [...claimed].sort((a, b) => a - b);
  return granted;
}

function rouletteResult() {
  // The visible prize mix is 3× 1 Day, 1× 7 Days, 1× 1 Year and 4× no prize.
  // The one-year result is intentionally rarer than a literal equal-slot wheel.
  const roll = crypto.randomInt(0, 2000);
  if (roll < 1200) return { result: 'No prize', plan: null }; // 60%
  if (roll < 1800) return { result: '1 Day', plan: '1 Day' }; // 30%
  if (roll < 1990) return { result: '7 Days', plan: '7 Days' }; // 9.5%
  return { result: '1 Year', plan: '1 Year' }; // 0.5%
}

async function reportLoaderError(errorCode, details = '') {
  if (!ERROR_WEBHOOK_URL) return;
  const payload = {
    embeds: [{
      title: 'ARCTIC loader error',
      description: 'Try again. If u can\'t get it fixd go to the support.',
      color: 15158332,
      fields: [{ name: 'Error code', value: String(errorCode || 'UNKNOWN').slice(0, 200), inline: true }, { name: 'Details', value: String(details || 'No details').slice(0, 1000), inline: false }],
      timestamp: new Date().toISOString(),
    }],
  };
  try {
    await fetch(ERROR_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  } catch {
    // Error reporting must never take the API down.
  }
}

async function sendStaffDeviceResetWebhook(username, token) {
  if (!DISCORD_WEBHOOK_URL || !PUBLIC_API_URL) return false;
  const approvalUrl = `${PUBLIC_API_URL}/api/staff/device-reset/approve?token=${encodeURIComponent(token)}`;
  const payload = {
    content: `ARCTIC device reset requested for staff **${username}**.`,
    embeds: [{
      title: 'ARCTIC staff device reset',
      description: 'Approve this request if a staff member needs access from a new device.',
      color: 5814783,
      fields: [{ name: 'Staff Account', value: username, inline: true }, { name: 'Expires', value: '10 minutes', inline: true }],
    }],
    components: [{
      type: 1,
      components: [{ type: 2, style: 5, label: 'Approve staff device reset', url: approvalUrl }],
    }],
  };
  const webhookUrl = DISCORD_WEBHOOK_URL.includes('?')
    ? `${DISCORD_WEBHOOK_URL}&with_components=true`
    : `${DISCORD_WEBHOOK_URL}?with_components=true`;
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function createStaffDeviceResetRequest(username, deviceId) {
  if (!DISCORD_WEBHOOK_URL || !PUBLIC_API_URL) return { sent: false, configured: false };
  const token = crypto.randomBytes(32).toString('hex');
  database.resetRequests = database.resetRequests.filter((item) => item.expiresAt > Date.now() && !item.usedAt);
  database.resetRequests.push({
    tokenHash: sha256(token),
    username: `staff:${username}`,
    deviceId,
    createdAt: Date.now(),
    expiresAt: Date.now() + RESET_TTL_MS,
    usedAt: null,
  });
  saveData();
  try {
    const sent = await sendStaffDeviceResetWebhook(username, token);
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
  // No device binding. Any device with valid credentials may log in.
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

  // No device binding. Any browser/device with valid credentials may log in.
  const sessionToken = crypto.randomBytes(32).toString('base64url');
  sessions.set(sessionToken, { username: database.admin.username, expiresAt: Date.now() + SESSION_TTL_MS });
  persistSessions();
  return json(response, 200, {
    sessionToken,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    user: { username: database.admin.username, deviceBound: true },
  });
}

async function handle(request, response) {
  await dataReady;
  if (request.method === 'OPTIONS') return empty(response);
  const url = new URL(request.url, `http://${HOST}:${PORT}`);
  const pathname = url.pathname;

  if (request.method === 'GET' && pathname === '/api/health') {
    return json(response, 200, {
      status: 'ok',
      service: 'arctic-api',
      utc: new Date().toISOString(),
      persistentStorage: REMOTE_STATE_ENABLED ? 'supabase' : 'local-file',
      warning: REMOTE_STATE_ENABLED ? null : 'Configure ARCTIC_DATA_DIR on a Render persistent disk or set ARCTIC_SUPABASE_URL and ARCTIC_SUPABASE_SERVICE_KEY. Render Free container storage is ephemeral.',
    });
  }

  if (request.method === 'POST' && pathname === '/api/admin/login') {
    return handleAdminLogin(request, response);
  }

  if (request.method === 'POST' && pathname === '/api/staff/login') {
    return handleStaffLogin(request, response);
  }

  // The desktop loader never needs the Discord webhook URL. It sends a short
  // diagnostic to this public proxy, which forwards it server-side.
  if (request.method === 'POST' && pathname === '/api/loader/error') {
    const input = await body(request);
    await reportLoaderError(input.code || 'UNKNOWN', input.details || '');
    return json(response, 202, { accepted: true });
  }

  // Device-reset approval links are deliberately public: Discord opens them
  // before the staff member can authenticate on the new device.
  if (pathname.startsWith('/api/staff/') && pathname !== '/api/staff/device-reset/approve' && !staffAuthorized(request)) {
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

  if (request.method === 'GET' && pathname === '/api/staff/device-reset/approve') {
    const token = String(url.searchParams.get('token') || '');
    const requestItem = database.resetRequests.find((item) => item.tokenHash === sha256(token) && !item.usedAt);
    if (!requestItem || requestItem.expiresAt <= Date.now()) {
      return html(response, 410, resetApprovalPage('Link expired', 'This staff device reset link is no longer valid.', false));
    }
    const staffUsername = String(requestItem.username || '').replace(/^staff:/, '');
    const staffUser = findStaffUser(staffUsername);
    if (staffUser) {
      staffUser.deviceId = null;
      staffUser.deviceBoundAt = null;
      saveData();
    }
    requestItem.usedAt = Date.now();
    database.resetRequests = database.resetRequests.filter((item) => item !== requestItem);
    saveData();
    return html(response, 200, resetApprovalPage('Staff device reset approved', `Device reset for ${staffUsername} approved. The next login will bind the new device.`, true));
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

    if (request.method === 'POST' && pathname === '/api/staff/roulette') {
      const session = getStaffSession(request);
      const user = database.staffUsers.find((item) => item.id === session.userId);
      if (!user) return json(response, 401, { error: 'Staff account no longer exists.', code: 'STAFF_GONE' });
      if (user.status !== 'active') return json(response, 403, { error: 'This staff account is not active.', code: 'STAFF_SUSPENDED' });
      const state = rouletteState(user);
      if (!state.enabled) return json(response, 403, { error: 'Roulette unlocks at staff level 2.', code: 'ROULETTE_LOCKED' });
      if (state.spinsRemaining <= 0) return json(response, 429, { error: 'No roulette spins remaining today.', code: 'ROULETTE_EXHAUSTED', roulette: state });
      const day = rouletteDayKey();
      if (user.rouletteDay !== day) { user.rouletteDay = day; user.rouletteSpinsUsed = 0; }
      user.rouletteSpinsUsed = (Number(user.rouletteSpinsUsed) || 0) + 1;
      const result = rouletteResult();
      let rewardKey = null;
      if (result.plan) {
        rewardKey = createManagedKey({ plan: result.plan, staffId: user.id, source: 'roulette', bonusType: 'roulette', createdAt: new Date().toISOString() });
        database.keys.unshift(rewardKey);
      }
      saveData();
      return json(response, 200, {
        result: result.result,
        key: rewardKey ? publicKey(rewardKey, null) : null,
        roulette: rouletteState(user),
      });
    }

    if (request.method === 'GET' && pathname === '/api/staff/keys') {
      const session = getStaffSession(request);
      const keys = database.keys
        .filter((key) => key.generatedByStaffId === session.userId || key.allocatedToStaffId === session.userId)
        .map((key) => publicKey(key, null));
      return json(response, 200, keys);
    }

    if (request.method === 'GET' && pathname === '/api/staff/keypanel/keys') {
      const session = getStaffSession(request);
      const user = database.staffUsers.find((item) => item.id === session.userId);
      if (!user || !levelConfig(user.level).fullKeypanel) return json(response, 403, { error: 'Full keypanel access unlocks at level 5.', code: 'KEYPANEL_LOCKED' });
      return json(response, 200, database.keys.map((key) => publicKey(key, database.users.find((account) => account.id === key.assignedUserId))));
    }

    if (request.method === 'POST' && pathname === '/api/staff/keys') {
      const session = getStaffSession(request);
      const user = database.staffUsers.find((item) => item.id === session.userId);
      if (!user) return json(response, 401, { error: 'Staff account no longer exists.', code: 'STAFF_GONE' });
      if (user.status !== 'active') return json(response, 403, { error: 'This staff account is not active.', code: 'STAFF_SUSPENDED' });

      const input = await body(request);
      const plan = String(input.plan || '');
      const quantity = Math.max(1, Number(input.quantity) || 1);
      const baseLimit = STAFF_KEY_QUOTA[plan];
      const level = Math.max(0, Math.min(5, Number(user.level) || 0));
      if (baseLimit == null || (level < 5 && !Object.prototype.hasOwnProperty.call(STAFF_KEY_QUOTA, plan))) return json(response, 400, { error: 'This key plan is not available to staff.', code: 'INVALID_PLAN' });
      const quotaBonus = staffQuotaBonus(user.id);
      const limit = baseLimit + (Number(quotaBonus[plan]) || 0);

      const used = staffUsedQuota(user.id)[plan] || 0;
      const remaining = Math.max(limit - used, 0);
      if (quantity > remaining) {
        return json(response, 400, {
          error: `Quota exceeded for ${plan}: ${used}/${limit} used, only ${remaining} remaining.`,
          code: 'QUOTA_EXCEEDED',
        });
      }

      const createdAt = new Date().toISOString();
      const generated = Array.from({ length: quantity }, () => createManagedKey({
        plan,
        staffId: user.id,
        source: 'staff',
        createdAt,
      }));
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
      const rawItems = Array.isArray(input.items) ? input.items : [];      const items = rawItems
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
      return json(response, 200, database.staffUsers.map((user) => publicStaffUser(user, true)));
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
        level: Math.max(0, Math.min(5, Number(input.level) || 0)),
        levelRewardsClaimed: [],
        rouletteDay: null,
        rouletteSpinsUsed: 0,
        createdAt: new Date().toISOString(),
        createdBy: adminSession?.username || null,
      };
      database.staffUsers.unshift(user);
      const initialRewards = awardLevelRewards(user, -1, user.level);
      saveData();
      return json(response, 200, { ...publicStaffUser(user, true), rewardKeys: initialRewards.map((key) => publicKey(key, null)) });
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

    const staffLevel = pathname.match(/^\/api\/admin\/staff\/([^/]+)\/level$/);
    if (request.method === 'PATCH' && staffLevel) {
      const user = database.staffUsers.find((item) => item.id === decodeURIComponent(staffLevel[1]));
      if (!user) return json(response, 404, { error: 'Staff account not found.' });
      const input = await body(request);
      const nextLevel = Number(input.level);
      if (!Number.isInteger(nextLevel) || nextLevel < 0 || nextLevel > 5) return json(response, 400, { error: 'Staff level must be between 0 and 5.', code: 'INVALID_LEVEL' });
      const oldLevel = Math.max(0, Math.min(5, Number(user.level) || 0));
      user.level = nextLevel;
      const rewardKeys = nextLevel > oldLevel ? awardLevelRewards(user, oldLevel, nextLevel) : [];
      saveData();
      return json(response, 200, { staff: publicStaffUser(user, true), rewardKeys: rewardKeys.map((key) => publicKey(key, null)) });
    }

    const staffQuota = pathname.match(/^\/api\/admin\/staff\/([^/]+)\/quota$/);
    if (request.method === 'PATCH' && staffQuota) {
      const user = database.staffUsers.find((item) => item.id === decodeURIComponent(staffQuota[1]));
      if (!user) return json(response, 404, { error: 'Staff account not found.' });
      const input = await body(request);
      const plan = String(input.plan || '').trim();
      const amount = Math.max(0, Number(input.amount) || 0);
      if (STAFF_KEY_QUOTA[plan] == null) return json(response, 400, { error: 'Unknown key plan.', code: 'INVALID_PLAN' });
      user.quotaBonus = { ...(user.quotaBonus && typeof user.quotaBonus === 'object' ? user.quotaBonus : {}), [plan]: amount };
      saveData();
      return json(response, 200, { staff: publicStaffUser(user, true) });
    }

    const staffDelete = pathname.match(/^\/api\/admin\/staff\/([^/]+)$/);
    if (request.method === 'DELETE' && staffDelete) {
      const index = database.staffUsers.findIndex((item) => item.id === decodeURIComponent(staffDelete[1]));
      if (index < 0) return json(response, 404, { error: 'Staff account not found.' });
      database.staffUsers.splice(index, 1);
      saveData();
      return empty(response);
    }

    const staffResetDevice = pathname.match(/^\/api\/admin\/staff\/([^/]+)\/reset-device$/);
    if (request.method === 'POST' && staffResetDevice) {
      const user = database.staffUsers.find((item) => item.id === decodeURIComponent(staffResetDevice[1]));
      if (!user) return json(response, 404, { error: 'Staff account not found.' });
      user.deviceId = null;
      user.deviceBoundAt = null;
      saveData();
      return json(response, 200, { message: 'Staff device reset. The next login will bind the new device.' });
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
      const user = database.users.find((item) => item.username.toLowerCase() === username.toLowerCase());
      // The license key is only used at registration. Logging in is username +
      // password; the account is permanently bound to its own key, so any
      // remembered/stale key sent from the loader form is ignored here.
      const key = database.keys.find((item) => item.id === user?.keyId);
      const valid = Boolean(user && key && user.keyId === key.id && user.status === 'active' && key.status === 'active'
        && !keyIsExpired(key) && verifyPassword(String(input.password || ''), user.passwordHash));
      if (!valid) return json(response, 401, { error: 'Invalid credentials.', code: 'INVALID_CREDENTIALS' });
      if (!key.activatedAt) {
        activateKey(key);
        saveData();
        void sendKeyActivationWebhook(user, key, 'Login');
      }
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
          generated.push(createManagedKey({
            plan,
            staffId: staffUser.id,
            source: 'owner',
            category,
            orderId: order.id,
            createdAt,
          }));
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
      const plan = String(input.plan || 'Lifetime');
      const category = String(input.category || '').trim() || null;
      const generated = Array.from({ length: quantity }, () => {
        let value;
        do { value = generateKey(input.prefix, plan); } while (findKey(value));
        return {
          id: id('key'), value, plan, createdAt,
          activatedAt: null,
          durationDays: expiryDaysFrom(input.expiry),
          expiresAt: null,
          status: 'active',
          assignedUserId: null,
          allocatedToStaffId: null,
          generatedByStaffId: null,
          uses: 0,
          maxUses: Math.max(1, Number(input.maxUses) || 1),
          category,
          source: 'owner',
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

    const userPassword = pathname.match(/^\/api\/admin\/users\/([^/]+)\/password$/);
    if (request.method === 'GET' && userPassword) {
      const user = database.users.find((item) => item.id === decodeURIComponent(userPassword[1]));
      if (!user) return json(response, 404, { error: 'User not found.' });
      return json(response, 200, { username: user.username, password: user.passwordPlain || null, recoverable: Boolean(user.passwordPlain) });
    }

    if (request.method === 'GET' && pathname === '/api/admin/user-archive') {
      return json(response, 200, (database.userArchive || []).map((entry) => ({ ...entry })));
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

    // ── Software management ──────────────────────────────────────────────

    if (request.method === 'GET' && pathname === '/api/admin/software') {
      return json(response, 200, (database.software || []).map(publicSoftware));
    }

    if (request.method === 'POST' && pathname === '/api/admin/software') {
      const input = await body(request);
      const name = String(input.name || '').trim();
      const description = String(input.description || '').trim();
      const version = String(input.version || '').trim();
      const game = String(input.game || '').trim();
      const category = String(input.category || '').trim();
      const status = String(input.status || 'draft').trim();
      const fileData = String(input.fileData || '').trim(); // base64 encoded
      const fileName = String(input.fileName || '').trim();
      const fileSize = Number(input.fileSize) || 0;
      const downloadUrl = String(input.downloadUrl || '').trim(); // optional external URL
      const imageData = String(input.imageData || '').trim(); // base64 encoded
      const imageFileName = String(input.imageFileName || '').trim();

      if (!name) return json(response, 400, { error: 'Software name is required.', code: 'INVALID_SOFTWARE' });
      if (status === 'live' && !fileData && !downloadUrl) return json(response, 400, { error: 'Live software needs an uploaded file or an external HTTP(S) URL.', code: 'SOFTWARE_FILE_REQUIRED' });
      if (downloadUrl && !isHttpUrl(downloadUrl)) return json(response, 400, { error: 'Download URL must use HTTP or HTTPS.', code: 'INVALID_DOWNLOAD_URL' });

      let savedFileName = '';
      let savedFileSize = fileSize;
      let savedImageFileName = '';
      let savedStoragePath = null;
      let savedStorageImagePath = null;

      if (fileData) {
        const buf = Buffer.from(fileData, 'base64');
        savedFileSize = buf.length;
        savedFileName = `${id('sw')}-${path.basename(fileName || 'file')}`;
        const filePath = path.join(SOFTWARE_DIR, savedFileName);
        fs.mkdirSync(SOFTWARE_DIR, { recursive: true });
        fs.writeFileSync(filePath, buf);
        if (await storageUpload(savedFileName, buf)) savedStoragePath = savedFileName;
      }

      if (imageData) {
        const imageBuf = Buffer.from(imageData, 'base64');
        fs.mkdirSync(SOFTWARE_DIR, { recursive: true });
        savedImageFileName = `${id('sw')}-img${path.extname(imageFileName || '.png')}`;
        fs.writeFileSync(path.join(SOFTWARE_DIR, savedImageFileName), imageBuf);
        if (await storageUpload(savedImageFileName, imageBuf)) savedStorageImagePath = savedImageFileName;
      }

      const software = {
        id: id('sw'),
        name,
        description,
        version,
        game,
        category,
        status: ['live', 'draft', 'offline'].includes(status) ? status : 'draft',
        fileName: savedFileName,
        originalFileName: fileName,
        fileSize: savedFileSize,
        downloadUrl,
        imageFileName: savedImageFileName || null,
        storagePath: savedStoragePath,
        storageImagePath: savedStorageImagePath,
        downloads: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (!database.software) database.software = [];
      database.software.unshift(software);
      saveData();
      return json(response, 200, publicSoftware(software));
    }

    const swUpdate = pathname.match(/^\/api\/admin\/software\/([^/]+)$/);
    if (request.method === 'PATCH' && swUpdate) {
      const sw = (database.software || []).find((item) => item.id === decodeURIComponent(swUpdate[1]));
      if (!sw) return json(response, 404, { error: 'Software not found.' });
      const input = await body(request);
      if (input.name != null) sw.name = String(input.name).trim() || sw.name;
      if (input.description != null) sw.description = String(input.description).trim();
      if (input.version != null) sw.version = String(input.version).trim() || sw.version;
      if (input.game != null) sw.game = String(input.game).trim();
      if (input.category != null) sw.category = String(input.category).trim();
      if (input.status != null && ['live', 'draft', 'offline'].includes(input.status)) sw.status = input.status;
      if (input.downloadUrl != null) {
        const nextDownloadUrl = String(input.downloadUrl).trim();
        if (nextDownloadUrl && !isHttpUrl(nextDownloadUrl)) return json(response, 400, { error: 'Download URL must use HTTP or HTTPS.', code: 'INVALID_DOWNLOAD_URL' });
        sw.downloadUrl = nextDownloadUrl;
      }

      // Optional file replacement
      const fileData = String(input.fileData || '').trim();
      const fileName = String(input.fileName || '').trim();
      if (fileData && fileName) {
        // Delete old file
        if (sw.fileName) {
          const oldPath = path.join(SOFTWARE_DIR, sw.fileName);
          try { fs.unlinkSync(oldPath); } catch { /* ignore */ }
        }
        const buf = Buffer.from(fileData, 'base64');
        sw.fileName = `${id('sw')}-${path.basename(fileName)}`;
        sw.originalFileName = fileName;
        sw.fileSize = buf.length;
        fs.mkdirSync(SOFTWARE_DIR, { recursive: true });
        fs.writeFileSync(path.join(SOFTWARE_DIR, sw.fileName), buf);
        sw.storagePath = (await storageUpload(sw.fileName, buf)) ? sw.fileName : sw.storagePath;
      }

      // Optional image replacement
      const imageData = String(input.imageData || '').trim();
      const imageFileName = String(input.imageFileName || '').trim();
      if (imageData) {
        if (sw.imageFileName) {
          try { fs.unlinkSync(path.join(SOFTWARE_DIR, sw.imageFileName)); } catch { /* ignore */ }
        }
        const imageBuf = Buffer.from(imageData, 'base64');
        fs.mkdirSync(SOFTWARE_DIR, { recursive: true });
        sw.imageFileName = `${id('sw')}-img${path.extname(imageFileName || '.png')}`;
        fs.writeFileSync(path.join(SOFTWARE_DIR, sw.imageFileName), imageBuf);
        sw.storageImagePath = (await storageUpload(sw.imageFileName, imageBuf)) ? sw.imageFileName : sw.storageImagePath;
      }

      if (sw.status === 'live' && !sw.fileName && !sw.downloadUrl) return json(response, 400, { error: 'Live software needs an uploaded file or an external HTTP(S) URL.', code: 'SOFTWARE_FILE_REQUIRED' });
      sw.updatedAt = new Date().toISOString();
      saveData();
      return json(response, 200, publicSoftware(sw));
    }

    const swDelete = pathname.match(/^\/api\/admin\/software\/([^/]+)$/);
    if (request.method === 'DELETE' && swDelete) {
      const index = (database.software || []).findIndex((item) => item.id === decodeURIComponent(swDelete[1]));
      if (index < 0) return json(response, 404, { error: 'Software not found.' });
      const sw = database.software[index];
      if (sw.fileName) {
        try { fs.unlinkSync(path.join(SOFTWARE_DIR, sw.fileName)); } catch { /* ignore */ }
      }
      if (sw.imageFileName) {
        try { fs.unlinkSync(path.join(SOFTWARE_DIR, sw.imageFileName)); } catch { /* ignore */ }
      }
      database.software.splice(index, 1);
      saveData();
      return empty(response);
    }

    // ── Loader releases ────────────────────────────────────────────────────

    if (request.method === 'GET' && pathname === '/api/admin/loader/releases') {
      return json(response, 200, (database.loaderReleases || []).map(publicLoaderRelease));
    }

    if (request.method === 'POST' && pathname === '/api/admin/loader/releases') {
      const input = await body(request);
      const version = String(input.version || '').trim();
      const notes = String(input.notes || '').trim();
      const fileData = String(input.fileData || '').trim();
      const fileName = String(input.fileName || '').trim();
      if (!version || !fileData || !fileName) return json(response, 400, { error: 'Version and loader file are required.', code: 'INVALID_LOADER_RELEASE' });
      const fileBuffer = Buffer.from(fileData, 'base64');
      if (!fileBuffer.length) return json(response, 400, { error: 'The loader file is empty.', code: 'INVALID_LOADER_RELEASE' });
      fs.mkdirSync(LOADER_DIR, { recursive: true });
      const releaseId = id('loader');
      const savedFileName = `${releaseId}-${path.basename(fileName)}`;
      fs.writeFileSync(path.join(LOADER_DIR, savedFileName), fileBuffer);
      const makeCurrent = Boolean(input.current);
      if (makeCurrent) for (const release of (database.loaderReleases || [])) release.current = false;
      const release = {
        id: releaseId,
        version,
        notes,
        status: makeCurrent ? 'live' : 'draft',
        current: makeCurrent,
        fileName: savedFileName,
        originalFileName: fileName,
        fileSize: fileBuffer.length,
        downloads: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (!database.loaderReleases) database.loaderReleases = [];
      database.loaderReleases.unshift(release);
      saveData();
      return json(response, 200, publicLoaderRelease(release));
    }

    const loaderCurrent = pathname.match(/^\/api\/admin\/loader\/releases\/([^/]+)\/current$/);
    if (request.method === 'PATCH' && loaderCurrent) {
      const release = (database.loaderReleases || []).find((item) => item.id === decodeURIComponent(loaderCurrent[1]));
      if (!release) return json(response, 404, { error: 'Loader release not found.' });
      for (const item of (database.loaderReleases || [])) { item.current = false; if (item.status === 'live') item.status = 'draft'; }
      release.current = true;
      release.status = 'live';
      release.updatedAt = new Date().toISOString();
      saveData();
      return json(response, 200, publicLoaderRelease(release));
    }

    const loaderDelete = pathname.match(/^\/api\/admin\/loader\/releases\/([^/]+)$/);
    if (request.method === 'DELETE' && loaderDelete) {
      const index = (database.loaderReleases || []).findIndex((item) => item.id === decodeURIComponent(loaderDelete[1]));
      if (index < 0) return json(response, 404, { error: 'Loader release not found.' });
      const release = database.loaderReleases[index];
      try { fs.unlinkSync(path.join(LOADER_DIR, release.fileName)); } catch { /* file may be missing after a restart */ }
      database.loaderReleases.splice(index, 1);
      saveData();
      return empty(response);
    }

    if (request.method === 'GET' && pathname === '/api/loader/latest') {
      const release = (database.loaderReleases || []).find((item) => item.current && item.status === 'live');
      return release ? json(response, 200, publicLoaderRelease(release)) : json(response, 404, { error: 'No current loader release.' });
    }

    if (request.method === 'GET' && pathname === '/api/loader/download') {
      const release = (database.loaderReleases || []).find((item) => item.current && item.status === 'live');
      if (!release) return json(response, 404, { error: 'No current loader release.' });
      const filePath = path.join(LOADER_DIR, release.fileName);
      if (!fs.existsSync(filePath)) return json(response, 404, { error: 'Current loader file is unavailable.' });
      release.downloads = (release.downloads || 0) + 1;
      saveData();
      response.writeHead(200, { ...corsHeaders(), 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="${release.originalFileName || 'Arctic.exe'}"`, 'Content-Length': fs.statSync(filePath).size });
      fs.createReadStream(filePath).pipe(response);
      return;
    }

    // ── Public software endpoints (for loader + website) ──────────────────

    if (request.method === 'GET' && pathname === '/api/software') {
      const list = (database.software || []).filter((sw) => sw.status === 'live').map(publicSoftware);
      return json(response, 200, list);
    }

    const swImage = pathname.match(/^\/api\/software\/([^/]+)\/image$/);
    if (request.method === 'GET' && swImage) {
      const sw = (database.software || []).find((item) => item.id === decodeURIComponent(swImage[1]));
      if (!sw || !sw.imageFileName) return json(response, 404, { error: 'Image not found.' });
      if (sw.storageImagePath) {
        response.writeHead(302, { ...corsHeaders(), Location: storagePublicUrl(sw.storageImagePath) });
        response.end();
        return;
      }
      const imagePath = path.join(SOFTWARE_DIR, sw.imageFileName);
      if (!fs.existsSync(imagePath)) return json(response, 404, { error: 'Image not found on server.' });
      const ext = path.extname(sw.imageFileName).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.gif' ? 'image/gif' : ext === '.webp' ? 'image/webp' : 'image/png';
      response.writeHead(200, {
        ...corsHeaders(),
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=3600',
        'Content-Length': fs.statSync(imagePath).size,
      });
      fs.createReadStream(imagePath).pipe(response);
      return;
    }

    const swDownload = pathname.match(/^\/api\/software\/([^/]+)\/download$/);
    if (request.method === 'GET' && swDownload) {
      const sw = (database.software || []).find((item) => item.id === decodeURIComponent(swDownload[1]));
      if (!sw) return json(response, 404, { error: 'Software not found.' });

      // External URL download
      if (sw.downloadUrl && !sw.fileName) {
        sw.downloads = (sw.downloads || 0) + 1;
        saveData();
        return json(response, 200, { downloadUrl: sw.downloadUrl, software: publicSoftware(sw) });
      }

      // Storage-backed download (survives Render's ephemeral disk)
      if (sw.storagePath) {
        sw.downloads = (sw.downloads || 0) + 1;
        saveData();
        response.writeHead(302, { ...corsHeaders(), Location: storagePublicUrl(sw.storagePath) });
        response.end();
        return;
      }

      // Local file download
      if (!sw.fileName) return json(response, 404, { error: 'No file available for download.' });
      const filePath = path.join(SOFTWARE_DIR, sw.fileName);
      if (!fs.existsSync(filePath)) return json(response, 404, { error: 'File not found on server.' });

      sw.downloads = (sw.downloads || 0) + 1;
      saveData();

      const downloadName = sw.originalFileName || sw.fileName;
      response.writeHead(200, {
        ...corsHeaders(),
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${downloadName}"`,
        'Content-Length': fs.statSync(filePath).size,
      });
      fs.createReadStream(filePath).pipe(response);
      return;
    }

    return json(response, 404, { error: 'Not found.' });
  } catch (error) {
    console.error(error);
    return json(response, 400, { error: error.message || 'Request failed.' });
  }
}

dataReady = loadRemoteData().then(() => {
  ensureAdminRecord();
  if (!REMOTE_STATE_ENABLED) {
    console.warn('ARCTIC persistence: local file only. Use a Render persistent disk via ARCTIC_DATA_DIR or configure Supabase before production use.');
  }
}).catch((error) => {
  console.error(`Startup data load failed: ${error.message}`);
  ensureAdminRecord();
});

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
  console.log(`Key activation ping: ${KEY_PING_WEBHOOK_URL ? 'configured' : 'not configured'}`);
  console.log(`Staff orders Discord: ${STAFF_ORDER_WEBHOOK_URL ? 'configured' : 'not configured'}`);
  console.log(`Staff accounts: ${database.staffUsers.length}`);
});
