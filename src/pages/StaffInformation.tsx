import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Gift, KeyRound, ShieldCheck, Sparkles, Trophy } from 'lucide-react';

const LEVELS = [
  { level: 0, title: 'Trainee', summary: 'Standard staff page with the six normal key quotas.', bonus: 'No bonus keys and no roulette.', spins: '—', icon: ShieldCheck },
  { level: 1, title: 'Junior', summary: 'Keeps the standard staff workflow.', bonus: '1× 2 Days key on promotion.', spins: '—', icon: KeyRound },
  { level: 2, title: 'Reseller', summary: 'Unlocks the daily roulette.', bonus: '2× 1 Day keys on promotion.', spins: '1 spin/day', icon: Sparkles },
  { level: 3, title: 'Senior reseller', summary: 'Higher roulette allowance for trusted resellers.', bonus: '1× 7 Days + 2× 1 Day on promotion.', spins: '3 spins/day', icon: Gift },
  { level: 4, title: 'Lead', summary: 'Adds analytics visibility.', bonus: '1× 90 Days + 2× 30 Days + 1× 7 Days on promotion.', spins: '4 spins/day', icon: BarChart3 },
  { level: 5, title: 'Manager', summary: 'Expanded keypanel permissions, without owner-account controls.', bonus: '1× Lifetime key on promotion.', spins: '4 spins/day', icon: Trophy },
];

export function StaffInformation() {
  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-arctic-400"><span className="h-1.5 w-1.5 rounded-full bg-arctic-400" />Admin console / Staff information</div>
          <h1 className="text-2xl font-bold tracking-tight text-frost-50 sm:text-3xl">Staff Information</h1>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-frost-500">Levels are set manually by the owner. Promotion rewards are granted once, and bonus keys only begin their expiry period after first use.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {LEVELS.map(({ level, title, summary, bonus, spins, icon: Icon }, index) => (
            <motion.article key={level} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="glass-card relative overflow-hidden">
              <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-arctic-500/5 blur-2xl" />
              <div className="relative flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-arctic-500/20 bg-arctic-500/10 text-arctic-400"><Icon size={18} /></div><div><p className="text-[10px] font-semibold uppercase tracking-widest text-arctic-400">Level {level}</p><h2 className="text-lg font-bold text-frost-100">{title}</h2></div></div><span className="rounded-lg border border-frost-700/40 bg-frost-800/50 px-2 py-1 text-[10px] font-semibold text-frost-400">{spins}</span></div>
              <p className="relative mt-4 text-sm leading-relaxed text-frost-400">{summary}</p>
              <div className="relative mt-4 rounded-xl border border-frost-800/60 bg-frost-900/40 p-3"><p className="text-[10px] font-semibold uppercase tracking-widest text-frost-600">Promotion reward</p><p className="mt-1 text-xs leading-relaxed text-frost-300">{bonus}</p></div>
            </motion.article>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="glass-card"><h2 className="text-sm font-semibold text-frost-100">Roulette rules</h2><ul className="mt-3 space-y-2 text-xs leading-relaxed text-frost-400"><li>• The wheel has 9 equally weighted slots: four no-prize slots, three 1 Day slots, one 7 Days slot, and one 1 Year slot.</li><li>• Daily spins reset at 00:00 UTC. Level 0 and level 1 cannot spin.</li><li>• Roulette keys are bonus keys and do not consume the normal six quota pools.</li></ul></div>
          <div className="glass-card"><h2 className="text-sm font-semibold text-frost-100">Owner protection</h2><p className="mt-3 text-xs leading-relaxed text-frost-400">Level 5 can receive broader keypanel permissions, but the owner account remains protected. No staff level can suspend, delete, or modify the owner account.</p></div>
        </div>
      </div>
    </div>
  );
}
