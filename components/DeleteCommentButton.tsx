'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supabase-browser';

export default function DeleteCommentButton({
  commentId,
  authorUserId,
}: {
  commentId: number;
  authorUserId: string;
}) {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id ?? null;
      setCurrentUserId(userId);
      
      // Check if user is admin
      if (userId) {
        const { data: adminRow } = await supabase
          .from('admins')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
        setIsAdmin(!!adminRow);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, session) => {
      const userId = session?.user?.id ?? null;
      setCurrentUserId(userId);
      
      // Check admin status on auth change
      if (userId) {
        const { data: adminRow } = await supabase
          .from('admins')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
        setIsAdmin(!!adminRow);
      } else {
        setIsAdmin(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const canDelete = currentUserId && (currentUserId === authorUserId || isAdmin);

  async function onDelete() {
    if (!canDelete) return;
    
    const isOwnComment = currentUserId === authorUserId;
    const confirmMessage = isOwnComment 
      ? 'Delete this comment?' 
      : 'Delete this comment as admin? This action cannot be undone.';
      
    if (!confirm(confirmMessage)) return;
    setBusy(true);

    // Fire-and-forget delete; let realtime refresh the list
    supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .then(({ error }) => {
        if (error) {
          console.error('Delete comment error:', error);
          alert(error.message);
        } else {
          router.refresh();
        }
      })
      .catch((e) => {
        console.error('Delete comment exception:', e);
        alert(e instanceof Error ? e.message : 'Failed to delete comment.');
      });

    // Release the button quickly so it never looks stuck
    setTimeout(() => setBusy(false), 300);
  }

  if (!canDelete) return null;

  const isOwnComment = currentUserId === authorUserId;
  const buttonText = busy 
    ? 'Deleting…' 
    : isOwnComment 
      ? 'Delete' 
      : 'Delete (Admin)';

  return (
    <button
      onClick={onDelete}
      disabled={busy}
      className={`text-xs hover:underline disabled:opacity-60 ${
        isOwnComment ? 'text-red-600' : 'text-red-800 font-medium'
      }`}
      aria-label="Delete comment"
    >
      {buttonText}
    </button>
  );
}