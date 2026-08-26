import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, ExternalLink, Package, Snowflake } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../lib/api';

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

type LoaderRelease = { version: string; notes: string; originalFileName: string | null; fileSize: number };

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function downloadResponse(response: Response, fileName: string) {
  if (!response.ok) throw new Error(`Download failed (${response.status})`);
  const type = response.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    const data = await response.json() as { downloadUrl?: string };
    if (data.downloadUrl) { window.open(data.downloadUrl, '_blank', 'noopener,noreferrer'); return; }
    throw new Error('No download URL returned');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = fileName; anchor.click(); URL.revokeObjectURL(url);
}

export function DownloadsPage() {
  const [software, setSoftware] = useState<Software[]>([]);
  const [loader, setLoader] = useState<LoaderRelease | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [softwareResponse, loaderResponse] = await Promise.all([fetch(`${API_BASE_URL}/api/software`), fetch(`${API_BASE_URL}/api/loader/latest`)]);
        if (softwareResponse.ok) setSoftware(await softwareResponse.json() as Software[]);
        if (loaderResponse.ok) setLoader(await loaderResponse.json() as LoaderRelease);
      } catch {
        toast.error('Could not load downloads from the API');
      } finally { setLoading(false); }
    };
    void load();
  }, []);

  const handleSoftwareDownload = async (sw: Software) => {
    setDownloading(sw.id);
    try { await downloadResponse(await fetch(`${API_BASE_URL}/api/software/${sw.id}/download`), `${sw.name.replace(/[^a-zA-Z0-9.-]/g, '_')}-${sw.originalFileName || `v${sw.version}`}`); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Download failed'); }
    finally { setDownloading(null); }
  };

  const handleLoaderDownload = async () => {
    setDownloading('loader');
    try { await downloadResponse(await fetch(`${API_BASE_URL}/api/loader/download`), loader?.originalFileName || 'Arctic.exe'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Loader download failed'); }
    finally { setDownloading(null); }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="text-center"><div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-arctic-500 border-t-transparent" /><p className="text-sm text-frost-500">Loading available downloads...</p></div></div>;

  return <div className="mx-auto max-w-5xl space-y-8 p-6">
    <div><div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-arctic-400"><span className="h-1.5 w-1.5 rounded-full bg-arctic-400" />Downloads</div><h1 className="text-2xl font-bold tracking-tight text-frost-50 sm:text-3xl">Software Downloads</h1><p className="mt-1.5 max-w-2xl text-sm text-frost-500">Only software published by the owner appears here.</p></div>
    {software.length === 0 ? <div className="glass-card py-16 text-center"><Package size={40} className="mx-auto mb-4 text-frost-700" /><p className="text-sm font-medium text-frost-400">No software available yet</p><p className="mt-1 text-xs text-frost-600">Published software will appear here.</p></div> : <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{software.map((sw, index) => <motion.div key={sw.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="glass-card flex flex-col"><div className="flex items-start gap-4 p-5"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-400"><Package size={22} /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="text-sm font-bold text-frost-100">{sw.name}</h3><span className="rounded-full border border-frost-700/40 bg-frost-800/60 px-2 py-0.5 text-[10px] text-frost-400">v{sw.version}</span></div>{sw.description && <p className="mt-1.5 text-xs leading-relaxed text-frost-500">{sw.description}</p>}<div className="mt-2 flex flex-wrap gap-2">{sw.game && <span className="rounded-full border border-arctic-500/20 bg-arctic-500/10 px-2 py-0.5 text-[10px] text-arctic-400">{sw.game}</span>}{sw.category && <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">{sw.category}</span>}{sw.fileSize > 0 && <span className="text-[10px] text-frost-600">{formatFileSize(sw.fileSize)}</span>}</div></div></div><div className="mt-auto flex items-center justify-between border-t border-frost-800/40 px-5 py-3"><span className="text-[10px] text-frost-600">{sw.downloads} downloads</span><button onClick={() => void handleSoftwareDownload(sw)} disabled={downloading === sw.id} className="flex items-center gap-1.5 rounded-lg bg-arctic-500/15 px-3 py-1.5 text-xs font-medium text-arctic-400 disabled:opacity-50">{sw.downloadUrl ? <ExternalLink size={13} /> : <Download size={13} />}{downloading === sw.id ? 'Downloading...' : 'Download'}</button></div></motion.div>)}</div>}
    <div className="glass-card border border-arctic-500/20 p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-arctic-500/20 bg-arctic-500/10 text-arctic-400"><Snowflake size={22} /></div><div className="flex-1"><h3 className="text-sm font-bold text-frost-100">ARCTIC Loader {loader ? `v${loader.version}` : ''}</h3><p className="mt-0.5 text-xs text-frost-500">{loader?.notes || 'The current loader release is managed by the owner.'}</p>{loader?.fileSize ? <p className="mt-1 text-[10px] text-frost-600">{formatFileSize(loader.fileSize)}</p> : null}</div><button onClick={() => void handleLoaderDownload()} disabled={!loader || downloading === 'loader'} className="flex items-center gap-1.5 rounded-lg bg-arctic-500/15 px-4 py-2 text-sm font-medium text-arctic-400 disabled:opacity-50"><Download size={14} />{downloading === 'loader' ? 'Downloading...' : 'Download Loader'}</button></div></div>
  </div>;
}
