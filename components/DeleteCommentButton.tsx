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
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data.user?.id ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const canDelete = currentUserId && currentUserId === authorUserId;

  async function onDelete() {
    if (!canDelete) return;
    if (!confirm('Delete this comment?')) return;
    setBusy(true);

    // Fire-and-forget delete; let realtime refresh the list
    const delPromise = supabase
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
        alert((e as any)?.message || 'Failed to delete comment.');
      });

    // Release the button quickly so it never looks stuck
    setTimeout(() => setBusy(false), 300);
    void delPromise;
  }

  if (!canDelete) return null;

  return (
    <button
      onClick={onDelete}
      disabled={busy}
      className="text-xs text-red-600 hover:underline disabled:opacity-60"
      aria-label="Delete comment"
    >
      {busy ? 'Deleting…' : 'Delete'}
    </button>
  );
}