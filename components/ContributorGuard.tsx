'use client';

import { useState, useEffect } from 'react';
import { getBrowserSupabase } from '@/lib/supabase-browser';

interface ContributorGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function ContributorGuard({ children, fallback }: ContributorGuardProps) {
  const [canWrite, setCanWrite] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getBrowserSupabase();

  useEffect(() => {
    async function checkWritePermissions() {
      try {
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
  }, [supabase]);

  if (loading) {
    return <div className="flex items-center justify-center py-8">Loading...</div>;
  }

  if (!canWrite) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 text-center">
        {fallback || (
          <>
            <h1 className="text-2xl font-bold mb-4">Access Restricted</h1>
            <p className="text-gray-600 mb-4">
              You need contributor access to write and publish articles.
            </p>
            <p className="text-sm text-gray-500">
              Contact an administrator to request contributor access.
            </p>
          </>
        )}
      </div>
    );
  }

  return <>{children}</>;
}