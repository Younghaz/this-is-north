'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { getBrowserSupabase } from '../lib/supabase-browser';

type Profile = {
  id: string;
  display_name?: string | null;
  username?: string | null;
  is_admin?: boolean | null;
};

type CommentRow = {
  id: number;
  article_id: number;
  parent_id: number | null;
  user_id?: string | null;
  author_id?: string | null;
  body: string;
  created_at: string;
  profiles?: Profile | null; // via user_id
};

export default function CommentsThread({ articleId }: { articleId: number }) {
  const supabase = getBrowserSupabase();

  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [newBody, setNewBody] = useState('');
  const [replyOpenFor, setReplyOpenFor] = useState<number | null>(null);
  const [replyBody, setReplyBody] = useState('');

  function nameFor(p?: Profile | null) {
    return p?.display_name || p?.username || 'user';
  }

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      // session
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess?.user?.id ?? null;
      setSessionUserId(uid);

      // admin?
      if (uid) {
        const { data: me } = await supabase
          .from('profiles')
          .select('id, is_admin, display_name, username')
          .eq('id', uid)
          .maybeSingle();
        setIsAdmin(!!me?.is_admin);
      } else {
        setIsAdmin(false);
      }

      // Comments + author profile via user_id relationship
      const { data, error } = await supabase
        .from('comments')
        .select('id, article_id, parent_id, user_id, author_id, body, created_at, profiles:user_id(id, display_name, username, is_admin)')
        .eq('article_id', articleId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments((data as unknown as CommentRow[]) ?? []);
    } catch (e) {
      if (e instanceof Error) {
        setErr(e.message ?? 'Failed to load comments');
      } else {
        setErr('Failed to load comments');
      }
    } finally {
      setLoading(false);
    }
  }, [articleId, supabase]);

  useEffect(() => { load(); }, [articleId, load]);

  const tree = useMemo(() => {
    const byParent = new Map<number | 'root', CommentRow[]>();
    for (const c of comments) {
      const key = (c.parent_id ?? 'root') as number | 'root';
      const arr = byParent.get(key) ?? [];
      arr.push(c);
      byParent.set(key, arr);
    }
    return byParent;
  }, [comments]);

  async function addComment() {
    if (!sessionUserId) return alert('Please sign in to comment.');
    const body = newBody.trim();
    if (!body) return;
    try {
      const { error } = await supabase
        .from('comments')
        .insert({ article_id: articleId, body });
      if (error) throw error;
      setNewBody('');
      await load();
    } catch (e) {
      if (e instanceof Error) {
        alert(e.message ?? 'Failed to comment.');
      } else {
        alert('Failed to comment.');
      }
    }
  }

  async function addReply(parentId: number) {
    if (!sessionUserId) return alert('Please sign in to reply.');
    const body = replyBody.trim();
    if (!body) return;
    try {
      const { error } = await supabase
        .from('comments')
        .insert({ article_id: articleId, parent_id: parentId, body });
      if (error) throw error;
      setReplyBody('');
      setReplyOpenFor(null);
      await load();
    } catch (e) {
      if (e instanceof Error) {
        alert(e.message ?? 'Failed to reply.');
      } else {
        alert('Failed to reply.');
      }
    }
  }

  async function delComment(id: number, ownerId: string | null | undefined) {
    if (!sessionUserId) return;
    const effectiveOwner = ownerId ?? sessionUserId; // fallback
    const canDelete = isAdmin || effectiveOwner === sessionUserId;
    if (!canDelete) return alert('You can only delete your own comment.');
    if (!confirm('Delete this comment?')) return;
    try {
      const { error } = await supabase.from('comments').delete().eq('id', id);
      if (error) throw error;
      await load();
    } catch (e) {
      if (e instanceof Error) {
        alert(e.message ?? 'Failed to delete.');
      } else {
        alert('Failed to delete.');
      }
    }
  }

  const roots = tree.get('root') ?? [];

  return (
    <section className="mt-6">
      <h2 className="text-2xl font-bold mb-2">Comments</h2>

      {loading ? <p>Loading…</p> : null}
      {err ? <p className="text-red-600">{err}</p> : null}

      {sessionUserId ? (
        <div className="my-3">
          <textarea
            rows={4}
            className="w-full p-2 border rounded"
            placeholder="Write a comment…"
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
          />
          <button onClick={addComment} className="mt-2 px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
            Post comment
          </button>
        </div>
      ) : (
        <div className="my-3">
          You must be signed in to comment. <a className="underline text-blue-600" href={`/login?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`}>Sign in</a>
        </div>
      )}

      <div className="grid gap-3">
        {roots.map((c) => (
          <div key={c.id} className="border rounded p-3">
            <div className="text-xs text-gray-600">
              {nameFor(c.profiles)} • {new Date(c.created_at).toLocaleString()}
            </div>
            <div className="mt-2 whitespace-pre-wrap">{c.body}</div>
            <div className="flex gap-3 mt-2">
              {sessionUserId ? (
                <button onClick={() => setReplyOpenFor(replyOpenFor === c.id ? null : c.id)} className="text-blue-600 underline">
                  {replyOpenFor === c.id ? 'Cancel' : 'Reply'}
                </button>
              ) : null}
              {(isAdmin || (c.user_id ?? c.author_id) === sessionUserId) ? (
                <button onClick={() => delComment(c.id, c.user_id ?? c.author_id)} className="text-red-600">
                  Delete
                </button>
              ) : null}
            </div>

            <div className="mt-3 ml-4 border-l-4 border-gray-200 pl-3">
              {(tree.get(c.id) ?? []).map((r) => (
                <div key={r.id} className="mb-2">
                  <div className="text-xs text-gray-600">
                    {nameFor(r.profiles)} • {new Date(r.created_at).toLocaleString()}
                  </div>
                  <div className="whitespace-pre-wrap">{r.body}</div>
                  {(isAdmin || (r.user_id ?? r.author_id) === sessionUserId) ? (
                    <div>
                      <button onClick={() => delComment(r.id, r.user_id ?? r.author_id)} className="text-red-600 mt-1">
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}

              {replyOpenFor === c.id ? (
                <div>
                  <textarea
                    rows={3}
                    className="w-full p-2 border rounded mt-2"
                    placeholder="Write a reply…"
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                  />
                  <button onClick={() => addReply(c.id)} className="mt-2 px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
                    Reply
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}