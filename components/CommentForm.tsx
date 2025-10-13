'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supabase-browser';

export default function CommentForm({ articleId }: { articleId: number }) {
  const router = useRouter();
  const supabase = getBrowserSupabase();

  const [userId, setUserId] = useState<string | null>(null);
  const [emailConfirmed, setEmailConfirmed] = useState<boolean>(false);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const u = data.user ?? null;
      setUserId(u?.id ?? null);
      setEmailConfirmed(!!u?.email_confirmed_at);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUserId(session?.user?.id ?? null);
      setEmailConfirmed(!!session?.user?.email_confirmed_at);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  if (!userId) {
    return (
      <div className="border rounded p-3 bg-gray-50">
        <p className="text-sm">
          You must be signed in to comment. <a className="underline" href="/login">Sign in</a>
        </p>
      </div>
    );
  }

  if (!emailConfirmed) {
    return (
      <div className="border rounded p-3 bg-yellow-50">
        <p className="text-sm">Please confirm your email to comment.</p>
      </div>
    );
  }

  async function submit() {
    setError(null);
    const text = body.trim();
    if (text.length < 2) return setError('Comment is too short.');
    if (text.length > 2000) return setError('Comment is too long (max 2000 chars).');

    // Clear input immediately; do not show a busy state
    setBody('');

    // Fire-and-forget insert; do not await. Log any errors.
    supabase
      .from('comments')
      .insert({ article_id: articleId, user_id: userId, body: text }, { returning: 'minimal' })
      .then(({ error }) => {
        if (error) {
          console.error('Comment insert error:', error);
          setError(error.message);
        }
        // Force a refresh so the server-rendered list re-fetches
        router.refresh();
      })
      .catch((e) => {
        console.error('Comment insert exception:', e);
        setError(e?.message ?? 'Failed to post comment.');
        router.refresh();
      });

    // Nudge a refresh quickly too (helps in slow dev)
    setTimeout(() => router.refresh(), 300);
  }

  return (
    <div className="space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        className="w-full border rounded p-2"
        placeholder="Write a comment…"
        maxLength={2000}
      />
      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          className="border rounded px-3 py-1 bg-brand text-white"
          type="button"
        >
          Post comment
        </button>
        {error ? <span className="text-red-600 text-sm">{error}</span> : null}
      </div>
    </div>
  );
}