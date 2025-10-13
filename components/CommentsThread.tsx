'use client';

import { useEffect, useMemo, useState } from 'react';
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

  async function load() {
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
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [articleId]);

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
        .insert({ article_id: articleId, body }, { returning: 'minimal' });
      if (error) throw error;
      setNewBody('');
      await load();
    } catch (e: any) {
      alert(e?.message ?? 'Failed to comment.');
    }
  }

  async function addReply(parentId: number) {
    if (!sessionUserId) return alert('Please sign in to reply.');
    const body = replyBody.trim();
    if (!body) return;
    try {
      const { error } = await supabase
        .from('comments')
        .insert({ article_id: articleId, parent_id: parentId, body }, { returning: 'minimal' });
      if (error) throw error;
      setReplyBody('');
      setReplyOpenFor(null);
      await load();
    } catch (e: any) {
      alert(e?.message ?? 'Failed to reply.');
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
    } catch (e: any) {
      alert(e?.message ?? 'Failed to delete.');
    }
  }

  const roots = tree.get('root') ?? [];

  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Comments</h2>

      {loading ? <p>Loading…</p> : null}
      {err ? <p style={{ color: 'crimson' }}>{err}</p> : null}

      {sessionUserId ? (
        <div style={{ margin: '12px 0' }}>
          <textarea
            rows={4}
            style={{ width: '100%', padding: 8 }}
            placeholder="Write a comment…"
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
          />
          <button onClick={addComment} style={{ marginTop: 8, padding: '6px 10px' }}>
            Post comment
          </button>
        </div>
      ) : (
        <div style={{ margin: '12px 0' }}>
          You must be signed in to comment. <a href={`/login?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`}>Sign in</a>
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {roots.map((c) => (
          <div key={c.id} style={{ border: '1px solid #ccc', padding: 12 }}>
            <div style={{ fontSize: 12, color: '#555' }}>
              {nameFor(c.profiles)} • {new Date(c.created_at).toLocaleString()}
            </div>
            <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{c.body}</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              {sessionUserId ? (
                <button onClick={() => setReplyOpenFor(replyOpenFor === c.id ? null : c.id)}>
                  {replyOpenFor === c.id ? 'Cancel' : 'Reply'}
                </button>
              ) : null}
              {(isAdmin || (c.user_id ?? c.author_id) === sessionUserId) ? (
                <button onClick={() => delComment(c.id, c.user_id ?? c.author_id)} style={{ color: 'crimson' }}>
                  Delete
                </button>
              ) : null}
            </div>

            <div style={{ marginTop: 10, marginLeft: 16, borderLeft: '3px solid #eee', paddingLeft: 12 }}>
              {(tree.get(c.id) ?? []).map((r) => (
                <div key={r.id} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: '#555' }}>
                    {nameFor(r.profiles)} • {new Date(r.created_at).toLocaleString()}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{r.body}</div>
                  {(isAdmin || (r.user_id ?? r.author_id) === sessionUserId) ? (
                    <div>
                      <button onClick={() => delComment(r.id, r.user_id ?? r.author_id)} style={{ color: 'crimson', marginTop: 4 }}>
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
                    style={{ width: '100%', padding: 8, marginTop: 8 }}
                    placeholder="Write a reply…"
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                  />
                  <button onClick={() => addReply(c.id)} style={{ marginTop: 6, padding: '6px 10px' }}>
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