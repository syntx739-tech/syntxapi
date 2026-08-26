import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  KeyRound,
  LogOut,
  Minus,
  Package,
  Plus,
  RefreshCw,
  ShoppingCart,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { staffApi, type StaffKey, type StaffQuota, type StaffUser, type StaffOrder } from './api';

type PanelTab = 'overview' | 'orders';

function formatDate(value: string | null): string {
  if (!value) return 'Lifetime';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function StatusBadge({ status }: { status: StaffKey['status'] }) {
  const labels: Record<string, string> = { active: 'Active', expired: 'Expired', revoked: 'Revoked' };
  const styles: Record<string, string> = {
    active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    expired: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    revoked: 'text-red-400 bg-red-500/10 border-red-500/20',
  };
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide', styles[status])}><span className="h-1.5 w-1.5 rounded-full bg-current" />{labels[status]}</span>;
}

function OrderStatusBadge({ status }: { status: StaffOrder['status'] }) {
  const labels: Record<StaffOrder['status'], string> = { pending: 'Pending', fulfilled: 'Fulfilled', rejected: 'Rejected' };
  const styles: Record<StaffOrder['status'], string> = {
    pending: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    fulfilled: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    rejected: 'text-red-400 bg-red-500/10 border-red-500/20',
  };
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide', styles[status])}><span className="h-1.5 w-1.5 rounded-full bg-current" />{labels[status]}</span>;
}

function QuotaCard({ plan, used, limit, remaining, onGenerate }: { plan: string; used: number; limit: number; remaining: number; onGenerate: () => void }) {
  const pct = limit > 0 ? (used / limit) * 100 : 0;
  const exhausted = remaining <= 0;
  return (
    <motion.div whileHover={{ y: -2 }} className="glass-card flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl border', exhausted ? 'border-amber-500/20 bg-amber-500/10 text-amber-400' : 'border-arctic-500/20 bg-arctic-500/10 text-arctic-400')}>
          <KeyRound size={18} />
        </div>
        <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', exhausted ? 'border-amber-500/20 bg-amber-500/10 text-amber-400' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400')}>
          {remaining} left
        </span>
      </div>
      <p className="mt-4 text-lg font-bold tracking-tight text-frost-100">{plan}</p>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-frost-200">{used}</span>
        <span className="text-sm text-frost-600">/ {limit} used</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-frost-800">
        <div className={cn('h-full rounded-full', exhausted ? 'bg-amber-400' : 'bg-arctic-500')} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <button
        onClick={onGenerate}
        disabled={exhausted}
        className="btn-primary mt-4 justify-center py-2 text-xs"
      >
        <Plus size={13} />
        {exhausted ? 'Quota exhausted' : `Generate ${plan}`}
      </button>
    </motion.div>
  );
}

