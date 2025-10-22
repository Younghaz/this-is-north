"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getBrowserSupabase } from '../lib/supabase-browser';

export default function ProfileTab() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    const supabase = getBrowserSupabase();
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  if (!userId) return null;
  return (
    <Link href={`/profile/${userId}`} className="profile-tab-link">
      My Profile
    </Link>
  );
}
