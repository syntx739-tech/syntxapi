import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useAnimationFrame, useMotionValue } from 'framer-motion';
import {
  Activity, Check, Copy, Gift, KeyRound, LogOut, Minus, Package,
  Plus, RefreshCw, ShoppingCart, Sparkles, Trophy, Users, X, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { staffApi, type StaffKey, type StaffOrder, type StaffQuota, type StaffRoulette, type StaffUser } from './api';

type PanelTab = 'overview' | 'orders';
type OrderLine = { plan: string; quantity: number };

const ORDER_PLANS = ['1 Day', '7 Days', '30 Days', '90 Days', '1 Year', 'Lifetime'];

const LEVEL_INFO = [
  { level: 0, name: 'Trainee', detail: 'Standard staff access with the six normal key quotas.', bonus: 'No bonus or roulette.' },
  { level: 1, name: 'Junior', detail: 'Keeps the standard staff page.', bonus: '1× 2 Days key when promoted.' },
  { level: 2, name: 'Reseller', detail: 'Unlocks the daily roulette.', bonus: '1 spin per day and 2× 1 Day keys when promoted.' },
  { level: 3, name: 'Senior reseller', detail: 'More daily roulette access.', bonus: '3 spins per day, 1× 7 Days and 2× 1 Day keys when promoted.' },
  { level: 4, name: 'Lead', detail: 'Includes analytics access.', bonus: '4 spins per day, 1× 90 Days, 2× 30 Days and 1× 7 Days keys when promoted.' },
  { level: 5, name: 'Manager', detail: 'Expanded keypanel permissions, but never owner-account controls.', bonus: '4 spins per day and 1× Lifetime key when promoted.' },
];

type RouletteOutcome = { result: string; key: StaffKey | null };

type RouletteSlot = { kind: 'key' | 'miss'; plan?: '1 Day' | '7 Days' | '1 Year' };

const ROULETTE_SLOT_ANGLE = 360 / 9;
const ROULETTE_SLOTS: RouletteSlot[] = [
  { kind: 'key', plan: '1 Day' },
  { kind: 'miss' },
  { kind: 'key', plan: '7 Days' },
  { kind: 'miss' },
  { kind: 'key', plan: '1 Year' },
  { kind: 'miss' },
  { kind: 'key', plan: '1 Day' },
  { kind: 'miss' },
  { kind: 'key', plan: '1 Day' },
];

function resultMatchesSlot(result: string, slot: RouletteSlot): boolean {
  const normalized = result.toLowerCase();
  return slot.kind === 'miss' ? normalized.includes('no prize') || normalized.includes('no reward') || normalized.includes('nothing') : normalized === slot.plan?.toLowerCase();
}

function rouletteSlotForResult(result: string): number {
  const matches = ROULETTE_SLOTS.flatMap((slot, index) => resultMatchesSlot(result, slot) ? [index] : []);
  return matches[Math.floor(Math.random() * matches.length)] ?? 0;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function RouletteWheel({ rotationValue, waiting, outcome }: { rotationValue: ReturnType<typeof useMotionValue<number>>; waiting: boolean; outcome: RouletteOutcome | null }) {
  return <div className="flex flex-col items-center">
    <div className="relative h-72 w-72 sm:h-80 sm:w-80" aria-live="polite">
      <div className="absolute left-1/2 top-0 z-30 -translate-x-1/2 drop-shadow-[0_0_10px_rgba(251,191,36,0.7)]"><div className="h-0 w-0 border-l-[11px] border-r-[11px] border-t-[22px] border-l-transparent border-r-transparent border-t-amber-300" /></div>
      <motion.div style={{ rotate: rotationValue }} className="absolute inset-3 rounded-full border-2 border-amber-400/40 p-2 shadow-[0_0_45px_rgba(14,165,233,0.16)]">
        <div className="relative h-full w-full rounded-full border border-white/10 bg-[conic-gradient(from_-20deg,rgba(14,165,233,0.28),rgba(245,158,11,0.2),rgba(14,165,233,0.28),rgba(245,158,11,0.2),rgba(14,165,233,0.28))] shadow-inner shadow-black/40">
          {ROULETTE_SLOTS.map((slot, index) => {
            const slotAngle = index * ROULETTE_SLOT_ANGLE - 90;
            const isKey = slot.kind === 'key';
            return <div key={`${slot.kind}-${slot.plan ?? 'miss'}-${index}`} className="absolute left-1/2 top-1/2" style={{ transform: `translate(-50%, -50%) rotate(${slotAngle}deg) translateY(-90px) rotate(${-slotAngle}deg)` }}>
              <div className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 shadow-lg backdrop-blur-sm', isKey ? 'border-arctic-300/40 bg-frost-950/80 text-arctic-200 shadow-arctic-500/20' : 'border-red-400/40 bg-red-950/80 text-red-300 shadow-red-500/15')}>
                {isKey ? <KeyRound size={15} /> : <X size={16} strokeWidth={3.5} />}
                <span className="whitespace-nowrap text-[9px] font-black uppercase tracking-wide">{isKey ? slot.plan : 'No prize'}</span>
              </div>
            </div>;
          })}
          <div className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-frost-950 bg-gradient-to-br from-arctic-400 to-cyan-600 text-white shadow-[0_0_25px_rgba(14,165,233,0.6)]"><KeyRound size={25} /></div>
        </div>
      </motion.div>
    </div>
    {waiting && <p className="mt-2 text-xs font-medium text-amber-300">The wheel is spinning...</p>}
    {!waiting && outcome && <AnimatePresence mode="wait"><motion.div key={`${outcome.result}-${outcome.key?.id ?? 'miss'}`} initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={cn('mt-2 flex items-center gap-3 rounded-2xl border px-4 py-3', outcome.key ? 'border-arctic-400/30 bg-arctic-500/10' : 'border-red-400/30 bg-red-500/10')}>              <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', outcome.key ? 'bg-arctic-400/15 text-arctic-300' : 'bg-red-500/15 text-red-300')}>{outcome.key ? <KeyRound size={21} /> : <X size={24} strokeWidth={3} />}</div>
      <div><p className={cn('text-[10px] font-black uppercase tracking-[0.18em]', outcome.key ? 'text-arctic-300' : 'text-red-300')}>{outcome.key ? 'Key won' : 'No prize'}</p><p className="text-sm font-bold text-frost-100">{outcome.key ? outcome.key.plan : 'Try again tomorrow'}</p>{outcome.key && <p className="text-[10px] text-frost-500">Valid for {outcome.key.plan.toLowerCase()} after first use</p>}</div>
    </motion.div></AnimatePresence>}
  </div>;
}

function formatDate(value: string | null): string {
  if (!value) return 'Not activated';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function StatusBadge({ status }: { status: StaffKey['status'] }) {
  const styles = {
    active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    expired: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    revoked: 'text-red-400 bg-red-500/10 border-red-500/20',
  };
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide', styles[status])}><span className="h-1.5 w-1.5 rounded-full bg-current" />{status}</span>;
}

function SourceBadge({ source }: { source: StaffKey['source'] }) {
  const labels = { owner: 'Order', staff: 'Generated', roulette: 'Roulette', level: 'Level bonus' };
  const classes = {
    owner: 'border-purple-500/20 bg-purple-500/10 text-purple-300',
    staff: 'border-arctic-500/20 bg-arctic-500/10 text-arctic-300',
    roulette: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    level: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  };
  return <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold', classes[source])}>{labels[source]}</span>;
}

function QuotaCard({ plan, used, limit, remaining, orderKeys, onGenerate }: { plan: string; used: number; limit: number; remaining: number; orderKeys: number; onGenerate: () => void }) {
  const exhausted = remaining <= 0;
  const percent = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  return (
    <motion.div whileHover={{ y: -2 }} className="glass-card flex min-h-[176px] flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl border', exhausted ? 'border-amber-500/20 bg-amber-500/10 text-amber-400' : 'border-arctic-500/20 bg-arctic-500/10 text-arctic-400')}><KeyRound size={17} /></div>
        <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', exhausted ? 'border-amber-500/20 bg-amber-500/10 text-amber-300' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300')}>{remaining} left</span>
      </div>
      <p className="mt-3 text-sm font-bold text-frost-100">{plan}</p>
      <p className="mt-1 text-xl font-bold text-frost-200"><span>{used}</span><span className="text-xs font-normal text-frost-600"> / {limit} generated</span></p>
      {orderKeys > 0 && <p className="mt-0.5 text-[10px] text-purple-300">+{orderKeys} from orders</p>}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-frost-800"><div className={cn('h-full rounded-full', exhausted ? 'bg-amber-400' : 'bg-arctic-500')} style={{ width: `${percent}%` }} /></div>
      <button onClick={onGenerate} disabled={exhausted} className="btn-primary mt-auto justify-center py-2 text-xs"><Plus size={13} />{exhausted ? 'Quota exhausted' : 'Generate 1 key'}</button>
    </motion.div>
  );
}

function KeyTable({ keys, onCopy }: { keys: StaffKey[]; onCopy: (value: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left">
        <thead><tr className="border-b border-frost-800/60 text-[10px] uppercase tracking-widest text-frost-600"><th className="px-4 py-3 font-semibold">License key</th><th className="px-4 py-3 font-semibold">Plan</th><th className="px-4 py-3 font-semibold">Source</th><th className="px-4 py-3 font-semibold">Activation</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 text-right font-semibold">Actions</th></tr></thead>
        <tbody>
          {keys.map((key) => <tr key={key.id} className="border-b border-frost-800/30 last:border-0 hover:bg-frost-800/20">
            <td className="px-4 py-3.5"><div className="flex items-center gap-2"><code className="rounded-lg bg-frost-900/70 px-2.5 py-1.5 text-xs text-frost-200">{key.value}</code><button onClick={() => onCopy(key.value)} className="rounded-lg p-1.5 text-frost-600 hover:bg-frost-800 hover:text-arctic-400" title="Copy"><Copy size={13} /></button></div><p className="mt-1 text-[10px] text-frost-600">Created {formatDate(key.createdAt)}</p></td>
            <td className="px-4 py-3.5 text-sm text-frost-300">{key.plan}</td>
            <td className="px-4 py-3.5"><SourceBadge source={key.source || 'staff'} /></td>
            <td className="px-4 py-3.5 text-xs text-frost-400">{key.activatedAt ? formatDate(key.activatedAt) : 'Starts on first use'}</td>
            <td className="px-4 py-3.5"><StatusBadge status={key.status} /></td>
            <td className="px-4 py-3.5 text-right"><button onClick={() => onCopy(key.value)} className="rounded-lg p-2 text-frost-600 hover:bg-frost-800 hover:text-frost-200" title="Copy"><Copy size={14} /></button></td>
          </tr>)}
        </tbody>
      </table>
      {keys.length === 0 && <div className="px-6 py-14 text-center text-sm text-frost-500">No keys yet.</div>}
    </div>
  );
}

function LevelCard({ level }: { level: number }) {
  const info = LEVEL_INFO[level] ?? LEVEL_INFO[0];
  return <div className="rounded-xl border border-frost-800/60 bg-frost-900/30 p-4"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-arctic-500/15 text-xs font-bold text-arctic-300">{info.level}</span><p className="text-sm font-semibold text-frost-100">{info.name}</p></div><p className="mt-2 text-xs leading-relaxed text-frost-400">{info.detail}</p><p className="mt-2 text-[11px] leading-relaxed text-arctic-300">{info.bonus}</p></div>;
}

export function StaffPanel({ staffUsername, onLogout }: { staffUsername: string; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<PanelTab>('overview');
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);
  const [quota, setQuota] = useState<StaffQuota | null>(null);
  const [roulette, setRoulette] = useState<StaffRoulette | null>(null);
  const [keys, setKeys] = useState<StaffKey[]>([]);
  const [fullKeypanelKeys, setFullKeypanelKeys] = useState<StaffKey[]>([]);
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [cart, setCart] = useState<OrderLine[]>([]);
  const [discordName, setDiscordName] = useState('');
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [waitingForRouletteResult, setWaitingForRouletteResult] = useState(false);
  const [rouletteOutcome, setRouletteOutcome] = useState<RouletteOutcome | null>(null);
  const [placing, setPlacing] = useState(false);

  const wheelRotation = useMotionValue(0);
  const spinStateRef = useRef<{ phase: 'idle' | 'spinning' | 'ticking'; velocity: number; elapsed: number; target: number; pendingOutcome: RouletteOutcome | null }>({ phase: 'idle', velocity: 0, elapsed: 0, target: 0, pendingOutcome: null });

  const sync = async () => {
    try {
      const [me, q, k, o] = await Promise.all([staffApi.getMe(), staffApi.getQuota(), staffApi.getKeys(), staffApi.getOrders()]);
      setStaffUser(me);
      setQuota(q);
      setRoulette(me.roulette);
      setKeys(k);
      setOrders(o);
      if (me.permissions?.fullKeypanel) {
        try { setFullKeypanelKeys(await staffApi.getFullKeypanelKeys()); }
        catch (error) { toast.error(error instanceof Error ? error.message : 'Could not load full keypanel view'); }
      } else {
        setFullKeypanelKeys([]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load staff data');
    }
  };

  useEffect(() => { void sync(); }, []);

  useAnimationFrame((delta) => {
    const state = spinStateRef.current;
    if (state.phase === 'idle') return;
    const dtSeconds = Math.min(delta / 1000, 0.05);
    const current = ((wheelRotation.get() % 360) + 360) % 360;

    if (state.phase === 'spinning') {
      // Real friction model: angular velocity decays toward zero, wheel slows
      // smoothly before the final stick-slip stage begins.
      state.velocity -= 560 * dtSeconds;
      if (state.velocity < 0) state.velocity = 0;
      wheelRotation.set(wheelRotation.get() + state.velocity * dtSeconds);
      if (state.velocity <= 0) {
        state.phase = 'ticking';
        state.elapsed = 0;
      }
      return;
    }

    // Stick-slip: advance whole slots with an increasing dwell time, so the
    // wheel visibly clicks slot-by-slot and then locks exactly on the target.
    const toTarget = ((state.target - current) % 360 + 360) % 360;
    const ticksLeft = toTarget / ROULETTE_SLOT_ANGLE; // slots remaining
    // Longer dwell as we approach the last few slots → realistic casino decel.
    const dwell = 0.16 + ticksLeft * 0.045 + (ticksLeft < 1 ? 0.08 : 0);
    state.elapsed += dtSeconds;
    if (state.elapsed >= dwell && toTarget > 0.6) {
      wheelRotation.set(wheelRotation.get() + Math.min(ROULETTE_SLOT_ANGLE, toTarget));
      state.elapsed = 0;
      const after = ((wheelRotation.get() % 360) + 360) % 360;
      if ((((state.target - after) % 360) + 360) % 360 < 0.6) {
        wheelRotation.set(state.target);
        state.phase = 'idle';
        setSpinning(false);
        setWaitingForRouletteResult(false);
        const outcome = state.pendingOutcome;
        state.pendingOutcome = null;
        if (outcome) {
          setRouletteOutcome(outcome);
          if (outcome.key) {
            setKeys((current) => outcome.key ? [outcome.key, ...current] : current);
            toast.success(`Roulette reward: ${outcome.result}`);
          } else {
            toast(outcome.result, { icon: <X size={16} className="text-red-400" /> });
          }
        }
      }
    }
  });

  const quotaByPlan = useMemo(() => new Map((quota?.entries ?? []).map((entry) => [entry.plan, entry])), [quota]);
  const level = staffUser?.level ?? 0;
  const visibleKeys = useMemo(() => Array.from(new Map(keys.map((key) => [key.id, key])).values()), [keys]);
  const generatedCount = visibleKeys.filter((key) => key.source === 'staff').length;
  const orderCount = visibleKeys.filter((key) => key.source === 'owner').length;
  const bonusCount = visibleKeys.filter((key) => key.source === 'roulette' || key.source === 'level').length;
  const copyToClipboard = async (value: string) => { try { await navigator.clipboard.writeText(value); toast.success('License key copied'); } catch { toast.error('Clipboard access is unavailable'); } };


  const generateOne = async (plan: string) => {
    setBusyPlan(plan);
    try { const generated = await staffApi.generateKeys(plan, 1); setKeys((current) => [...generated, ...current]); toast.success(`${plan} key generated`); await sync(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not generate key'); }
    finally { setBusyPlan(null); }
  };

  const spin = async () => {
    setSpinning(true);
    setWaitingForRouletteResult(true);
    setRouletteOutcome(null);
    try {
      const [result] = await Promise.all([staffApi.spinRoulette(), wait(500)]);
      const slotIndex = rouletteSlotForResult(result.result);
      // Pointer (top, 0°) must land on the centre of the winning slot.
      const slotCenter = slotIndex * ROULETTE_SLOT_ANGLE;
      const desired = ((90 - slotCenter) % 360 + 360) % 360;
      const now = ((wheelRotation.get() % 360) + 360) % 360;
      const revolutions = 6 + Math.floor(Math.random() * 3);
      const travelled = ((desired - now) % 360 + 360) % 360;
      const distance = revolutions * 360 + travelled;
      const target = wheelRotation.get() + distance;
      // Initial impulse such that friction coasts most of the way; the last
      // slots are finished by the stick-slip phase.
      const velocity = Math.sqrt(2 * 560 * distance) * 1.03;
      spinStateRef.current = {
        phase: 'spinning',
        velocity,
        elapsed: 0,
        target,
        pendingOutcome: { result: result.result, key: result.key },
      };
      setRoulette(result.roulette);
      await sync();
    } catch (error) {
      setWaitingForRouletteResult(false);
      setSpinning(false);
      const message = error instanceof Error ? error.message : 'Roulette failed';
      toast.error(message);
    }
  };

  const addToCart = (plan: string) => setCart((current) => { const existing = current.find((item) => item.plan === plan); return existing ? current.map((item) => item.plan === plan ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { plan, quantity: 1 }]; });
  const removeFromCart = (plan: string) => setCart((current) => current.map((item) => item.plan === plan ? { ...item, quantity: item.quantity - 1 } : item).filter((item) => item.quantity > 0));
  const cartTotal = cart.reduce((sum, item) => sum + item.quantity, 0);

  const placeOrder = async () => {
    if (!discordName.trim() || cart.length === 0) { toast.error(!discordName.trim() ? 'Enter your Discord account name' : 'Your order cart is empty'); return; }
    setPlacing(true);
    try { const result = await staffApi.placeOrder(discordName.trim(), cart); setCart([]); toast.success('Order placed'); if (result.warning) toast.warning(result.warning); await sync(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not place order'); }
    finally { setPlacing(false); }
  };

  return <div className="flex h-screen overflow-hidden bg-frost-950">
    <aside className="relative z-20 flex w-56 shrink-0 flex-col border-r border-frost-800/50 bg-frost-950/80 backdrop-blur-xl">
      <div className="flex items-center gap-3 border-b border-frost-800/50 px-4 py-5"><div className="flex h-8 w-8 items-center justify-center rounded-lg border border-arctic-500/30 bg-arctic-500/20"><Users size={18} className="text-arctic-400" /></div><div><span className="text-gradient block text-lg font-bold tracking-widest">ARCTIC</span><p className="text-[9px] uppercase tracking-widest text-frost-500">Staff Console</p></div></div>
      <nav className="flex-1 space-y-0.5 px-2 py-4">{([{ id: 'overview', label: 'Overview', icon: Activity }, { id: 'orders', label: 'Orders', icon: ShoppingCart }] as const).map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setActiveTab(id)} className={cn('sidebar-link w-full text-left', activeTab === id && 'sidebar-link-active')}><Icon size={18} className={cn(activeTab === id ? 'text-arctic-400' : 'text-frost-500')} /><span className="text-sm">{label}</span>{id === 'orders' && cartTotal > 0 && <span className="ml-auto rounded-md bg-arctic-500/20 px-1.5 py-0.5 text-[10px] text-arctic-300">{cartTotal}</span>}</button>)}</nav>
      <div className="space-y-2 border-t border-frost-800/50 px-2 pb-4 pt-3"><div className="flex items-center gap-2.5 px-3 py-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /><div className="min-w-0"><p className="truncate text-xs font-medium text-emerald-400">{staffUsername}</p><p className="text-[10px] text-frost-600">Level {level}</p></div></div><button onClick={onLogout} className="sidebar-link w-full"><LogOut size={16} className="text-frost-500" /><span className="text-sm">Sign out</span></button></div>
    </aside>
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-3 border-b border-frost-800/50 bg-frost-950/60 px-6 py-3 backdrop-blur-xl"><div className="flex min-w-0 flex-1 items-center gap-2"><span className="text-sm text-frost-500">ARCTIC</span><span className="text-sm font-semibold text-frost-100">Staff / {activeTab === 'overview' ? 'Key issuance' : 'Order keys'}</span></div><span className="hidden items-center gap-2 rounded-xl border border-arctic-500/20 bg-arctic-500/10 px-3 py-2 text-xs text-arctic-300 lg:flex"><Trophy size={13} /> Level {level} · {LEVEL_INFO[level]?.name}</span><button onClick={() => void sync()} className="btn-secondary py-2 text-xs"><RefreshCw size={13} /> Refresh</button></header>
      <main className="relative flex-1 overflow-auto"><AnimatePresence mode="wait"><motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute inset-0 overflow-auto">
        {activeTab === 'overview' ? <div className="mx-auto max-w-[1500px] space-y-6 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-arctic-400"><span className="h-1.5 w-1.5 rounded-full bg-arctic-400" />Staff console / License issuance</div><h1 className="text-2xl font-bold tracking-tight text-frost-50 sm:text-3xl">Staff Keypanel</h1><p className="mt-1.5 text-sm text-frost-500">Generate keys from the six quota cards. Unused keys start their expiry clock only after first use.</p></div></div>
          {level >= 2 && roulette?.enabled && <div className="glass-card border border-amber-500/20 bg-amber-500/5"><div className="flex flex-col gap-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-300"><Gift size={19} /></div><div><h3 className="text-sm font-semibold text-frost-100">Daily roulette</h3><p className="mt-1 text-xs text-frost-500">Spin the circular wheel and land on a real reward.</p><p className="mt-1 text-[10px] text-amber-300">{roulette.spinsRemaining} of {roulette.dailyLimit} spins remaining · resets at midnight UTC</p></div></div><button onClick={() => void spin()} disabled={spinning || roulette.spinsRemaining <= 0} className="btn-primary min-w-36 justify-center bg-amber-500/20 text-amber-200 hover:bg-amber-500/30"><Sparkles size={15} />{spinning ? 'Spinning...' : 'Spin roulette'}</button></div><div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]"><RouletteWheel rotationValue={wheelRotation} waiting={waitingForRouletteResult} outcome={rouletteOutcome} /><div className="space-y-3"><div className="rounded-xl border border-frost-800/60 bg-frost-950/30 p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-frost-600">Wheel rewards</p><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><span className="flex items-center gap-1.5 text-arctic-300"><KeyRound size={13} />3× 1 Day</span><span className="flex items-center gap-1.5 text-arctic-300"><KeyRound size={13} />1× 7 Days</span><span className="flex items-center gap-1.5 text-arctic-300"><KeyRound size={13} />1× 1 Year</span><span className="flex items-center gap-1.5 text-red-300"><X size={14} strokeWidth={3} />4× No prize</span></div></div><p className="text-[11px] leading-relaxed text-frost-500">Winning keys are shown with their duration. Unused keys stay active until the first use; a red X means no key was won.</p></div></div></div></div>}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">{(quota?.entries ?? []).map((entry) => <QuotaCard key={entry.plan} plan={entry.plan} used={entry.used} limit={entry.limit} remaining={entry.remaining} orderKeys={entry.orderKeys} onGenerate={() => void generateOne(entry.plan)} />)}</div>
          {level >= 4 && staffUser?.permissions?.analytics && <div className="glass-card"><div className="mb-4 flex items-center gap-2"><Activity size={16} className="text-arctic-400" /><div><h3 className="text-sm font-semibold text-frost-100">Staff analytics</h3><p className="text-xs text-frost-600">Live counters from this account</p></div></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-frost-800/50 bg-frost-900/30 p-3"><p className="text-[10px] uppercase tracking-widest text-frost-600">Generated</p><p className="mt-1 text-xl font-bold text-frost-100">{generatedCount}</p></div><div className="rounded-xl border border-frost-800/50 bg-frost-900/30 p-3"><p className="text-[10px] uppercase tracking-widest text-frost-600">Activated</p><p className="mt-1 text-xl font-bold text-frost-100">{keys.filter((key) => key.activatedAt).length}</p></div><div className="rounded-xl border border-frost-800/50 bg-frost-900/30 p-3"><p className="text-[10px] uppercase tracking-widest text-frost-600">Orders / bonus</p><p className="mt-1 text-xl font-bold text-frost-100">{orderCount + bonusCount}</p></div></div></div>}
          {level >= 5 && staffUser?.permissions?.fullKeypanel && <div className="glass-card overflow-hidden p-0"><div className="border-b border-frost-800/60 p-4"><h3 className="text-sm font-semibold text-frost-100">Full keypanel view</h3><p className="mt-1 text-xs text-frost-600">Level 5 can inspect all license keys. Owner account controls remain unavailable.</p></div><KeyTable keys={fullKeypanelKeys} onCopy={copyToClipboard} /></div>}
          <div className="glass-card overflow-hidden p-0"><div className="flex flex-col gap-3 border-b border-frost-800/60 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-semibold text-frost-100">My keys</h3><p className="mt-1 text-xs text-frost-600">{visibleKeys.length} total · {generatedCount} generated · {orderCount} from orders · {bonusCount} bonus.</p></div><div className="flex flex-wrap gap-2 text-[10px] text-frost-500"><span>{visibleKeys.filter((key) => key.activatedAt).length} activated</span><span>·</span><span>{visibleKeys.filter((key) => !key.activatedAt).length} unused</span></div></div><KeyTable keys={visibleKeys} onCopy={copyToClipboard} /></div>
          <div className="glass-card"><div className="mb-4 flex items-center gap-2"><Trophy size={16} className="text-arctic-400" /><div><h3 className="text-sm font-semibold text-frost-100">Staff level information</h3><p className="text-xs text-frost-600">Your current level: {level}</p></div></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{LEVEL_INFO.map((info) => <LevelCard key={info.level} level={info.level} />)}</div></div>
        </div> : <div className="mx-auto max-w-[1500px] space-y-6 p-6"><div><div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-arctic-400">Staff console / Order keys</div><h1 className="text-2xl font-bold tracking-tight text-frost-50">Order more keys</h1><p className="mt-1.5 text-sm text-frost-500">Submit a real request. The owner receives one formatted Discord notification.</p></div><div className="grid grid-cols-1 gap-6 xl:grid-cols-3"><div className="glass-card xl:col-span-2"><div className="mb-4 flex items-center gap-2"><Package size={16} className="text-arctic-400" /><h3 className="text-sm font-semibold text-frost-100">Available plans</h3></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{ORDER_PLANS.map((plan) => <button key={plan} onClick={() => addToCart(plan)} className="group flex items-center justify-between rounded-xl border border-frost-800/60 bg-frost-900/40 p-4 text-left hover:border-arctic-400/40"><div><p className="text-sm font-semibold text-frost-100">{plan}</p><p className="mt-1 text-[10px] text-frost-600">License key</p></div><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-frost-800 text-frost-400 group-hover:bg-arctic-500/20 group-hover:text-arctic-300"><Plus size={15} /></span></button>)}</div></div><div className="glass-card"><div className="mb-4 flex items-center gap-2"><ShoppingCart size={16} className="text-arctic-400" /><div><h3 className="text-sm font-semibold text-frost-100">Order cart</h3><p className="text-xs text-frost-600">{cartTotal} selected</p></div></div>{cart.length === 0 ? <div className="rounded-xl border border-dashed border-frost-700/50 px-4 py-10 text-center text-xs text-frost-500">Cart is empty.</div> : <div className="space-y-2">{cart.map((item) => <div key={item.plan} className="flex items-center justify-between rounded-xl border border-frost-800/60 bg-frost-900/40 px-3 py-2.5"><span className="text-xs text-frost-200">{item.plan} × {item.quantity}</span><span className="flex gap-1"><button onClick={() => addToCart(item.plan)} className="rounded p-1 text-frost-400 hover:bg-frost-800"><Plus size={13} /></button><button onClick={() => removeFromCart(item.plan)} className="rounded p-1 text-frost-400 hover:bg-frost-800"><Minus size={13} /></button></span></div>)}</div>}<div className="mt-4 space-y-3 border-t border-frost-800/60 pt-4"><input value={discordName} onChange={(event) => setDiscordName(event.target.value)} className="input text-sm" placeholder="Discord account name" /><button onClick={() => void placeOrder()} disabled={placing || cart.length === 0} className="btn-primary w-full justify-center text-sm"><Check size={15} />{placing ? 'Placing...' : 'Place order'}</button></div></div></div><div className="glass-card overflow-hidden p-0"><div className="border-b border-frost-800/60 p-4"><h3 className="text-sm font-semibold text-frost-100">Order history</h3></div><div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left"><thead><tr className="border-b border-frost-800/60 text-[10px] uppercase tracking-widest text-frost-600"><th className="px-4 py-3">Request</th><th className="px-4 py-3">Discord</th><th className="px-4 py-3">Placed</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id} className="border-b border-frost-800/30"><td className="px-4 py-3 text-xs text-frost-200">{order.items.map((item) => `${item.quantity}× ${item.plan}`).join(', ')}{order.fulfilledKeys.length > 0 && <div className="mt-2 space-y-1">{order.fulfilledKeys.map((key) => <div key={key.id} className="flex items-center gap-2"><code className="text-[10px] text-frost-300">{key.value}</code><button onClick={() => void copyToClipboard(key.value)} className="text-frost-600 hover:text-arctic-400"><Copy size={11} /></button></div>)}</div>}</td><td className="px-4 py-3 text-xs text-frost-300">{order.discordName}</td><td className="px-4 py-3 text-xs text-frost-500">{formatTime(order.createdAt)}</td><td className="px-4 py-3 text-xs text-frost-400">{order.status}</td></tr>)}</tbody></table>{orders.length === 0 && <div className="px-6 py-12 text-center text-sm text-frost-500">No orders yet.</div>}</div></div></div>}
      </motion.div></AnimatePresence></main>
    </div>
  </div>;
}
