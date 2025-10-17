'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBrowserSupabase } from '@/lib/supabase-browser';

type Report = {
  id: number;
  content_type: 'comment' | 'article';
  content_id: number;
  reporter_id: string | null;
  reason: string | null;
  status: string | null;
  created_at: string;
};

type CommentRow = {
  id: number;
  article_id: number;
  body: string;
  status: string | null;
  created_at: string;
};

type ArticleRow = {
  id: number;
  slug: string;
  title: string;
  status: string | null;
  published_at: string | null;
};

export default function ModerationPage() {
  const supabase = getBrowserSupabase();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [commentsById, setCommentsById] = useState<Map<number, CommentRow>>(new Map());
  const [articlesById, setArticlesById] = useState<Map<number, ArticleRow>>(new Map());
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) { setIsAdmin(false); return; }

      const { data: adminRow } = await supabase.from('admins').select('id').eq('id', uid).maybeSingle();
      if (cancelled) return;
      if (!adminRow) { setIsAdmin(false); return; }
      setIsAdmin(true);

      const { data: repData, error: repErr } = await supabase
        .from('reports')
        .select('id, content_type, content_id, reporter_id, reason, status, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (repErr) { setError(repErr.message); return; }
      const list = (repData as Report[]) || [];
      setReports(list);

      // Load referenced content in bulk
      const commentIds = list.filter(r => r.content_type === 'comment').map(r => r.content_id);
      const articleIds = list.filter(r => r.content_type === 'article').map(r => r.content_id);

      if (commentIds.length) {
        const { data: coms } = await supabase
          .from('comments')
          .select('id, article_id, body, status, created_at')
          .in('id', Array.from(new Set(commentIds)));
        const map = new Map<number, CommentRow>();
        for (const c of (coms as CommentRow[]) || []) map.set(c.id, c);
        setCommentsById(map);
      }

      if (articleIds.length) {
        const { data: arts } = await supabase
          .from('articles')
          .select('id, slug, title, status, published_at')
          .in('id', Array.from(new Set(articleIds)));
        const map = new Map<number, ArticleRow>();
        for (const a of (arts as ArticleRow[]) || []) map.set(a.id, a);
        setArticlesById(map);
      }
    })();
    return () => { cancelled = true; }
  }, [supabase]);

  async function resolve(reportId: number, newStatus: 'resolved' | 'dismissed') {
    setBusy(reportId);
    try {
      const { error } = await supabase.from('reports').update({ status: newStatus }).eq('id', reportId);
      if (error) throw error;
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (e: any) {
      setError(e?.message || 'Failed to update report');
    } finally {
      setBusy(null);
    }
  }

  async function hideComment(commentId: number, reportId: number) {
    setBusy(reportId);
    try {
      const { error: cErr } = await supabase.from('comments').update({ status: 'hidden' }).eq('id', commentId);
      if (cErr) throw cErr;
      await resolve(reportId, 'resolved');
    } catch (e: any) {
      setError(e?.message || 'Failed to hide comment');
      setBusy(null);
    }
  }

  async function approveComment(commentId: number, reportId: number) {
    setBusy(reportId);
    try {
      const { error: cErr } = await supabase.from('comments').update({ status: 'visible' }).eq('id', commentId);
      if (cErr) throw cErr;
      await resolve(reportId, 'resolved');
    } catch (e: any) {
      setError(e?.message || 'Failed to approve comment');
      setBusy(null);
    }
  }

  async function unpublishArticle(articleId: number, reportId: number) {
    setBusy(reportId);
    try {
      const { error: aErr } = await supabase.from('articles').update({ status: 'draft' }).eq('id', articleId);
      if (aErr) throw aErr;
      await resolve(reportId, 'resolved');
    } catch (e: any) {
      setError(e?.message || 'Failed to unpublish');
      setBusy(null);
    }
  }

  if (isAdmin === null) {
    return <main className="max-w-3xl py-6"><h1 className="text-2xl font-semibold">Moderation</h1><p>Loading…</p></main>;
  }
  if (!isAdmin) {
    return <main className="max-w-3xl py-6"><h1 className="text-2xl font-semibold">Moderation</h1><p>You are not an admin.</p></main>;
  }

  return (
    <main className="max-w-3xl py-6 space-y-4">
      <h1 className="text-2xl font-semibold">Moderation queue</h1>
      {error ? <p className="text-red-600">{error}</p> : null}

      {reports.length === 0 ? <p>No pending reports.</p> : (
        <ul className="space-y-3">
          {reports.map((r) => {
            const isComment = r.content_type === 'comment';
            const c = isComment ? commentsById.get(r.content_id) : null;
            const a = !isComment ? articlesById.get(r.content_id) : null;

            return (
              <li key={r.id} className="border rounded p-3">
                <div className="text-sm text-gray-600">
                  Report #{r.id} • {new Date(r.created_at).toLocaleString()}
                </div>
                <div className="mt-1 text-sm">Reason: {r.reason || '(none)'}</div>

                {isComment && c ? (
                  <div className="mt-2">
                    <div className="text-sm">Comment ID: {c.id} • Status: {c.status}</div>
                    <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
                    <div className="mt-1 text-sm">
                      <Link className="underline" href={`/article/${c.article_id}#comment-${c.id}`}>View</Link>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button disabled={busy === r.id} className="border rounded px-3 py-1" onClick={() => hideComment(c.id, r.id)}>Hide</button>
                      <button disabled={busy === r.id} className="border rounded px-3 py-1" onClick={() => approveComment(c.id, r.id)}>Approve</button>
                      <button disabled={busy === r.id} className="border rounded px-3 py-1" onClick={() => resolve(r.id, 'dismissed')}>Dismiss</button>
                    </div>
                  </div>
                ) : !isComment && a ? (
                  <div className="mt-2">
                    <div className="text-sm">Article: <Link className="underline" href={`/article/${a.slug}`}>{a.title}</Link> • Status: {a.status}</div>
                    <div className="mt-2 flex gap-2">
                      <button disabled={busy === r.id} className="border rounded px-3 py-1" onClick={() => unpublishArticle(a.id, r.id)}>Unpublish</button>
                      <button disabled={busy === r.id} className="border rounded px-3 py-1" onClick={() => resolve(r.id, 'dismissed')}>Dismiss</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-gray-600">(Target content not found)</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}