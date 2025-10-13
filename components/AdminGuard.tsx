'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBrowserSupabase } from '../lib/supabase-browser';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [email, setEmail] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let timeoutId: any;

    (async () => {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const u = userRes?.user ?? null;
        setEmail(u?.email ?? null);

        if (!u) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', u.id)
          .maybeSingle();

        if (error) {
          setErr(error.message);
        } else {
          setIsAdmin(!!data?.is_admin);
        }
      } catch (e: any) {
        setErr(e?.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    timeoutId = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 4000);

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, _session) => {
      router.refresh();
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      sub.subscription.unsubscribe();
    };
  }, [supabase, router]);

  if (loading) return <p>Checking admin…</p>;

  if (!email) {
    return (
      <div className="border rounded p-4 space-y-2">
        <p>You must be signed in.</p>
        <a className="underline" href="/login?next=/admin">Go to login</a>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="border rounded p-4 space-y-2">
        <p>This page is for admins only.</p>
        {err ? <p className="text-red-600 text-sm">Note: {err}</p> : null}
        <p className="text-sm text-gray-600">
          If you just promoted your user, refresh this page. Ensure profiles_select_own policy exists and your profile.is_admin is true.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}