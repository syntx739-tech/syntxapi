import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Package, ExternalLink, Snowflake } from 'lucide-react';

const API_BASE_URL = (typeof window !== 'undefined' && window.localStorage.getItem('arctic-api-url'))
  || 'https://syntxapi.onrender.com';

type Software = {
  id: string;
  name: string;
  description: string;
  version: string;
  game: string;
  category: string | null;
  originalFileName: string | null;
  fileSize: number;
  downloadUrl: string | null;
  downloads: number;
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DownloadsPage() {
  const [software, setSoftware] = useState<Software[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/software`);
        if (response.ok) {
          const data = await response.json();
          setSoftware(data);
        }
      } catch {
        // API might be unreachable
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleDownload = async (sw: Software) => {
    setDownloading(sw.id);
    try {
      const response = await fetch(`${API_BASE_URL}/api/software/${sw.id}/download`);
      if (!response.ok) throw new Error('Download failed');
      const data = await response.json();

      if (data.downloadUrl) {
        // External URL — open in new tab
        window.open(data.downloadUrl, '_blank');
      } else {
        // File download
        const blobResponse = await fetch(`${API_BASE_URL}/api/software/${sw.id}/download`);
        const blob = await blobResponse.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = sw.name.replace(/[^a-zA-Z0-9.-]/g, '_') + (sw.originalFileName ? `-${sw.originalFileName}` : '');
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-arctic-500 border-t-transparent" />
          <p className="text-sm text-frost-500">Loading available software...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div>
        <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-arctic-400">
          <span className="h-1.5 w-1.5 rounded-full bg-arctic-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          Downloads
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-frost-50 sm:text-3xl">Software Downloads</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-frost-500">Download available software and tools. Only live entries are shown here.</p>
      </div>

      {software.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <Package size={40} className="mb-4 text-frost-700" />
          <p className="text-sm font-medium text-frost-400">No software available yet</p>
          <p className="mt-1 text-xs text-frost-600">Software will appear here once published by the admin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {software.map((sw, index) => (
            <motion.div
              key={sw.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="glass-card group flex flex-col"
            >
              <div className="flex items-start gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-400">
                  <Package size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-frost-100">{sw.name}</h3>
                    <span className="rounded-full border border-frost-700/40 bg-frost-800/60 px-2 py-0.5 text-[10px] font-medium text-frost-400">v{sw.version}</span>
                  </div>
                  {sw.description && <p className="mt-1.5 text-xs leading-relaxed text-frost-500">{sw.description}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {sw.game && <span className="inline-flex items-center rounded-full border border-arctic-500/20 bg-arctic-500/10 px-2 py-0.5 text-[10px] font-medium text-arctic-400">{sw.game}</span>}
                    {sw.category && <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">{sw.category}</span>}
                    {sw.originalFileName && <span className="text-[10px] text-frost-600">📁 {sw.originalFileName}</span>}
                    {sw.fileSize > 0 && <span className="text-[10px] text-frost-600">{formatFileSize(sw.fileSize)}</span>}
                  </div>
                </div>
              </div>
              <div className="mt-auto border-t border-frost-800/40 px-5 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-frost-600">{sw.downloads} download{sw.downloads === 1 ? '' : 's'}</span>
                  <button
                    onClick={() => void handleDownload(sw)}
                    disabled={downloading === sw.id}
                    className="flex items-center gap-1.5 rounded-lg bg-arctic-500/15 px-3 py-1.5 text-xs font-medium text-arctic-400 transition-all hover:bg-arctic-500/25 hover:text-arctic-300 disabled:opacity-50"
                  >
                    {downloading === sw.id ? (
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-arctic-400 border-t-transparent" />
                    ) : sw.downloadUrl ? (
                      <ExternalLink size={13} />
                    ) : (
                      <Download size={13} />
                    )}
                    {downloading === sw.id ? 'Downloading...' : 'Download'}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Loader download — always visible */}
      <div className="glass-card border border-arctic-500/20 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-arctic-500/20 bg-arctic-500/10 text-arctic-400">
            <Snowflake size={22} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-frost-100">ARCTIC Loader</h3>
            <p className="mt-0.5 text-xs text-frost-500">The main loader application. Download and run it, then sign in with your license key.</p>
          </div>
          <button className="flex items-center gap-1.5 rounded-lg bg-arctic-500/15 px-4 py-2 text-sm font-medium text-arctic-400 transition-all hover:bg-arctic-500/25">
            <Download size={14} />
            Download Loader
          </button>
        </div>
      </div>
    </div>
  );
}