function KeyTable({ keys, onCopy }: { keys: StaffKey[]; onCopy: (value: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-left">
        <thead>
          <tr className="border-b border-frost-800/60 text-[10px] uppercase tracking-widest text-frost-600">
            <th className="px-4 py-3 font-semibold">License key</th>
            <th className="px-4 py-3 font-semibold">Plan</th>
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
                <p className="mt-1 text-[10px] text-frost-600">Created {formatDate(key.createdAt)}</p>
              </td>
              <td className="px-4 py-3.5 text-sm text-frost-300">{key.plan}</td>
              <td className="px-4 py-3.5 text-xs text-frost-400">{formatDate(key.expiresAt)}</td>
              <td className="px-4 py-3.5"><StatusBadge status={key.status} /></td>
              <td className="px-4 py-3.5"><div className="flex justify-end gap-1"><button onClick={() => onCopy(key.value)} className="rounded-lg p-2 text-frost-600 transition-colors hover:bg-frost-800 hover:text-frost-300" title="Copy"><Copy size={14} /></button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
      {keys.length === 0 && <div className="px-6 py-14 text-center text-sm text-frost-500">No keys generated yet.</div>}
    </div>
  );
}

type OrderLine = { plan: string; quantity: number };

const ORDER_PLANS = ['1 Day', '7 Days', '30 Days', '90 Days', '1 Year', 'Lifetime'];

export function StaffPanel({ staffUsername, onLogout }: { staffUsername: string; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<PanelTab>('overview');
  const [quota, setQuota] = useState<StaffQuota | null>(null);
  const [keys, setKeys] = useState<StaffKey[]>([]);
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [busy, setBusy] = useState(false);
  const [generatePlan, setGeneratePlan] = useState('7 Days');
  const [generateQty, setGenerateQty] = useState('1');
  const [cart, setCart] = useState<OrderLine[]>([]);
  const [discordName, setDiscordName] = useState('');
  const [placing, setPlacing] = useState(false);

  const sync = async () => {
    try {
      const [q, k, o] = await Promise.all([staffApi.getQuota(), staffApi.getKeys(), staffApi.getOrders()]);
      setQuota(q);
      setKeys(k);
      setOrders(o);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load staff data');
    }
  };

  useEffect(() => {
    void sync();
  }, []);

  const quotaByPlan = useMemo(() => {
    const map = new Map<string, { used: number; limit: number; remaining: number }>();
    for (const entry of quota?.entries ?? []) {
      map.set(entry.plan, { used: entry.used, limit: entry.limit, remaining: entry.remaining });
    }
    return map;
  }, [quota]);

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('License key copied');
    } catch {
      toast.error('Clipboard access is unavailable');
    }
  };

  const generateKeys = async () => {
    const qty = Math.max(Number.parseInt(generateQty, 10) || 1, 1);
    setBusy(true);
    try {
      const generated = await staffApi.generateKeys(generatePlan, qty);
      setKeys((current) => [...generated, ...current]);
      toast.success(`${qty}× ${generatePlan} key${qty === 1 ? '' : 's'} generated`);
      await sync();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not generate keys');
    } finally {
      setBusy(false);
    }
  };

  const addToCart = (plan: string) => {
    setCart((current) => {
      const existing = current.find((item) => item.plan === plan);
      if (existing) return current.map((item) => item.plan === plan ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, { plan, quantity: 1 }];
    });
    toast.success(`${plan} added to order`);
  };

  const removeFromCart = (plan: string) => {
    setCart((current) => current
      .map((item) => item.plan === plan ? { ...item, quantity: item.quantity - 1 } : item)
      .filter((item) => item.quantity > 0));
  };

  const clearCart = () => setCart([]);

  const placeOrder = async () => {
    if (!discordName.trim()) {
      toast.error('Enter your Discord account name');
      return;
    }
    if (cart.length === 0) {
      toast.error('Your order cart is empty');
      return;
    }
    setPlacing(true);
    try {
      const result = await staffApi.placeOrder(discordName.trim(), cart);
      toast.success('Order placed — sent to the owner via Discord');
      if (result.warning) toast.warning(result.warning);
      setCart([]);
      await sync();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not place order');
    } finally {
      setPlacing(false);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex h-screen overflow-hidden bg-frost-950">
      {/* Sidebar */}
      <aside className="relative z-20 flex w-56 shrink-0 flex-col border-r border-frost-800/50 bg-frost-950/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 border-b border-frost-800/50 px-4 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-arctic-500/30 bg-arctic-500/20">
            <Users size={18} className="text-arctic-400" />
          </div>
          <div className="min-w-0">
            <span className="text-gradient block text-lg font-bold leading-none tracking-widest">ARCTIC</span>
            <p className="mt-0.5 text-[9px] uppercase tracking-widest text-frost-500">Staff Console</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-2 py-4">
          {([
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'orders', label: 'Orders', icon: ShoppingCart },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn('sidebar-link w-full text-left', activeTab === id && 'sidebar-link-active')}
            >
              <Icon size={18} className={cn('shrink-0', activeTab === id ? 'text-arctic-400' : 'text-frost-500')} />
              <span className="text-sm">{label}</span>
              {id === 'orders' && cartTotal > 0 && <span className="ml-auto rounded-md bg-arctic-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-arctic-300">{cartTotal}</span>}
            </button>
          ))}
        </nav>
        <div className="space-y-2 border-t border-frost-800/50 px-2 pb-4 pt-3">
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-emerald-400">{staffUsername}</p>
              <p className="text-[10px] text-frost-600">Staff member</p>
            </div>
          </div>
          <button onClick={onLogout} className="sidebar-link w-full">
            <LogOut size={16} className="shrink-0 text-frost-500" />
            <span className="text-sm">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-4 border-b border-frost-800/50 bg-frost-950/60 px-6 py-3 backdrop-blur-xl">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="text-sm text-frost-500">ARCTIC</span>
            <ChevronDown size={0} className="hidden" />
            <span className="truncate text-sm font-semibold text-frost-100">Staff / {activeTab === 'overview' ? 'Key issuance' : 'Order keys'}</span>
          </div>
          <div className="hidden items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 lg:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Staff session active
          </div>
          <button onClick={() => void sync()} className="btn-secondary py-2 text-xs">
            <RefreshCw size={13} /> Refresh
          </button>
        </header>

        <main className="relative flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="absolute inset-0 overflow-auto"
            >
              {activeTab === 'overview' ? (
                <div className="mx-auto max-w-[1500px] space-y-6 p-6">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-arctic-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-arctic-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
                      Staff console <span className="text-frost-700">/</span> License issuance
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-frost-50 sm:text-3xl">Staff Keypanel</h1>
                    <p className="mt-1.5 max-w-2xl text-sm text-frost-500">Generate license keys within your fixed quota and order more when you run out.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
                    {ORDER_PLANS.map((plan) => {
                      const entry = quotaByPlan.get(plan);
                      if (!entry) return null;
                      return (
                        <QuotaCard
                          key={plan}
                          plan={plan}
                          used={entry.used}
                          limit={entry.limit}
                          remaining={entry.remaining}
                          onGenerate={() => { setGeneratePlan(plan); setGenerateQty('1'); }}
                        />
                      );
                    })}
                  </div>

                  {generatePlan && (
                    <div className="glass-card">
                      <div className="mb-4 flex items-center gap-2.5">
                        <Zap size={16} className="text-arctic-400" />
                        <div>
                          <h3 className="text-sm font-semibold text-frost-100">Generate keys</h3>
                          <p className="mt-0.5 text-xs text-frost-600">Use a slot from your {generatePlan} quota.</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="sm:w-48">
                          <label className="label">Plan</label>
                          <div className="relative">
                            <select value={generatePlan} onChange={(event) => setGeneratePlan(event.target.value)} className="input appearance-none pr-9 text-sm">
                              {ORDER_PLANS.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
                            </select>
                            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-frost-500" />
                          </div>
                        </div>
                        <div className="sm:w-32">
                          <label className="label">Quantity</label>
                          <input value={generateQty} onChange={(event) => setGenerateQty(event.target.value)} className="input text-sm" type="number" min="1" />
                        </div>
                        <button onClick={generateKeys} disabled={busy} className="btn-primary py-3 text-sm">
                          <KeyRound size={15} />
                          {busy ? 'Generating...' : `Generate ${generateQty || '1'}× ${generatePlan}`}
                        </button>
                      </div>
                      <p className="mt-3 text-[10px] text-frost-600">Generated keys are active immediately and can be handed out to customers.</p>
                    </div>
                  )}

                  <div className="glass-card overflow-hidden p-0">
                    <div className="flex items-center justify-between border-b border-frost-800/60 p-4">
                      <div>
                        <h3 className="text-sm font-semibold text-frost-100">Generated keys</h3>
                        <p className="mt-1 text-xs text-frost-600">Keys you issued with your staff account.</p>
                      </div>
                      <span className="rounded-md bg-frost-800/70 px-2 py-1 text-[10px] text-frost-400">{keys.length} total</span>
                    </div>
                    <KeyTable keys={keys} onCopy={copyToClipboard} />
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-[1500px] space-y-6 p-6">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-arctic-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-arctic-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
                      Staff console <span className="text-frost-700">/</span> Order keys
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-frost-50 sm:text-3xl">Order more keys</h1>
                    <p className="mt-1.5 max-w-2xl text-sm text-frost-500">When your quota runs out, add plans to the cart and place an order. The owner receives it instantly on Discord.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    <div className="glass-card xl:col-span-2">
                      <div className="mb-4 flex items-center gap-2.5">
                        <Package size={16} className="text-arctic-400" />
                        <div>
                          <h3 className="text-sm font-semibold text-frost-100">Available plans</h3>
                          <p className="mt-0.5 text-xs text-frost-600">Click a plan to add it to your cart.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {ORDER_PLANS.map((plan) => (
                          <button
                            key={plan}
                            onClick={() => addToCart(plan)}
                            className="group flex items-center justify-between rounded-xl border border-frost-800/60 bg-frost-900/40 p-4 text-left transition-all hover:border-arctic-400/40 hover:bg-arctic-500/10"
                          >
                            <div>
                              <p className="text-sm font-semibold text-frost-100">{plan}</p>
                              <p className="mt-1 text-[10px] text-frost-600">License key</p>
                            </div>
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-frost-800 text-frost-400 transition-colors group-hover:bg-arctic-500/20 group-hover:text-arctic-300">
                              <Plus size={15} />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="glass-card">
                      <div className="mb-4 flex items-center gap-2.5">
                        <ShoppingCart size={16} className="text-arctic-400" />
                        <div>
                          <h3 className="text-sm font-semibold text-frost-100">Order cart</h3>
                          <p className="mt-0.5 text-xs text-frost-600">{cartTotal} item{cartTotal === 1 ? '' : 's'} selected</p>
                        </div>
                      </div>

                      {cart.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-frost-700/50 px-4 py-10 text-center">
                          <ShoppingCart size={20} className="mx-auto mb-2 text-frost-600" />
                          <p className="text-xs text-frost-500">Your cart is empty. Add plans from the left.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {cart.map((item) => (
                            <div key={item.plan} className="flex items-center justify-between rounded-xl border border-frost-800/60 bg-frost-900/40 px-3 py-2.5">
                              <div>
                                <p className="text-xs font-semibold text-frost-200">{item.plan}</p>
                                <p className="text-[10px] text-frost-600">× {item.quantity}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => addToCart(item.plan)} className="rounded-lg p-1.5 text-frost-400 transition-colors hover:bg-frost-800 hover:text-arctic-300"><Plus size={13} /></button>
                                <button onClick={() => removeFromCart(item.plan)} className="rounded-lg p-1.5 text-frost-400 transition-colors hover:bg-frost-800 hover:text-amber-300"><Minus size={13} /></button>
                              </div>
                            </div>
                          ))}
                          <button onClick={clearCart} className="w-full rounded-lg py-1.5 text-[10px] text-frost-600 transition-colors hover:text-red-400">Clear cart</button>
                        </div>
                      )}

                      <div className="mt-4 space-y-3 border-t border-frost-800/60 pt-4">
                        <div>
                          <label className="label">Discord account name *</label>
                          <input value={discordName} onChange={(event) => setDiscordName(event.target.value)} className="input text-sm" placeholder="e.g. max.mustermann" />
                        </div>
                        <button onClick={placeOrder} disabled={placing || cart.length === 0} className="btn-primary w-full justify-center text-sm">
                          <Check size={15} />
                          {placing ? 'Placing order...' : 'Place order'}
                        </button>
                        <p className="text-center text-[10px] leading-relaxed text-frost-600">
                          The owner receives your Discord name, the order, and the time via Discord webhook.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card overflow-hidden p-0">
                    <div className="flex items-center justify-between border-b border-frost-800/60 p-4">
                      <div>
                        <h3 className="text-sm font-semibold text-frost-100">Order history</h3>
                        <p className="mt-1 text-xs text-frost-600">Your previous key orders.</p>
                      </div>
                      <span className="rounded-md bg-frost-800/70 px-2 py-1 text-[10px] text-frost-400">{orders.length} orders</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-left">
                        <thead>
                          <tr className="border-b border-frost-800/60 text-[10px] uppercase tracking-widest text-frost-600">
                            <th className="px-4 py-3 font-semibold">Order</th>
                            <th className="px-4 py-3 font-semibold">Discord</th>
                            <th className="px-4 py-3 font-semibold">Placed</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((order) => (
                            <tr key={order.id} className="border-b border-frost-800/30 last:border-0 hover:bg-frost-800/20">
                              <td className="px-4 py-3.5">
                                <p className="text-xs font-semibold text-frost-200">{order.items.map((item) => `${item.quantity}× ${item.plan}`).join(', ')}</p>
                                <p className="mt-0.5 text-[10px] text-frost-600">{order.id}</p>
                                {order.fulfilledKeys.length > 0 && <div className="mt-2 space-y-1">{order.fulfilledKeys.map((key) => <div key={key.id} className="flex items-center gap-2"><code className="rounded bg-frost-900/70 px-1.5 py-1 text-[10px] text-frost-300">{key.value}</code><button onClick={() => copyToClipboard(key.value)} title="Copy delivered key" className="rounded p-1 text-frost-600 hover:bg-frost-800 hover:text-arctic-400"><Copy size={12} /></button></div>)}</div>}
                              </td>
                              <td className="px-4 py-3.5 text-sm text-frost-300">{order.discordName}</td>
                              <td className="px-4 py-3.5 text-xs text-frost-500">{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(order.createdAt))}</td>
                              <td className="px-4 py-3.5"><OrderStatusBadge status={order.status} />{order.fulfilledKeys.length > 0 && <p className="mt-1 text-[10px] text-emerald-400">{order.fulfilledKeys.length} key{order.fulfilledKeys.length === 1 ? '' : 's'} delivered</p>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {orders.length === 0 && <div className="px-6 py-14 text-center text-sm text-frost-500">No orders placed yet.</div>}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
