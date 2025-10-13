'use client';

import { useEffect, useState } from 'react';
import { getBrowserSupabase } from '@/lib/supabase-browser';

type SessionUser = { email?: string | null } | null;

export default function AuthStatus() {
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getBrowserSupabase();

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(data.user ?? null);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  if (loading) return null;

  if (!user) {
    return (
      <a className="text-sm underline" href="/login">
        Sign in
      </a>
    );
  }

  return (
    <div className="text-sm flex items-center gap-3">
      <span>{user.email}</span>
      <button
        className="border rounded px-2 py-1 hover:bg-gray-50"
        onClick={async () => {
          await supabase.auth.signOut();
          window.location.href = '/';
        }}
      >
        Sign out
      </button>
    </div>
  );
}