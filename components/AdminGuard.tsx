'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

    (async () => {
      try {
        console.log('AdminGuard: Starting auth check...');
        
        const { data: userRes, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('AdminGuard: Auth error:', authError);
          setErr(`Auth error: ${authError.message}`);
          setLoading(false);
          return;
        }
        
        const u = userRes?.user ?? null;
        console.log('AdminGuard: User:', u?.email);
        setEmail(u?.email ?? null);

        if (!u) {
          console.log('AdminGuard: No user found');
          setLoading(false);
          return;
        }

        console.log('AdminGuard: Checking admin status...');
        const { data, error } = await supabase
          .from('admins')
          .select('id')
          .eq('id', u.id)
          .maybeSingle();

        if (error) {
          console.error('AdminGuard: Admin check error:', error);
          setErr(`Admin check failed: ${error.message}`);
        } else {
          console.log('AdminGuard: Admin check result:', !!data);
          setIsAdmin(!!data);
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error('AdminGuard: Unexpected error:', errorMessage);
        setErr(errorMessage);
      } finally {
        if (mounted) setLoading(false);
      }
    })();


    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.log('AdminGuard: Timeout reached, stopping loading');
        setLoading(false);
      }
    }, 4000);


    const { data: sub } = supabase.auth.onAuthStateChange(() => {
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
