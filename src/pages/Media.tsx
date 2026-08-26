import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Shuffle, Repeat, Music, Disc3, Radio,
} from 'lucide-react';
import { cn, formatDuration } from '../lib/utils';
import { useStore } from '../store';

function AlbumArtPlaceholder({ source }: { source: string | null }) {
  const gradient =
    source === 'spotify' ? 'from-emerald-900 to-emerald-950' :
    source === 'youtube_music' ? 'from-red-900 to-red-950' :
    'from-frost-800 to-frost-900';

  return (
    <div className={cn('w-full h-full rounded-2xl bg-gradient-to-br flex items-center justify-center', gradient)}>
      <Disc3 size={64} className="text-white/20" />
    </div>
  );
}

export function Media() {
  const { media, updateMedia, togglePlayPause } = useStore();

  // Simulate progress
  useEffect(() => {
    if (!media.isPlaying) return;
    const t = setInterval(() => {
      updateMedia({ progress: Math.min(media.progress + 1, media.duration) });
    }, 1000);
    return () => clearInterval(t);
  }, [media.isPlaying, media.progress]);

  const progressPct = media.duration > 0 ? (media.progress / media.duration) * 100 : 0;

  return (
    <div className="p-6 overflow-auto">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold text-frost-100">Media Control</h2>
          <p className="text-sm text-frost-500 mt-0.5">
            {media.source ? `Now playing via ${media.source.replace('_', ' ')}` : 'No media source detected'}
          </p>
        </div>

        {/* Main player card */}
        <div className="glass-card">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Album art */}
            <div className="w-full sm:w-48 h-48 rounded-2xl overflow-hidden shrink-0 shadow-2xl">
              <AlbumArtPlaceholder source={media.source} />
            </div>

            {/* Controls */}
            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider',
                    media.source === 'spotify' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-frost-800/50 text-frost-400 border border-frost-700/30'
                  )}>
                    {media.source ?? 'No source'}
                  </span>
                  {media.isPlaying && (
                    <div className="flex items-end gap-0.5 h-3">
                      {[1, 2, 3].map((i) => (
                        <motion.div
                          key={i}
                          className="w-0.5 bg-arctic-400 rounded-full"
                          animate={{ height: ['4px', '12px', '4px'] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-frost-50 truncate">{media.title}</h2>
                <p className="text-frost-400 mt-0.5">{media.artist}</p>
              </div>

              {/* Progress */}
              <div className="mt-4">
                <div className="relative h-1.5 rounded-full bg-frost-800/50 cursor-pointer group">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full bg-arctic-500 transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ left: `calc(${progressPct}% - 6px)` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-frost-600 mt-1.5">
                  <span className="font-mono">{formatDuration(media.progress)}</span>
                  <span className="font-mono">{formatDuration(media.duration)}</span>
                </div>
              </div>

              {/* Playback controls */}
              <div className="flex items-center justify-between mt-2">
                <button className="p-2 rounded-lg text-frost-500 hover:text-frost-200 transition-colors">
                  <Shuffle size={16} />
                </button>
                <button className="p-2 rounded-xl text-frost-300 hover:text-frost-100 hover:bg-frost-800/50 transition-all">
                  <SkipBack size={20} />
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={togglePlayPause}
                  className="w-12 h-12 rounded-full bg-arctic-500 flex items-center justify-center text-white shadow-lg shadow-arctic-500/30 hover:bg-arctic-400 transition-colors"
                >
                  {media.isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                </motion.button>
                <button className="p-2 rounded-xl text-frost-300 hover:text-frost-100 hover:bg-frost-800/50 transition-all">
                  <SkipForward size={20} />
                </button>
                <button className="p-2 rounded-lg text-frost-500 hover:text-frost-200 transition-colors">
                  <Repeat size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Volume */}
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => updateMedia({ isMuted: !media.isMuted })}
              className="p-2 rounded-lg text-frost-500 hover:text-frost-200 transition-colors"
            >
              {media.isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <div className="flex-1 relative h-1.5 rounded-full bg-frost-800/50 cursor-pointer group">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-frost-400"
                style={{ width: `${media.isMuted ? 0 : media.volume}%` }}
              />
            </div>
            <span className="text-xs text-frost-500 font-mono w-8">{media.isMuted ? 0 : media.volume}%</span>
          </div>
        </div>

        {/* Source buttons */}
        <div className="glass-card">
          <p className="font-semibold text-frost-200 text-sm mb-3">Media Sources</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { id: 'spotify', label: 'Spotify', icon: '🎵', color: 'bg-emerald-500/10 border-emerald-500/20' },
              { id: 'youtube_music', label: 'YT Music', icon: '▶️', color: 'bg-red-500/10 border-red-500/20' },
              { id: 'apple_music', label: 'Apple Music', icon: '🎶', color: 'bg-rose-500/10 border-rose-500/20' },
              { id: 'media_player', label: 'Media Player', icon: '🎬', color: 'bg-blue-500/10 border-blue-500/20' },
              { id: 'browser', label: 'Browser', icon: '🌐', color: 'bg-frost-800/30 border-frost-700/30' },
            ].map(({ id, label, icon, color }) => (
              <button
                key={id}
                onClick={() => updateMedia({ source: id as any })}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all',
                  media.source === id ? color : 'bg-frost-900/30 border-frost-800/30 hover:bg-frost-800/40'
                )}
              >
                <span className="text-xl">{icon}</span>
                <span className="text-[11px] text-frost-400">{label}</span>
                {media.source === id && <div className="w-1 h-1 rounded-full bg-arctic-400" />}
              </button>
            ))}
          </div>
        </div>

        {/* Quick volume controls */}
        <div className="glass-card">
          <p className="font-semibold text-frost-200 text-sm mb-3">Quick Volume</p>
          <div className="flex flex-wrap gap-2">
            {[0, 25, 50, 75, 100].map((v) => (
              <button
                key={v}
                onClick={() => updateMedia({ volume: v, isMuted: v === 0 })}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                  media.volume === v ? 'bg-arctic-500/20 border-arctic-500/30 text-arctic-400' : 'bg-frost-800/30 border-frost-700/30 text-frost-500 hover:text-frost-300'
                )}
              >
                {v}%
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
