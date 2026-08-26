import React, { FormEvent, useState } from 'react';
import { KeyRound, Users } from 'lucide-react';
import { ArcticApiError, staffApi } from './api';

type Props = { onAuthenticated: (username: string) => void };

export function StaffLogin({ onAuthenticated }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await staffApi.login(username, password);
      onAuthenticated(result.user.username);
    } catch (reason) {
      if (reason instanceof ArcticApiError && reason.code === 'STAFF_SUSPENDED') {
        setError('This staff account is suspended. Contact the owner.');
      } else if (reason instanceof ArcticApiError && reason.code === 'DEVICE_LOCKED') {
        setError('This device is not authorized. Check Discord and approve the device reset request.');
      } else if (reason instanceof ArcticApiError && reason.code === 'RESET_NOT_CONFIGURED') {
        setError('This device is not authorized. Configure the Discord reset webhook on the API server.');
      } else {
        setError(reason instanceof Error ? reason.message : 'Login failed.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-frost-950 px-4 py-8 text-frost-50">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(14,165,233,0.1),transparent_65%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-arctic-500/30 bg-arctic-500/10 text-arctic-400 shadow-[0_0_35px_rgba(14,165,233,0.18)]">
            <Users size={25} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-arctic-400">ARCTIC</p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-frost-50">Staff console</h1>
          <p className="mt-2 text-sm text-frost-500">Sign in with your staff account to issue license keys.</p>
        </div>

        <form onSubmit={submit} className="glass-card space-y-5 border border-frost-800/60 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.45)]">
          <div>
            <label className="label" htmlFor="staff-username">Username</label>
            <input id="staff-username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="input" placeholder="Staff username" required />
          </div>
          <div>
            <label className="label" htmlFor="staff-password">Password</label>
            <input id="staff-password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="input" placeholder="Password" type="password" required />
          </div>

          {error && <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">{error}</div>}

          <button type="submit" disabled={busy} className="btn-primary w-full justify-center">
            <KeyRound size={16} />
            {busy ? 'Signing in...' : 'Sign in'}
          </button>

          <p className="text-center text-[11px] leading-relaxed text-frost-600">
            Staff accounts are created by the owner on the main keypanel. Each staff account has a fixed key quota.
          </p>
        </form>
      </div>
    </main>
  );
}
