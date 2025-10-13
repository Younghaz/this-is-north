'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBrowserSupabase } from '../../lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';
  const supabase = getBrowserSupabase();

  const [mode, setMode] = useState<'magic' | 'password'>('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) router.push(next);
    })();
  }, [supabase, router, next]);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
      setInfo('Check your email for the sign-in link.');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to send magic link.');
    } finally {
      setBusy(false);
    }
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push(next);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to sign in');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-sm mx-auto py-8 space-y-4">
      <h1 className="text-xl font-semibold">Sign in</h1>

      <div className="flex gap-2">
        <button
          className={`border rounded px-3 py-1 ${mode === 'magic' ? 'bg-black text-white' : ''}`}
          onClick={() => setMode('magic')}
          type="button"
        >
          Magic link
        </button>
        <button
          className={`border rounded px-3 py-1 ${mode === 'password' ? 'bg-black text-white' : ''}`}
          onClick={() => setMode('password')}
          type="button"
        >
          Password
        </button>
      </div>

      {mode === 'magic' ? (
        <form onSubmit={sendMagicLink} className="space-y-3">
          <input
            className="w-full border rounded p-2"
            placeholder="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button disabled={busy} className="border rounded px-3 py-1 bg-brand text-white" type="submit">
            {busy ? 'Sending…' : 'Send magic link'}
          </button>
          {info ? <div className="text-gray-700 text-sm">{info}</div> : null}
          {error ? <div className="text-red-600 text-sm">{error}</div> : null}
        </form>
      ) : (
        <form onSubmit={signInWithPassword} className="space-y-3">
          <input
            className="w-full border rounded p-2"
            placeholder="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full border rounded p-2"
            placeholder="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button disabled={busy} className="border rounded px-3 py-1 bg-brand text-white" type="submit">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          {error ? <div className="text-red-600 text-sm">{error}</div> : null}
        </form>
      )}
    </main>
  );
}