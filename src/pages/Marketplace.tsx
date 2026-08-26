import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingBag, Download, Check, Star, Search, Filter,
  Grid3x3, Zap, Palette, Image, User, Package,
} from 'lucide-react';
import { cn, formatNumber } from '../lib/utils';
import { useStore } from '../store';
import type { MarketplaceItem } from '../types';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  layout: Grid3x3, macro_pack: Zap, theme: Palette,
  icons: Package, backgrounds: Image, profile: User, plugin_pack: Package,
};

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'layout', label: 'Layouts' },
  { value: 'macro_pack', label: 'Macro Packs' },
  { value: 'theme', label: 'Themes' },
  { value: 'icons', label: 'Icons' },
  { value: 'profile', label: 'Profiles' },
];

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={10} className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-frost-700'} />
      ))}
      <span className="text-[10px] text-frost-500 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

function MarketplaceCard({ item }: { item: MarketplaceItem }) {
  const { installMarketplaceItem, uninstallMarketplaceItem } = useStore();
  const Icon = CATEGORY_ICONS[item.type] ?? Package;

  return (
    <motion.div layout whileHover={{ y: -3 }} className="glass-card group">
      {/* Preview */}
      <div className="h-28 rounded-xl bg-gradient-to-br from-frost-800/50 to-frost-900/50 border border-frost-700/30 flex items-center justify-center mb-4 relative overflow-hidden">
        <span className="text-5xl">{item.preview}</span>
        <div className={cn(
          'absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-semibold',
          item.type === 'theme' ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' :
          item.type === 'macro_pack' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
          item.type === 'layout' ? 'bg-arctic-500/20 text-arctic-400 border border-arctic-500/30' :
          'bg-frost-800/50 text-frost-400 border border-frost-700/30'
        )}>
          {item.type.replace('_', ' ')}
        </div>
      </div>

      <h3 className="font-bold text-frost-100 text-sm leading-tight">{item.name}</h3>
      <p className="text-xs text-frost-500 mt-1 line-clamp-2">{item.description}</p>

      <div className="flex items-center justify-between mt-2">
        <p className="text-[11px] text-frost-600">by <span className="text-arctic-400">{item.creator}</span></p>
        <p className="text-[11px] text-frost-600 flex items-center gap-1">
          <Download size={10} />
          {formatNumber(item.downloads)}
        </p>
      </div>

      <div className="mt-1.5 mb-3">
        <Stars rating={item.rating} />
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {item.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-md bg-frost-800/50 text-frost-500 border border-frost-700/30">
            #{tag}
          </span>
        ))}
      </div>

      <button
        onClick={() => item.isInstalled ? uninstallMarketplaceItem(item.id) : installMarketplaceItem(item.id)}
        className={cn(
          'w-full text-xs',
          item.isInstalled ? 'btn-secondary gap-1.5' : 'btn-primary gap-1.5'
        )}
      >
        {item.isInstalled ? (
          <><Check size={12} /> Installed</>
        ) : (
          <><Download size={12} /> Add to ARCTIC</>
        )}
      </button>
    </motion.div>
  );
}

export function Marketplace() {
  const { marketplaceItems } = useStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const filtered = marketplaceItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.tags.some((t) => t.includes(search.toLowerCase()));
    const matchesCat = category === 'all' || item.type === category;
    return matchesSearch && matchesCat;
  });

  const installed = marketplaceItems.filter((i) => i.isInstalled);

  return (
    <div className="p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-frost-100">Marketplace</h2>
          <p className="text-sm text-frost-500 mt-0.5">{marketplaceItems.length} items — {installed.length} installed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-frost-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search marketplace..."
            className="input pl-9 text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setCategory(value)}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-medium border transition-all',
                category === value
                  ? 'bg-arctic-500/20 border-arctic-500/30 text-arctic-400'
                  : 'bg-frost-900/50 border-frost-800/50 text-frost-500 hover:text-frost-300 hover:border-frost-700/50'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Featured banner */}
      {category === 'all' && !search && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-arctic-900/50 to-violet-900/30 border border-arctic-500/20 p-6 mb-6">
          <div className="absolute right-0 top-0 w-48 h-48 rounded-full bg-arctic-500/5 blur-3xl" />
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBag size={18} className="text-arctic-400" />
            <span className="text-xs font-semibold text-arctic-400 uppercase tracking-widest">Featured</span>
          </div>
          <h3 className="text-xl font-bold text-frost-100">ARCTIC Marketplace</h3>
          <p className="text-frost-400 text-sm mt-1">Discover layouts, macros, themes and more from the community.</p>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ShoppingBag size={48} className="text-frost-700 mb-4" />
          <p className="text-frost-400 font-medium">No results found</p>
          <p className="text-frost-600 text-sm mt-1">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((item) => (
            <MarketplaceCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
