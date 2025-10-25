'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBrowserSupabase } from '../../../lib/supabase-browser';

function getHashParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.hash.replace(/^#/, ''));
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = getBrowserSupabase();

  const next = params.get('next') || '/';
  const codeFromQuery = params.get('code');
  const [error, setError] = useState<string | null>(null);

  const hash = getHashParams();
  const codeFromHash = hash.get('code');
  const err = hash.get('error');
  const errCode = hash.get('error_code');
  const errDesc = hash.get('error_description');

  const effectiveCode = useMemo(
    () => codeFromQuery || codeFromHash,
    [codeFromQuery, codeFromHash]
  );

  useEffect(() => {
    (async () => {
      try {
        // If already signed in, just continue
        const { data: sessionRes } = await supabase.auth.getSession();
        if (sessionRes?.session) {
          router.replace(next);
          router.refresh();
          return;
        }

        // If Supabase sent an error in the hash (e.g., otp_expired), show message and send back to login
        if (err || errCode || errDesc) {
          const msg = errDesc || errCode || err || 'Login failed.';
          setError(decodeURIComponent(msg));
          // Small delay so user sees the message, then redirect to login with next
          setTimeout(() => {
            router.replace(`/login?next=${encodeURIComponent(next)}`);
            router.refresh();
          }, 1200);
          return;
        }

        // If we have a code, exchange it for a session
        if (effectiveCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(effectiveCode);
          if (error) throw error;
          router.replace(next);
          router.refresh();
          return;
        }

        // No session and no code -> go to login
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        router.refresh();
      } catch (e: unknown) {
        let errorMsg = 'Failed to complete sign-in.';
        if (typeof e === 'object' && e !== null && 'message' in e) {
          errorMsg = (e as { message?: string }).message ?? errorMsg;
        } else {
          errorMsg = String(e);
        }
        setError(errorMsg);
        setTimeout(() => {
          router.replace(`/login?next=${encodeURIComponent(next)}`);
          router.refresh();
        }, 1500);
      }
    })();
  }, [effectiveCode, err, errCode, errDesc, next, router, supabase]);

  return (
    <main className="max-w-sm mx-auto py-8">
      <h1 className="text-xl font-semibold mb-2">Signing you in…</h1>
      {error ? <div className="text-red-600 text-sm">Error: {error}</div> : <div>Please wait.</div>}
    </main>
  );
}