'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supabase-browser';

export default function ReplyForm({ articleId, parentId, onDone }: { articleId: number; parentId: number; onDone?: () => void }) {
  const router = useRouter();
  const supabase = getBrowserSupabase();

  const [userId, setUserId] = useState<string | null>(null);
  const [emailConfirmed, setEmailConfirmed] = useState<boolean>(false);
  const [body, setBody] = useState('');
  const [err, setErr] = useState<string | null>(null);

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

  if (!userId) return <p className="text-sm">Please <a className="underline" href="/login">sign in</a> to reply.</p>;
  if (!emailConfirmed) return <p className="text-sm">Please confirm your email to reply.</p>;

  async function submit() {
    setErr(null);
    const text = body.trim();
    if (!text) return;
    setBody('');

    supabase
      .from('comments')
      .insert({ article_id: articleId, parent_id: parentId, user_id: userId, body: text, status: 'visible' }, { returning: 'minimal' })
      .then(({ error }) => {
        if (error) setErr(error.message);
        router.refresh();
        onDone?.();
      })
      .catch((e) => {
        setErr(e?.message ?? 'Failed to reply.');
        router.refresh();
      });
  }

  return (
    <div className="mt-2 space-y-2">
      <textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="w-full border rounded p-2"
        placeholder="Write a reply…"
      />
      <div className="flex items-center gap-2">
        <button onClick={submit} className="border rounded px-2 py-1 bg-brand text-white" type="button">
          Reply
        </button>
        {err ? <span className="text-red-600 text-sm">{err}</span> : null}
      </div>
    </div>
  );
}