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
    <main className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Sign in</h1>
      <div className="login-form-card">
        <div className="login-mode-switch">
          <button
            className={`login-mode-btn${mode === 'magic' ? ' active' : ''}`}
            onClick={() => setMode('magic')}
            type="button"
          >
            Magic link
          </button>
          <button
            className={`login-mode-btn${mode === 'password' ? ' active' : ''}`}
            onClick={() => setMode('password')}
            type="button"
          >
            Password
          </button>
        </div>
        {mode === 'magic' ? (
          <form onSubmit={sendMagicLink} className="login-form-fields">
            <input
              className="login-input"
              placeholder="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button disabled={busy} className="login-btn" type="submit">
              {busy ? 'Sending…' : 'Send magic link'}
            </button>
            {info ? <div className="login-info">{info}</div> : null}
            {error ? <div className="login-error">{error}</div> : null}
          </form>
        ) : (
          <form onSubmit={signInWithPassword} className="login-form-fields">
            <input
              className="login-input"
              placeholder="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="login-input"
              placeholder="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button disabled={busy} className="login-btn" type="submit">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            {error ? <div className="login-error">{error}</div> : null}
          </form>
        )}
      </div>
      <div className="login-switch-signup">
        Don't have an account? <a href="/signup">Sign up</a>
      </div>
    </main>
  );
}