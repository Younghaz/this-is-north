'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBrowserSupabase } from '../lib/supabase-browser';

export default function WriteButton() {
  const [canWrite, setCanWrite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkWritePermissions() {
      try {
        const supabase = getBrowserSupabase();
        const { data: auth } = await supabase.auth.getUser();
        
        if (!auth.user) {
          setCanWrite(false);
          setLoading(false);
          return;
        }

        // Check if user is admin (admins can always write)
        const { data: adminRow } = await supabase
          .from('admins')
          .select('id')
          .eq('id', auth.user.id)
          .maybeSingle();

        if (adminRow) {
          setCanWrite(true);
          setLoading(false);
          return;
        }

        // Check if user is active contributor (in either table)
        const { data: contributorRow } = await supabase
          .from('contributors')
          .select('id, status')
          .eq('id', auth.user.id)
          .eq('status', 'active')
          .maybeSingle();

        // Also check pending_contributors by email
        const { data: pendingRow } = await supabase
          .from('pending_contributors')
          .select('id, status')
          .eq('email', auth.user.email)
          .eq('status', 'active')
          .maybeSingle();

        setCanWrite(!!(contributorRow || pendingRow));
      } catch (error) {
        console.error('Error checking write permissions:', error);
        setCanWrite(false);
      } finally {
        setLoading(false);
      }
    }

    checkWritePermissions();
  }, []);

  if (loading || !canWrite) {
    return null;
  }

  return (
    <Link 
      href="/write" 
      style={{ 
        fontWeight: 600, 
        color: '#2563eb',
        textDecoration: 'none',
        padding: '0.5rem 1rem',
        border: '1px solid #2563eb',
        borderRadius: '0.25rem',
        fontSize: '0.875rem'
      }}
    >
      Write Article
    </Link>
  );
}