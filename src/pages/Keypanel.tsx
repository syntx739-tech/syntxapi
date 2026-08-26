import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Ban,
  Calendar,
  Check,
  ChevronDown,
  Copy,
  Download,
  Eye,
  FileCode,
  KeyRound,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  ShoppingCart,
  CheckCircle2,
  XCircle,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { arcticApi, type ApiCategory, type ApiKey, type ApiOrder, type ApiUser, type StaffAccount } from '../lib/api';

type PanelTab = 'overview' | 'keys' | 'loaders' | 'users' | 'staff' | 'orders';
type KeyStatus = 'active' | 'expired' | 'revoked';
type LoaderStatus = 'live' | 'draft' | 'offline';
type AccountStatus = 'active' | 'suspended' | 'pending';

type LicenseKey = {
  id: string;
  value: string;
  plan: string;
  category?: string | null;
  createdAt: string;
  expiresAt: string;
  status: KeyStatus;
  assignedTo?: string;
  uses: number;
  maxUses: number;
};

type LoaderItem = {
  id: string;
  name: string;
  version: string;
  game: string;
  platform: string;
  status: LoaderStatus;
  updatedAt: string;
  activeKeys: number;
  downloads: number;
  notes: string;
};

type Account = {
  id: string;
  username: string;
  password: string;
  plan: string;
  status: AccountStatus;
  registeredAt: string;
  key: string;
};

type StaffRow = {
  id: string;
  username: string;
  discordName: string;
  status: 'active' | 'suspended';
  createdAt: string;
  quotaUsed: number;
  quotaTotal: number;
};

type OrderStatus = ApiOrder['status'];

const TODAY = '2026-08-25T12:00:00.000Z';
const ADMIN_STORAGE_VERSION = 'empty-v3';

const INITIAL_KEYS: LicenseKey[] = []; /* Intentionally empty: keys are created by the admin. */
const INITIAL_LOADERS: LoaderItem[] = []; /* Intentionally empty: loaders are created by the admin. */
const INITIAL_ACCOUNTS: Account[] = []; /* Populated by the backend in the production app. */

const TABS: Array<{ id: PanelTab; label: string; icon: React.ElementType }> = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'keys', label: 'License Keys', icon: KeyRound },
  { id: 'loaders', label: 'Software', icon: Package },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'staff', label: 'Staff', icon: ShieldCheck },
];

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function randomSegment(length: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const values = new Uint32Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(values);
  } else {
    for (let index = 0; index < length; index += 1) values[index] = Math.random() * 100000;
  }
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('');
}

const PLAN_PREVIEW_CODES: Record<string, string> = {
  '1 Day': '1DAY',
  '7 Days': '7DAY',
  '30 Days': '30DAY',
  '90 Days': '90DAY',
  '1 Year': '1YEAR',
  Lifetime: 'LIFE',
  Team: 'TEAM',
  Trial: 'TRIAL',
};

function generateLicenseKey(prefix: string, plan: string): string {
  const planCode = PLAN_PREVIEW_CODES[plan] ?? 'PRO';
  return `${prefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'ARC'}-${planCode}-${randomSegment(4)}-${randomSegment(4)}`;
}

const PLAN_OPTIONS = ['Lifetime', '1 Day', '7 Days', '30 Days', '90 Days', '1 Year', 'Team', 'Trial'];
const EXPIRY_OPTIONS = [
  { value: 'lifetime', label: 'Never' },
  { value: '1', label: '1 day' },
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
];

function formatDate(value: string): string {
  if (value === 'Lifetime' || value === 'Never' || value === '—') return value;
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function mapApiKey(key: ApiKey): LicenseKey {
  return {
    id: key.id,
    value: key.value,
    plan: key.plan,
    category: key.category ?? null,
    createdAt: key.createdAt,
    expiresAt: key.expiresAt ?? 'Lifetime',
    status: key.status,
    assignedTo: key.assignedTo ?? undefined,
    uses: key.uses,
    maxUses: key.maxUses,
  };
}

function mapApiUser(user: ApiUser): Account {
  return {
    id: user.id,
    username: user.username,
    password: user.password || '********',
    plan: user.plan,
    status: user.status,
    registeredAt: user.registeredAt,
    key: user.key,
  };
}

function mapStaffRow(staff: StaffAccount): StaffRow {
  const used = staff.quota?.totals?.used ?? 0;
  const total = (staff.quota?.entries ?? []).reduce((sum, entry) => sum + entry.limit, 0);
  return {
    id: staff.id,
    username: staff.username,
    discordName: staff.discordName || '—',
    status: staff.status,
    createdAt: staff.createdAt,
    quotaUsed: used,
    quotaTotal: total,
  };
}

function StatusBadge({ status }: { status: KeyStatus | LoaderStatus | AccountStatus }) {
  const labels: Record<string, string> = {
    active: 'Active',
    expired: 'Expired',
    revoked: 'Revoked',
    live: 'Live',
    draft: 'Draft',
    offline: 'Offline',
    suspended: 'Suspended',
    pending: 'Pending',
  };
  const styles: Record<string, string> = {
    active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    live: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    expired: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    draft: 'text-arctic-400 bg-arctic-500/10 border-arctic-500/20',
    pending: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    revoked: 'text-red-400 bg-red-500/10 border-red-500/20',
    offline: 'text-frost-400 bg-frost-800/60 border-frost-700/40',
    suspended: 'text-red-400 bg-red-500/10 border-red-500/20',
  };

  return <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide', styles[status])}><span className="h-1.5 w-1.5 rounded-full bg-current" />{labels[status]}</span>;
}

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const labels: Record<OrderStatus, string> = { pending: 'Pending', fulfilled: 'Fulfilled', rejected: 'Rejected' };
  const styles: Record<OrderStatus, string> = {
    pending: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    fulfilled: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    rejected: 'text-red-400 bg-red-500/10 border-red-500/20',
  };
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide', styles[status])}><span className="h-1.5 w-1.5 rounded-full bg-current" />{labels[status]}</span>;
}

function MetricCard({ icon: Icon, label, value, detail, tone = 'arctic' }: { icon: React.ElementType; label: string; value: string; detail: string; tone?: 'arctic' | 'emerald' | 'violet' | 'amber' }) {
  const tones = {
    arctic: 'text-arctic-400 bg-arctic-500/10 border-arctic-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };
  return (
    <motion.div whileHover={{ y: -2 }} className="glass-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl border', tones[tone])}>
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight text-frost-100">{value}</p>
      <p className="mt-1 text-sm font-medium text-frost-300">{label}</p>
      <p className="mt-1 text-xs text-frost-600">{detail}</p>
    </motion.div>
  );
}

function SectionHeader({ icon: Icon, title, detail, action }: { icon: React.ElementType; title: string; detail?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <Icon size={16} className="text-arctic-400" />
        <div>
          <h3 className="text-sm font-semibold text-frost-100">{title}</h3>
          {detail && <p className="mt-0.5 text-xs text-frost-600">{detail}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function SelectField({ value, onChange, children, className }: { value: string; onChange: (value: string) => void; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="input appearance-none pr-9 text-sm">
        {children}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-frost-500" />
    </div>
  );
}

function Modal({ title, description, icon: Icon, onClose, children }: { title: string; description: string; icon: React.ElementType; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
        <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-frost-700/60 bg-frost-950/95 shadow-[0_25px_80px_rgba(0,0,0,0.65)]">
          <div className="flex items-start justify-between border-b border-frost-800/60 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-arctic-500/20 bg-arctic-500/10 text-arctic-400"><Icon size={17} /></div>
              <div>
                <h3 className="font-semibold text-frost-100">{title}</h3>
                <p className="mt-1 text-xs text-frost-500">{description}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-frost-500 transition-colors hover:bg-frost-800/60 hover:text-frost-200"><X size={15} /></button>
          </div>
          {children}
        </div>
      </motion.div>
    </>
  );
}

function KeyTable({ keys, onCopy, onRevoke, onDelete }: { keys: LicenseKey[]; onCopy: (value: string) => void; onRevoke: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left">
        <thead>
          <tr className="border-b border-frost-800/60 text-[10px] uppercase tracking-widest text-frost-600">
            <th className="px-4 py-3 font-semibold">License key</th>
            <th className="px-4 py-3 font-semibold">Plan</th>
            <th className="px-4 py-3 font-semibold">Category</th>
            <th className="px-4 py-3 font-semibold">Usage</th>
            <th className="px-4 py-3 font-semibold">Expires</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => (
            <tr key={key.id} className="border-b border-frost-800/30 last:border-0 hover:bg-frost-800/20">
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <code className="rounded-lg bg-frost-900/70 px-2.5 py-1.5 text-xs font-medium text-frost-200">{key.value}</code>
                  <button onClick={() => onCopy(key.value)} title="Copy key" className="rounded-lg p-1.5 text-frost-600 transition-colors hover:bg-frost-800 hover:text-arctic-400"><Copy size={13} /></button>
                </div>
                <p className="mt-1 text-[10px] text-frost-600">{key.assignedTo ? `Assigned to ${key.assignedTo}` : 'Unassigned'} · Created {formatDate(key.createdAt)}</p>
              </td>
              <td className="px-4 py-3.5 text-sm text-frost-300">{key.plan}</td>
              <td className="px-4 py-3.5">{key.category ? <span className="inline-flex items-center rounded-full border border-arctic-500/20 bg-arctic-500/10 px-2 py-0.5 text-[10px] font-medium text-arctic-400">{key.category}</span> : <span className="text-xs text-frost-600">—</span>}</td>
              <td className="px-4 py-3.5">
                <span className="text-sm font-medium text-frost-200">{key.uses} <span className="text-frost-600">/ {key.maxUses}</span></span>
                <div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-frost-800"><div className="h-full rounded-full bg-arctic-500" style={{ width: `${Math.min((key.uses / Math.max(key.maxUses, 1)) * 100, 100)}%` }} /></div>
              </td>
              <td className="px-4 py-3.5 text-xs text-frost-400">{formatDate(key.expiresAt)}</td>
              <td className="px-4 py-3.5"><StatusBadge status={key.status} /></td>
              <td className="px-4 py-3.5">
                <div className="flex justify-end gap-1">
                  {key.status === 'active' && <button onClick={() => onRevoke(key.id)} title="Revoke key" className="rounded-lg p-2 text-frost-600 transition-colors hover:bg-amber-500/10 hover:text-amber-400"><Ban size={14} /></button>}
                  <button onClick={() => onDelete(key.id)} title="Delete key" className="rounded-lg p-2 text-frost-600 transition-colors hover:bg-red-500/10 hover:text-red-400"><Trash2 size={14} /></button>
                  <button title="More actions" className="rounded-lg p-2 text-frost-600 transition-colors hover:bg-frost-800 hover:text-frost-300"><MoreHorizontal size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {keys.length === 0 && <div className="px-6 py-14 text-center text-sm text-frost-500">No license keys match this filter.</div>}
    </div>
  );
}

function LoaderTable({ loaders, onToggle, onDelete }: { loaders: LoaderItem[]; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left">
        <thead>
          <tr className="border-b border-frost-800/60 text-[10px] uppercase tracking-widest text-frost-600">
            <th className="px-4 py-3 font-semibold">Software</th>
            <th className="px-4 py-3 font-semibold">Target</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Active keys</th>
            <th className="px-4 py-3 font-semibold">Downloads</th>
            <th className="px-4 py-3 font-semibold">Updated</th>
            <th className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loaders.map((loader) => (
            <tr key={loader.id} className="border-b border-frost-800/30 last:border-0 hover:bg-frost-800/20">
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-arctic-500/20 bg-arctic-500/10 text-arctic-400"><FileCode size={16} /></div>
                  <div><p className="text-sm font-semibold text-frost-200">{loader.name}</p><p className="mt-0.5 text-[10px] text-frost-600">v{loader.version} · {loader.notes}</p></div>
                </div>
              </td>
              <td className="px-4 py-4"><p className="text-sm text-frost-300">{loader.game}</p><p className="mt-0.5 text-[10px] text-frost-600">{loader.platform}</p></td>
              <td className="px-4 py-4"><StatusBadge status={loader.status} /></td>
              <td className="px-4 py-4 text-sm font-medium text-frost-200">{loader.activeKeys}</td>
              <td className="px-4 py-4 text-sm text-frost-300">{formatNumber(loader.downloads)}</td>
              <td className="px-4 py-4 text-xs text-frost-500">{formatDate(loader.updatedAt)}</td>
              <td className="px-4 py-4"><div className="flex justify-end gap-1"><button onClick={() => onToggle(loader.id)} className="rounded-lg p-2 text-frost-600 transition-colors hover:bg-arctic-500/10 hover:text-arctic-400" title={loader.status === 'live' ? 'Take offline' : 'Set live'}><RefreshCw size={14} /></button><button onClick={() => onDelete(loader.id)} className="rounded-lg p-2 text-frost-600 transition-colors hover:bg-red-500/10 hover:text-red-400" title="Delete loader"><Trash2 size={14} /></button><button className="rounded-lg p-2 text-frost-600 transition-colors hover:bg-frost-800 hover:text-frost-300" title="More actions"><MoreHorizontal size={14} /></button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrderTable({ orders, onCopy, onFulfill, onReject }: { orders: ApiOrder[]; onCopy: (value: string) => void; onFulfill: (order: ApiOrder) => void; onReject: (id: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left">
        <thead>
          <tr className="border-b border-frost-800/60 text-[10px] uppercase tracking-widest text-frost-600">
            <th className="px-4 py-3 font-semibold">Staff member</th>
            <th className="px-4 py-3 font-semibold">Discord</th>
            <th className="px-4 py-3 font-semibold">Request</th>
            <th className="px-4 py-3 font-semibold">Placed</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b border-frost-800/30 last:border-0 hover:bg-frost-800/20">
              <td className="px-4 py-4"><p className="text-sm font-medium text-frost-200">{order.username}</p><p className="mt-0.5 text-[10px] text-frost-600">{order.id}</p></td>
              <td className="px-4 py-4 text-sm text-frost-300">{order.discordName}</td>
              <td className="px-4 py-4">
                <p className="text-sm font-medium text-frost-200">{order.items.map((item) => `${item.quantity}× ${item.plan}`).join(', ')}</p>
                {order.fulfilledKeys.length > 0 && <div className="mt-2 space-y-1">{order.fulfilledKeys.map((key) => <div key={key.id} className="flex items-center gap-2"><code className="rounded bg-frost-900/70 px-1.5 py-1 text-[10px] text-frost-300">{key.value}</code><button onClick={() => onCopy(key.value)} title="Copy fulfilled key" className="rounded p-1 text-frost-600 hover:bg-frost-800 hover:text-arctic-400"><Copy size={12} /></button></div>)}</div>}
              </td>
              <td className="px-4 py-4 text-xs text-frost-500">{formatDate(order.createdAt)}{order.fulfilledAt && <p className="mt-1 text-[10px] text-emerald-400">Fulfilled {formatDate(order.fulfilledAt)}</p>}</td>
              <td className="px-4 py-4"><OrderStatusBadge status={order.status} /></td>
              <td className="px-4 py-4"><div className="flex justify-end gap-1">{order.status === 'pending' && <><button onClick={() => onFulfill(order)} title="Fulfill order and generate keys" className="rounded-lg p-2 text-frost-600 transition-colors hover:bg-emerald-500/10 hover:text-emerald-400"><CheckCircle2 size={15} /></button><button onClick={() => onReject(order.id)} title="Reject order" className="rounded-lg p-2 text-frost-600 transition-colors hover:bg-red-500/10 hover:text-red-400"><XCircle size={15} /></button></>}</div></td>
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length === 0 && <div className="px-6 py-14 text-center text-sm text-frost-500">No staff orders have been placed yet.</div>}
    </div>
  );
}

function StaffTable({ staff, onToggleStatus, onDelete, onResetDevice }: { staff: StaffRow[]; onToggleStatus: (id: string) => void; onDelete: (id: string) => void; onResetDevice: (id: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left">
        <thead>
          <tr className="border-b border-frost-800/60 text-[10px] uppercase tracking-widest text-frost-600">
            <th className="px-4 py-3 font-semibold">Staff member</th>
            <th className="px-4 py-3 font-semibold">Discord</th>
            <th className="px-4 py-3 font-semibold">Quota used</th>
            <th className="px-4 py-3 font-semibold">Created</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((member) => (
            <tr key={member.id} className="border-b border-frost-800/30 last:border-0 hover:bg-frost-800/20">
              <td className="px-4 py-3.5"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-arctic-500 to-cyan-500 text-[10px] font-bold text-white">{member.username.slice(0, 2).toUpperCase()}</div><div><p className="text-sm font-medium text-frost-200">{member.username}</p><p className="mt-0.5 text-[10px] text-frost-600">{member.id.slice(0, 14)}</p></div></div></td>
              <td className="px-4 py-3.5 text-sm text-frost-300">{member.discordName}</td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2"><span className="text-sm font-medium text-frost-200">{member.quotaUsed} <span className="text-frost-600">/ {member.quotaTotal}</span></span><div className="h-1 w-16 overflow-hidden rounded-full bg-frost-800"><div className="h-full rounded-full bg-arctic-500" style={{ width: `${Math.min((member.quotaUsed / Math.max(member.quotaTotal, 1)) * 100, 100)}%` }} /></div></div>
              </td>
              <td className="px-4 py-3.5 text-xs text-frost-500">{formatDate(member.createdAt)}</td>
              <td className="px-4 py-3.5"><StatusBadge status={member.status} /></td>
              <td className="px-4 py-3.5"><div className="flex justify-end gap-1"><button onClick={() => onToggleStatus(member.id)} className="rounded-lg p-2 text-frost-600 transition-colors hover:bg-amber-500/10 hover:text-amber-400" title={member.status === 'suspended' ? 'Reactivate staff account' : 'Suspend staff account'}>{member.status === 'suspended' ? <Check size={14} /> : <Ban size={14} />}</button><button onClick={() => onResetDevice(member.id)} className="rounded-lg p-2 text-frost-600 transition-colors hover:bg-blue-500/10 hover:text-blue-400" title="Reset staff device binding"><RefreshCw size={14} /></button><button onClick={() => onDelete(member.id)} className="rounded-lg p-2 text-frost-600 transition-colors hover:bg-red-500/10 hover:text-red-400" title="Delete staff account"><Trash2 size={14} /></button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
      {staff.length === 0 && <div className="px-6 py-14 text-center text-sm text-frost-500">No staff accounts yet. Create one to let your team generate keys.</div>}
    </div>
  );
}

function AccountTable({ accounts, onToggleStatus }: { accounts: Account[]; onToggleStatus: (id: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left">
        <thead>
          <tr className="border-b border-frost-800/60 text-[10px] uppercase tracking-widest text-frost-600">
            <th className="px-4 py-3 font-semibold">User</th>
            <th className="px-4 py-3 font-semibold">Password</th>
            <th className="px-4 py-3 font-semibold">Registered</th>
            <th className="px-4 py-3 font-semibold">Key</th>
            <th className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => {
            const statusColor = account.status === 'active' ? 'text-emerald-400'
              : account.status === 'pending' ? 'text-amber-400'
              : 'text-red-400';
            return (
              <tr key={account.id} className="border-b border-frost-800/30 last:border-0 hover:bg-frost-800/20">
                <td className="px-4 py-3.5"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-arctic-500 to-cyan-500 text-[10px] font-bold text-white">{account.username.slice(0, 2).toUpperCase()}</div><div><p className="text-sm font-medium text-frost-200">{account.username}</p><p className={cn('mt-0.5 text-[10px] capitalize', statusColor)}>{account.status}</p></div></div></td>
                <td className="px-4 py-3.5"><code className="rounded-lg bg-frost-900/70 px-2.5 py-1.5 text-xs font-medium text-frost-300">{account.password || '—'}</code></td>
                <td className="px-4 py-3.5 text-xs text-frost-500">{formatDate(account.registeredAt)}</td>
                <td className="px-4 py-3.5"><div className="flex items-center gap-2"><code className="rounded-lg bg-frost-900/70 px-2.5 py-1.5 text-xs font-medium text-frost-200">{account.key || '—'}</code><span className="text-[10px] font-medium text-arctic-400">{account.plan}</span></div></td>
                <td className="px-4 py-3.5"><div className="flex justify-end gap-1"><button onClick={() => onToggleStatus(account.id)} className="rounded-lg p-2 text-frost-600 transition-colors hover:bg-amber-500/10 hover:text-amber-400" title={account.status === 'suspended' ? 'Reactivate account' : 'Suspend account'}>{account.status === 'suspended' ? <Check size={14} /> : <Ban size={14} />}</button><button className="rounded-lg p-2 text-frost-600 transition-colors hover:bg-frost-800 hover:text-frost-300" title="View account"><Eye size={14} /></button><button className="rounded-lg p-2 text-frost-600 transition-colors hover:bg-frost-800 hover:text-frost-300" title="More actions"><MoreHorizontal size={14} /></button></div></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {accounts.length === 0 && <div className="px-6 py-14 text-center text-sm text-frost-500">No registered users match this search.</div>}
    </div>
  );
}

const STORAGE_KEYS = {
  keys: 'arctic-admin-license-keys',
  loaders: 'arctic-admin-loaders',
  accounts: 'arctic-admin-accounts',
};

function readStoredList<T>(key: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T[] : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredList<T>(key: string, value: T[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local storage may be unavailable in private or restricted browser contexts.
  }
}

export function Keypanel() {
  const [activeTab, setActiveTab] = useState<PanelTab>('overview');
  const [keys, setKeys] = useState<LicenseKey[]>(() => readStoredList(`${STORAGE_KEYS.keys}-${ADMIN_STORAGE_VERSION}`, INITIAL_KEYS));
  const [loaders, setLoaders] = useState<LoaderItem[]>(() => readStoredList(`${STORAGE_KEYS.loaders}-${ADMIN_STORAGE_VERSION}`, INITIAL_LOADERS));
  const [accounts, setAccounts] = useState<Account[]>(() => readStoredList(`${STORAGE_KEYS.accounts}-${ADMIN_STORAGE_VERSION}`, INITIAL_ACCOUNTS));
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [keySearch, setKeySearch] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [keyFilter, setKeyFilter] = useState<'all' | KeyStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState<'all' | AccountStatus>('all');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showLoaderModal, setShowLoaderModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);
  const [orderCategory, setOrderCategory] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [keyForm, setKeyForm] = useState({ quantity: '5', plan: 'Lifetime', expiry: 'lifetime', maxUses: '1', prefix: 'ARC', category: '' });
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    registeredAt: new Date().toISOString().slice(0, 10),
    plan: 'Lifetime',
    key: '',
  });
  const [loaderForm, setLoaderForm] = useState({ name: '', version: '', game: 'Multi-game', platform: 'Windows', notes: '' });
  const [staffForm, setStaffForm] = useState({ username: '', password: '', discordName: '' });

  const syncApiData = async () => {
    try {
      const [remoteKeys, remoteUsers, remoteStaff, remoteCategories, remoteOrders] = await Promise.all([
        arcticApi.getKeys(),
        arcticApi.getUsers(),
        arcticApi.getStaff(),
        arcticApi.getCategories(),
        arcticApi.getOrders(),
      ]);
      setKeys(remoteKeys.map(mapApiKey));
      setAccounts(remoteUsers.map(mapApiUser));
      setStaff(remoteStaff.map(mapStaffRow));
      setCategories(remoteCategories);
      setOrders(remoteOrders);
      setApiOnline(true);
      return true;
    } catch {
      setApiOnline(false);
      return false;
    }
  };

  useEffect(() => {
    void syncApiData();
  }, []);

  useEffect(() => {
    writeStoredList(`${STORAGE_KEYS.keys}-${ADMIN_STORAGE_VERSION}`, keys);
    writeStoredList(`${STORAGE_KEYS.loaders}-${ADMIN_STORAGE_VERSION}`, loaders);
    writeStoredList(`${STORAGE_KEYS.accounts}-${ADMIN_STORAGE_VERSION}`, accounts);
  }, [accounts, keys, loaders]);

  const activeKeys = keys.filter((key) => key.status === 'active').length;
  const activeLoaders = loaders.filter((loader) => loader.status === 'live').length;
  const activeUsers = accounts.filter((account) => account.status === 'active').length;
  const pendingOrders = orders.filter((order) => order.status === 'pending').length;
  const totalActivations = keys.reduce((sum, key) => sum + key.uses, 0);

  const filteredKeys = useMemo(() => keys.filter((key) => {
    const query = keySearch.toLowerCase();
    const matchesSearch = !query || [key.value, key.plan, key.category ?? '', key.assignedTo ?? ''].some((value) => value.toLowerCase().includes(query));
    const matchesCategory = categoryFilter === 'all' || (key.category ?? '') === categoryFilter;
    return matchesSearch && (keyFilter === 'all' || key.status === keyFilter) && matchesCategory;
  }), [keys, keyFilter, keySearch, categoryFilter]);

  const filteredAccounts = useMemo(() => accounts.filter((account) => {
    const query = accountSearch.toLowerCase();
    const matchesSearch = !query || [account.username, account.password, account.key, account.plan].some((value) => value.toLowerCase().includes(query));
    return matchesSearch && (accountFilter === 'all' || account.status === accountFilter);
  }), [accounts, accountFilter, accountSearch]);

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('License key copied');
    } catch {
      toast.error('Clipboard access is unavailable');
    }
  };

  const exportData = () => {
    const payload = JSON.stringify({ keys, loaders, accounts, orders, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'arctic-admin-export.json';
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Admin data exported');
  };

  const generateKeys = async () => {
    const quantity = Math.max(Number.parseInt(keyForm.quantity, 10) || 1, 1);
    try {
      const generated = await arcticApi.generateKeys({
        plan: keyForm.plan,
        expiry: keyForm.expiry,
        maxUses: Math.max(Number.parseInt(keyForm.maxUses, 10) || 1, 1),
        prefix: keyForm.prefix,
        quantity,
        category: keyForm.category,
      });
      setKeys((current) => [...generated.map(mapApiKey), ...current]);
      setApiOnline(true);
      setShowKeyModal(false);
      setActiveTab('keys');
      toast.success(`${quantity} license ${quantity === 1 ? 'key' : 'keys'} generated`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not generate license keys');
    }
  };

  const createLoader = () => {
    if (!loaderForm.name.trim() || !loaderForm.version.trim()) {
      toast.error('Software name and version are required');
      return;
    }
    const newLoader: LoaderItem = {
      id: makeId('loader'),
      name: loaderForm.name.trim(),
      version: loaderForm.version.trim(),
      game: loaderForm.game,
      platform: loaderForm.platform,
      status: 'draft',
      updatedAt: new Date().toISOString(),
      activeKeys: 0,
      downloads: 0,
      notes: loaderForm.notes.trim() || 'New draft build',
    };
    setLoaders((current) => [newLoader, ...current]);
    setLoaderForm({ name: '', version: '', game: 'Multi-game', platform: 'Windows', notes: '' });
    setShowLoaderModal(false);
    setActiveTab('loaders');
    toast.success('Software added as draft');
  };

  const createUser = async () => {
    const username = userForm.username.trim();
    const password = userForm.password;
    const key = userForm.key.trim();

    if (!username || !password || !key) {
      toast.error('Username, password, and key are required');
      return;
    }

    const registeredAt = userForm.registeredAt
      ? new Date(`${userForm.registeredAt}T00:00:00`).toISOString()
      : new Date().toISOString();

    try {
      const created = await arcticApi.registerUser({ username, password, key, registeredAt });
      setAccounts((current) => [mapApiUser(created), ...current]);
      setApiOnline(true);
      setUserForm({
        username: '',
        password: '',
        registeredAt: new Date().toISOString().slice(0, 10),
        plan: 'Lifetime',
        key: '',
      });
      setShowUserModal(false);
      setActiveTab('users');
      toast.success(`User ${username} added`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add user');
    }
  };

  const revokeKey = async (id: string) => {
    try {
      await arcticApi.revokeKey(id);
      setKeys((current) => current.map((key) => key.id === id ? { ...key, status: 'revoked' } : key));
      setApiOnline(true);
      toast.success('License key revoked');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not revoke license key');
    }
  };

  const deleteKey = async (id: string) => {
    try {
      await arcticApi.deleteKey(id);
      setKeys((current) => current.filter((key) => key.id !== id));
      setApiOnline(true);
      toast.success('License key deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete license key');
    }
  };

  const toggleLoader = (id: string) => {
    setLoaders((current) => current.map((loader) => loader.id === id ? { ...loader, status: loader.status === 'live' ? 'offline' : 'live', updatedAt: new Date().toISOString() } : loader));
    toast.success('Software status updated');
  };

  const deleteLoader = (id: string) => {
    setLoaders((current) => current.filter((loader) => loader.id !== id));
    toast.success('Software removed');
  };

  const openFulfillOrder = (order: ApiOrder) => {
    setSelectedOrder(order);
    setOrderCategory('');
    setShowOrderModal(true);
  };

  const fulfillOrder = async () => {
    if (!selectedOrder) return;
    try {
      const result = await arcticApi.fulfillOrder(selectedOrder.id, orderCategory);
      setOrders((current) => current.map((order) => order.id === result.order.id ? result.order : order));
      setKeys((current) => [...result.keys.map(mapApiKey), ...current]);
      setShowOrderModal(false);
      setSelectedOrder(null);
      setOrderCategory('');
      setApiOnline(true);
      toast.success(`${result.keys.length} key${result.keys.length === 1 ? '' : 's'} generated and allocated to ${result.order.username}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not fulfill order');
    }
  };

  const rejectOrder = async (id: string) => {
    const order = orders.find((item) => item.id === id);
    if (!order) return;
    try {
      const updated = await arcticApi.rejectOrder(id);
      setOrders((current) => current.map((item) => item.id === updated.id ? updated : item));
      setApiOnline(true);
      toast.success(`Order from ${order.username} rejected`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not reject order');
    }
  };

  const createStaff = async () => {
    const username = staffForm.username.trim();
    const password = staffForm.password;
    if (!username || !password) {
      toast.error('Username and password are required');
      return;
    }
    try {
      const created = await arcticApi.createStaff({ username, password, discordName: staffForm.discordName.trim() });
      setStaff((current) => [mapStaffRow(created), ...current]);
      setApiOnline(true);
      setStaffForm({ username: '', password: '', discordName: '' });
      setShowStaffModal(false);
      setActiveTab('staff');
      toast.success(`Staff account ${username} created — works on the staff website`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create staff account');
    }
  };

  const toggleStaffStatus = async (id: string) => {
    const member = staff.find((item) => item.id === id);
    if (!member) return;
    const nextStatus: 'active' | 'suspended' = member.status === 'suspended' ? 'active' : 'suspended';
    try {
      await arcticApi.setStaffStatus(id, nextStatus);
      setStaff((current) => current.map((item) => item.id === id ? { ...item, status: nextStatus } : item));
      setApiOnline(true);
      toast.success(`Staff account ${member.username} ${nextStatus === 'active' ? 'reactivated' : 'suspended'}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update staff account');
    }
  };

  const deleteStaff = async (id: string) => {
    const member = staff.find((item) => item.id === id);
    if (!member) return;
    try {
      await arcticApi.deleteStaff(id);
      setStaff((current) => current.filter((item) => item.id !== id));
      setApiOnline(true);
      toast.success(`Staff account ${member.username} deleted`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete staff account');
    }
  };

  const resetStaffDevice = async (id: string) => {
    const member = staff.find((item) => item.id === id);
    if (!member) return;
    try {
      await arcticApi.resetStaffDevice(id);
      setApiOnline(true);
      toast.success(`Device binding reset for ${member.username}. They can log in from any device now.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not reset device binding');
    }
  };

  const createCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      toast.error('Category name is required');
      return;
    }
    try {
      const created = await arcticApi.createCategory(name);
      setCategories((current) => [...current, created]);
      setNewCategoryName('');
      setApiOnline(true);
      toast.success(`Category "${name}" created`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create category');
    }
  };

  const deleteCategory = async (id: string) => {
    const category = categories.find((item) => item.id === id);
    if (!category) return;
    try {
      await arcticApi.deleteCategory(id);
      setCategories((current) => current.filter((item) => item.id !== id));
      if (categoryFilter === category.name) setCategoryFilter('all');
      setApiOnline(true);
      toast.success(`Category "${category.name}" deleted — existing keys keep their label`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete category');
    }
  };

  const toggleAccountStatus = async (id: string) => {
    const account = accounts.find((item) => item.id === id);
    if (!account) return;

    const nextStatus: AccountStatus = account.status === 'suspended' ? 'active' : 'suspended';
    try {
      await arcticApi.setUserStatus(id, nextStatus);
      setAccounts((current) => current.map((item) => item.id === id ? { ...item, status: nextStatus } : item));
      setApiOnline(true);
      toast.success('User status updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update user status');
    }
  };

  const renderTabContent = () => {
    if (activeTab === 'overview') {
      return (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="glass-card xl:col-span-2">
            <SectionHeader icon={Zap} title="Quick actions" detail="Common licensing and distribution controls" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button onClick={() => setShowKeyModal(true)} className="group rounded-xl border border-arctic-500/20 bg-arctic-500/10 p-4 text-left transition-all hover:border-arctic-400/40 hover:bg-arctic-500/15"><div className="mb-5 flex h-9 w-9 items-center justify-center rounded-lg bg-arctic-500/20 text-arctic-400"><KeyRound size={17} /></div><p className="text-sm font-semibold text-frost-100">Generate keys</p><p className="mt-1 text-xs leading-relaxed text-frost-500">Create a single key or a batch with expiry rules.</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-arctic-400">Open generator <span className="transition-transform group-hover:translate-x-1">→</span></span></button>
              <button onClick={() => setShowLoaderModal(true)} className="group rounded-xl border border-violet-500/20 bg-violet-500/10 p-4 text-left transition-all hover:border-violet-400/40 hover:bg-violet-500/15"><div className="mb-5 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/20 text-violet-400"><Package size={17} /></div><p className="text-sm font-semibold text-frost-100">Add software</p><p className="mt-1 text-xs leading-relaxed text-frost-500">Register a new build and publish it when ready.</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-violet-400">Create draft <span className="transition-transform group-hover:translate-x-1">→</span></span></button>
              <button onClick={exportData} className="group rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-left transition-all hover:border-emerald-400/40 hover:bg-emerald-500/15"><div className="mb-5 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400"><Download size={17} /></div><p className="text-sm font-semibold text-frost-100">Export data</p><p className="mt-1 text-xs leading-relaxed text-frost-500">Download keys, loaders, and user records as JSON.</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-emerald-400">Download export <span className="transition-transform group-hover:translate-x-1">→</span></span></button>
            </div>
          </div>

          <div className="glass-card">
            <SectionHeader icon={ShieldCheck} title="License health" detail="Current key distribution" />
            <div className="space-y-4">
              {[
                { label: 'Active', value: activeKeys, color: 'bg-emerald-400', text: 'text-emerald-400' },
                { label: 'Expired', value: keys.filter((key) => key.status === 'expired').length, color: 'bg-amber-400', text: 'text-amber-400' },
                { label: 'Revoked', value: keys.filter((key) => key.status === 'revoked').length, color: 'bg-red-400', text: 'text-red-400' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-frost-400"><span className={cn('h-2 w-2 rounded-full', item.color)} />{item.label}</span><span className={cn('font-semibold', item.text)}>{item.value}</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-frost-800"><div className={cn('h-full rounded-full', item.color)} style={{ width: `${Math.max((item.value / Math.max(keys.length, 1)) * 100, 3)}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-arctic-500/15 bg-arctic-500/5 px-3 py-2.5 text-xs text-frost-400"><ShieldCheck size={14} className="text-arctic-400" /> Key issuance is operating normally.</div>
          </div>

          <div className="glass-card xl:col-span-2">
            <SectionHeader icon={Users} title="Recently registered users" detail="Latest users in the control plane" action={<button onClick={() => setActiveTab('users')} className="text-xs font-medium text-arctic-400 hover:text-arctic-300">View all</button>} />
            <AccountTable accounts={accounts.slice(0, 4)} onToggleStatus={toggleAccountStatus} />
          </div>

          <div className="glass-card">
            <SectionHeader icon={Server} title="Software status" detail={`${activeLoaders} of ${loaders.length} software live`} action={<button onClick={() => setActiveTab('loaders')} className="text-xs font-medium text-arctic-400 hover:text-arctic-300">Manage</button>} />
            <div className="space-y-3">
              {loaders.map((loader) => (
                <div key={loader.id} className="flex items-center gap-3 rounded-xl border border-frost-800/50 bg-frost-900/30 p-3"><div className={cn('h-2 w-2 rounded-full', loader.status === 'live' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]' : loader.status === 'draft' ? 'bg-arctic-400' : 'bg-frost-600')} /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-frost-200">{loader.name}</p><p className="mt-0.5 text-[10px] text-frost-600">v{loader.version} · {formatNumber(loader.downloads)} downloads</p></div><StatusBadge status={loader.status} /></div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'orders') {
      return (
        <div className="glass-card overflow-hidden p-0">
          <div className="flex flex-col gap-3 border-b border-frost-800/60 p-4 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="text-sm font-semibold text-frost-100">Staff orders</h3><p className="mt-1 text-xs text-frost-600">Review requests from staff and issue the requested keys directly to their account.</p></div><div className="flex items-center gap-2 text-xs text-frost-500"><span className="h-2 w-2 rounded-full bg-amber-400" />{pendingOrders} pending</div></div>
          <OrderTable orders={orders} onCopy={copyToClipboard} onFulfill={openFulfillOrder} onReject={rejectOrder} />
        </div>
      );
    }

    if (activeTab === 'staff') {
      return (
        <div className="glass-card overflow-hidden p-0">
          <div className="flex flex-col gap-3 border-b border-frost-800/60 p-4 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="text-sm font-semibold text-frost-100">Staff accounts</h3><p className="mt-1 text-xs text-frost-600">Accounts created here can sign in on the staff website and generate keys within their quota.</p></div><button onClick={() => setShowStaffModal(true)} className="btn-primary py-2 text-xs"><UserPlus size={14} /> Add staff</button></div>
          <StaffTable staff={staff} onToggleStatus={toggleStaffStatus} onDelete={deleteStaff} onResetDevice={resetStaffDevice} />
        </div>
      );
    }

    if (activeTab === 'keys') {
      return (
        <div className="glass-card overflow-hidden p-0">
          <div className="flex flex-col gap-3 border-b border-frost-800/60 p-4 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="text-sm font-semibold text-frost-100">License inventory</h3><p className="mt-1 text-xs text-frost-600">Generate, search, revoke, and remove software access keys.</p></div><div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-frost-600" /><input value={keySearch} onChange={(event) => setKeySearch(event.target.value)} className="input py-2 pl-9 text-xs sm:w-64" placeholder="Search keys or users..." /></div><SelectField value={categoryFilter} onChange={(value) => setCategoryFilter(value)} className="sm:w-36"><option value="all">All categories</option>{categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</SelectField><SelectField value={keyFilter} onChange={(value) => setKeyFilter(value as 'all' | KeyStatus)} className="sm:w-32"><option value="all">All status</option><option value="active">Active</option><option value="expired">Expired</option><option value="revoked">Revoked</option></SelectField><button onClick={() => setShowCategoryModal(true)} className="btn-secondary py-2 text-xs"><MoreHorizontal size={14} /> Categories</button><button onClick={() => setShowKeyModal(true)} className="btn-primary py-2 text-xs"><Plus size={14} /> Generate</button></div></div>
          <KeyTable keys={filteredKeys} onCopy={copyToClipboard} onRevoke={revokeKey} onDelete={deleteKey} />
        </div>
      );
    }

    if (activeTab === 'loaders') {
      return (
        <div className="glass-card overflow-hidden p-0">
          <div className="flex flex-col gap-3 border-b border-frost-800/60 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-semibold text-frost-100">Software registry</h3><p className="mt-1 text-xs text-frost-600">Manage registered builds and their release state.</p></div><button onClick={() => setShowLoaderModal(true)} className="btn-primary py-2 text-xs sm:w-auto"><Plus size={14} /> Add software</button></div>
          <LoaderTable loaders={loaders} onToggle={toggleLoader} onDelete={deleteLoader} />
        </div>
      );
    }

    return (
      <div className="glass-card overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-frost-800/60 p-4 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="text-sm font-semibold text-frost-100">Registered users</h3><p className="mt-1 text-xs text-frost-600">Every user currently known to this local admin workspace.</p></div><div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-frost-600" /><input value={accountSearch} onChange={(event) => setAccountSearch(event.target.value)} className="input py-2 pl-9 text-xs sm:w-64" placeholder="Search username, password, or key..." /></div><SelectField value={accountFilter} onChange={(value) => setAccountFilter(value as 'all' | AccountStatus)} className="sm:w-32"><option value="all">All status</option><option value="active">Active</option><option value="pending">Pending</option><option value="suspended">Suspended</option></SelectField><button onClick={() => setShowUserModal(true)} className="btn-primary py-2 text-xs"><UserPlus size={14} /> Add user</button></div></div>
        <AccountTable accounts={filteredAccounts} onToggleStatus={toggleAccountStatus} />
      </div>
    );
  };

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-[1500px] space-y-6 p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-arctic-400"><span className="h-1.5 w-1.5 rounded-full bg-arctic-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />Admin console <span className="text-frost-700">/</span> License control</div>
            <h1 className="text-2xl font-bold tracking-tight text-frost-50 sm:text-3xl">Software Control Center</h1>
            <p className="mt-1.5 max-w-2xl text-sm text-frost-500">Manage license keys, registered software builds, and every user in one place.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />Admin session active</span><span className={cn('inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium', apiOnline === true ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : apiOnline === false ? 'border-amber-500/20 bg-amber-500/10 text-amber-400' : 'border-frost-700/50 bg-frost-800/40 text-frost-400')}><span className={cn('h-1.5 w-1.5 rounded-full', apiOnline === true ? 'bg-emerald-400' : apiOnline === false ? 'bg-amber-400' : 'bg-frost-400')} />{apiOnline === true ? 'API connected' : apiOnline === false ? 'API offline' : 'Connecting API...'}</span><button onClick={() => void syncApiData()} className="btn-secondary py-2 text-xs" title="Refresh API data"><RefreshCw size={14} /> Refresh</button><button onClick={exportData} className="btn-secondary py-2 text-xs"><Upload size={14} /> Export</button></div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><MetricCard icon={KeyRound} label="License keys" value={formatNumber(keys.length)} detail={`${activeKeys} active right now`} tone="arctic" /><MetricCard icon={Package} label="Live software" value={`${activeLoaders}/${loaders.length}`} detail="Registered builds" tone="violet" /><MetricCard icon={Users} label="Users" value={formatNumber(accounts.length)} detail={`${activeUsers} active users`} tone="emerald" /><MetricCard icon={Activity} label="Total activations" value={formatNumber(totalActivations)} detail="Across all license keys" tone="amber" /></div>

        <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-frost-800/50 bg-frost-950/50 p-1.5"><div className="flex min-w-0 flex-1 flex-wrap gap-1">{TABS.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setActiveTab(id)} className={cn('inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all sm:px-4', activeTab === id ? 'bg-arctic-500/15 text-arctic-300 shadow-sm' : 'text-frost-500 hover:bg-frost-800/50 hover:text-frost-200')}><Icon size={14} />{label}{id === 'keys' && <span className="rounded-md bg-frost-800/70 px-1.5 py-0.5 text-[10px] text-frost-500">{keys.length}</span>}{id === 'users' && <span className="rounded-md bg-frost-800/70 px-1.5 py-0.5 text-[10px] text-frost-500">{accounts.length}</span>}{id === 'orders' && <span className={cn('rounded-md px-1.5 py-0.5 text-[10px]', pendingOrders > 0 ? 'bg-amber-500/15 text-amber-400' : 'bg-frost-800/70 text-frost-500')}>{pendingOrders}</span>}</button>)}</div><div className="hidden items-center gap-2 px-3 text-[10px] text-frost-600 lg:flex"><Calendar size={13} /> Updated {formatDate(TODAY)}</div></div>

        {renderTabContent()}
      </div>

      {showOrderModal && selectedOrder && (
        <Modal title="Fulfill staff order" description="Generate the requested keys and allocate them to the requesting staff account." icon={ShoppingCart} onClose={() => { setShowOrderModal(false); setSelectedOrder(null); }}>
          <div className="space-y-4 p-5">
            <div className="rounded-xl border border-frost-800/60 bg-frost-900/40 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-frost-100">{selectedOrder.username}</p><p className="mt-1 text-xs text-frost-500">{selectedOrder.discordName}</p></div><OrderStatusBadge status={selectedOrder.status} /></div><div className="mt-4 flex flex-wrap gap-2">{selectedOrder.items.map((item) => <span key={item.plan} className="rounded-lg border border-arctic-500/20 bg-arctic-500/10 px-2.5 py-1.5 text-xs font-medium text-arctic-300">{item.quantity}× {item.plan}</span>)}</div></div>
            <div><label className="label">Category for generated keys</label><SelectField value={orderCategory} onChange={(value) => setOrderCategory(value)}><option value="">No category</option>{categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</SelectField><p className="mt-1.5 text-[10px] text-frost-600">The selected label is applied to every key in this order. The keys become visible on the staff website after fulfillment.</p></div>
          </div>
          <div className="flex gap-2 border-t border-frost-800/60 px-5 py-4"><button onClick={() => { setShowOrderModal(false); setSelectedOrder(null); }} className="btn-secondary flex-1 text-xs">Cancel</button><button onClick={fulfillOrder} className="btn-primary flex-1 text-xs"><CheckCircle2 size={14} /> Fulfill and generate</button></div>
        </Modal>
      )}

      {showKeyModal && (
        <Modal title="Generate license keys" description="Create one-time or reusable access keys for your loader." icon={KeyRound} onClose={() => setShowKeyModal(false)}>
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3"><div><label className="label">Quantity</label><input value={keyForm.quantity} onChange={(event) => setKeyForm({ ...keyForm, quantity: event.target.value })} className="input text-sm" type="number" min="1" /></div><div><label className="label">Plan</label><SelectField value={keyForm.plan} onChange={(value) => setKeyForm({ ...keyForm, plan: value })}>{PLAN_OPTIONS.map((plan) => <option key={plan}>{plan}</option>)}</SelectField></div></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="label">Expiry</label><SelectField value={keyForm.expiry} onChange={(value) => setKeyForm({ ...keyForm, expiry: value })}>{EXPIRY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectField></div><div><label className="label">Max activations</label><input value={keyForm.maxUses} onChange={(event) => setKeyForm({ ...keyForm, maxUses: event.target.value })} className="input text-sm" type="number" min="1" /></div></div>
            <div><label className="label">Key prefix</label><input value={keyForm.prefix} onChange={(event) => setKeyForm({ ...keyForm, prefix: event.target.value })} className="input text-sm uppercase" maxLength={6} /><p className="mt-1.5 text-[10px] text-frost-600">Preview: {keyForm.prefix.toUpperCase() || 'ARC'}-{PLAN_PREVIEW_CODES[keyForm.plan] ?? 'PRO'}-XXXX-XXXX</p></div>
            <div><label className="label">Category</label><SelectField value={keyForm.category} onChange={(value) => setKeyForm({ ...keyForm, category: value })}><option value="">No category</option>{categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</SelectField><p className="mt-1.5 text-[10px] text-frost-600">Labels this batch, e.g. a reseller name, to keep keys clean and sorted.</p></div>
          </div>
          <div className="flex gap-2 border-t border-frost-800/60 px-5 py-4"><button onClick={() => setShowKeyModal(false)} className="btn-secondary flex-1 text-xs">Cancel</button><button onClick={generateKeys} className="btn-primary flex-1 text-xs"><KeyRound size={14} /> Generate keys</button></div>
        </Modal>
      )}

      {showUserModal && (
        <Modal title="Add user" description="Register a user with credentials, creation date, and license key." icon={UserPlus} onClose={() => setShowUserModal(false)}>
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Username *</label>
                <input autoFocus value={userForm.username} onChange={(event) => setUserForm({ ...userForm, username: event.target.value })} className="input text-sm" placeholder="Username" />
              </div>
              <div>
                <label className="label">Password *</label>
                <input value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} className="input text-sm" placeholder="Password" type="password" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Created date</label>
                <input value={userForm.registeredAt} onChange={(event) => setUserForm({ ...userForm, registeredAt: event.target.value })} className="input text-sm" type="date" />
              </div>
              <div>
                <label className="label">Key type</label>
                <SelectField value={userForm.plan} onChange={(value) => setUserForm({ ...userForm, plan: value })}>
                  {PLAN_OPTIONS.map((plan) => <option key={plan}>{plan}</option>)}
                </SelectField>
              </div>
            </div>
            <div>
              <label className="label">License key *</label>
              <input value={userForm.key} onChange={(event) => setUserForm({ ...userForm, key: event.target.value })} className="input text-sm font-mono" placeholder="ARC-LIFE-XXXX-XXXX" />
            </div>
          </div>
          <div className="flex gap-2 border-t border-frost-800/60 px-5 py-4">
            <button onClick={() => setShowUserModal(false)} className="btn-secondary flex-1 text-xs">Cancel</button>
            <button onClick={createUser} className="btn-primary flex-1 text-xs"><UserPlus size={14} /> Add user</button>
          </div>
        </Modal>
      )}

      {showStaffModal && (
        <Modal title="Add staff account" description="Create an account that can sign in on the staff website and generate keys within its quota." icon={ShieldCheck} onClose={() => setShowStaffModal(false)}>
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Username *</label>
                <input autoFocus value={staffForm.username} onChange={(event) => setStaffForm({ ...staffForm, username: event.target.value })} className="input text-sm" placeholder="Staff username" />
              </div>
              <div>
                <label className="label">Password *</label>
                <input value={staffForm.password} onChange={(event) => setStaffForm({ ...staffForm, password: event.target.value })} className="input text-sm" placeholder="Password" type="password" />
              </div>
            </div>
            <div>
              <label className="label">Discord name</label>
              <input value={staffForm.discordName} onChange={(event) => setStaffForm({ ...staffForm, discordName: event.target.value })} className="input text-sm" placeholder="e.g. max.mustermann" />
              <p className="mt-1.5 text-[10px] text-frost-600">Appears in the Discord order message when this staff member orders keys.</p>
            </div>
            <div className="rounded-xl border border-arctic-500/15 bg-arctic-500/5 px-3 py-2.5 text-xs text-frost-400"><ShieldCheck size={13} className="mr-1.5 inline text-arctic-400" />Quota: 5× 1 Day · 3× 7 Days · 2× 30 Days · 1× 90 Days · 1× 1 Year · 1× Lifetime</div>
          </div>
          <div className="flex gap-2 border-t border-frost-800/60 px-5 py-4">
            <button onClick={() => setShowStaffModal(false)} className="btn-secondary flex-1 text-xs">Cancel</button>
            <button onClick={createStaff} className="btn-primary flex-1 text-xs"><UserPlus size={14} /> Add staff account</button>
          </div>
        </Modal>
      )}

      {showCategoryModal && (
        <Modal title="Manage categories" description="Create and remove key categories to keep your inventory clean and sorted." icon={MoreHorizontal} onClose={() => setShowCategoryModal(false)}>
          <div className="space-y-4 p-5">
            <div className="flex gap-2">
              <input autoFocus value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void createCategory(); } }} className="input text-sm" placeholder="e.g. Reseller XY" />
              <button onClick={createCategory} className="btn-primary shrink-0 px-4 text-xs"><Plus size={14} /> Add</button>
            </div>
            <div className="space-y-2">
              {categories.length === 0 && <p className="py-6 text-center text-sm text-frost-500">No categories yet. Create your first one above.</p>}
              {categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between rounded-xl border border-frost-700/30 bg-frost-800/30 px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5"><span className="inline-flex h-2 w-2 rounded-full bg-arctic-400" /><span className="text-sm font-medium text-frost-200">{category.name}</span></div>
                  <button onClick={() => deleteCategory(category.id)} className="rounded-lg p-1.5 text-frost-600 transition-colors hover:bg-red-500/10 hover:text-red-400" title={`Delete category ${category.name}`}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <p className="text-[11px] leading-relaxed text-frost-600">Deleting a category only removes it from this list — keys that already carry the label keep it.</p>
          </div>
        </Modal>
      )}

      {showLoaderModal && (
        <Modal title="Add software build" description="Register a build in the software registry as a draft." icon={Package} onClose={() => setShowLoaderModal(false)}>
          <div className="space-y-4 p-5"><div className="grid grid-cols-2 gap-3"><div><label className="label">Software name *</label><input autoFocus value={loaderForm.name} onChange={(event) => setLoaderForm({ ...loaderForm, name: event.target.value })} className="input text-sm" placeholder="e.g. Arctic Core" /></div><div><label className="label">Version *</label><input value={loaderForm.version} onChange={(event) => setLoaderForm({ ...loaderForm, version: event.target.value })} className="input text-sm" placeholder="e.g. 2.5.0" /></div></div><div className="grid grid-cols-2 gap-3"><div><label className="label">Target</label><SelectField value={loaderForm.game} onChange={(value) => setLoaderForm({ ...loaderForm, game: value })}><option>Multi-game</option><option>Game client</option><option>Legacy</option><option>Internal</option></SelectField></div><div><label className="label">Platform</label><SelectField value={loaderForm.platform} onChange={(value) => setLoaderForm({ ...loaderForm, platform: value })}><option>Windows</option><option>Linux</option><option>macOS</option></SelectField></div></div><div><label className="label">Release notes</label><textarea value={loaderForm.notes} onChange={(event) => setLoaderForm({ ...loaderForm, notes: event.target.value })} className="input min-h-24 resize-y text-sm" placeholder="What changed in this build?" /></div></div>
          <div className="flex gap-2 border-t border-frost-800/60 px-5 py-4"><button onClick={() => setShowLoaderModal(false)} className="btn-secondary flex-1 text-xs">Cancel</button><button onClick={createLoader} className="btn-primary flex-1 text-xs"><Plus size={14} /> Add software</button></div>
        </Modal>
      )}
    </div>
  );
}
