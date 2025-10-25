
"use client";

// --- Bookmarks tab state ---
import UserAvatar from '@/components/UserAvatar';
import type { Profile } from '@/lib/types';
import type { CommentRow, ArticleRow } from '@/lib/types';
import { avatarPlaceholder } from '@/lib/avatar-placeholder';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from '@/lib/useSession';
import { getBrowserSupabase } from '@/lib/supabase-browser';

export default function ProfilePageClient({ id }: { id: string }) {
  const { session } = useSession();
  const supabase = getBrowserSupabase();
  const [tab, setTab] = useState<'comments' | 'bookmarks'>('comments');
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [articleById, setArticleById] = useState<Map<number, ArticleRow>>(new Map());
  const [totalComments, setTotalComments] = useState<number | null>(null);
  // Bookmarks state
  const [bookmarkedArticles, setBookmarkedArticles] = useState<any[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);
  const [bookmarksError, setBookmarksError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const PAGE = 20;
  const [cursor, setCursor] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const canLoadMore = useMemo(() => hasMore && !loading && !error, [hasMore, loading, error]);

  // Only show bookmarks if the session user is the profile owner
  const isProfileOwner = session?.user?.id === id;
  // (Removed duplicate state declarations)

  // Bookmarks state

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        // Load profile
        const { data: prof, error: pErr } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, location, age, bio')
          .eq('id', id)
          .maybeSingle();
        if (pErr) throw pErr;
        if (!prof) throw new Error('Profile not found.');
        if (cancelled) return;
        setProfile(prof as Profile);

        // Count comments
        const { count, error: cErr } = await supabase
          .from('comments')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', id)
          .eq('status', 'visible');
        if (cErr) throw cErr;
        if (cancelled) return;
        setTotalComments(count ?? 0);

        // First page of comments
        const { data: comData, error: comErr } = await supabase
          .from('comments')
          .select('id, article_id, body, created_at, status')
          .eq('user_id', id)
          .eq('status', 'visible')
          .order('created_at', { ascending: false })
          .range(0, PAGE - 1);
        if (comErr) throw comErr;
        const list = (comData as CommentRow[]) ?? [];
        setComments(list);
        setHasMore((count ?? list.length) > PAGE);
        setCursor(PAGE);

        // Article titles
        const articleIds = Array.from(new Set(list.map((c) => c.article_id)));
        if (articleIds.length) {
          const { data: arts } = await supabase
            .from('articles')
            .select('id, slug, title')
            .in('id', articleIds);
          const map = new Map<number, ArticleRow>();
          for (const a of (arts as ArticleRow[]) ?? []) map.set(a.id, a);
          setArticleById(map);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load profile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, supabase]);

  async function loadMore() {
    if (!canLoadMore) return;
    setLoading(true);
    setError(null);
    try {
      const from = cursor;
      const to = cursor + PAGE - 1;
      const { data: comData } = await supabase
        .from('comments')
        .select('id, article_id, body, created_at, status')
        .eq('user_id', id)
        .eq('status', 'visible')
        .order('created_at', { ascending: false })
        .range(from, to);

      const next = (comData as CommentRow[]) ?? [];
      setComments((prev) => [...prev, ...next]);
      setCursor(to + 1);

      const missing = next
        .map((c) => c.article_id)
        .filter((aid) => !articleById.has(aid));
      if (missing.length) {
        const { data: arts } = await supabase
          .from('articles')
          .select('id, slug, title')
          .in('id', Array.from(new Set(missing)));
        const map = new Map(articleById);
        for (const a of (arts as ArticleRow[]) ?? []) map.set(a.id, a);
        setArticleById(map);
      }

      setHasMore(next.length === PAGE);
    } catch (e: any) {
      setError(e?.message || 'Failed to load more comments.');
    } finally {
      setLoading(false);
    }
  }


  // Show error if profile fetch fails, so user is not stuck on Loading…
  if (loading && !profile && !error) return <main className="p-6">Loading…</main>;
  if (error && !profile) return <main className="p-6 text-red-600 font-semibold">{error}</main>;
  if (!profile) return null;

  const name = profile.display_name || profile.username || 'User';
  const avatar = profile.avatar_url || avatarPlaceholder(name);

  return (

    <main style={{ maxWidth: 600, margin: '40px auto', padding: 0 }}>
      {/* --- Profile header card --- */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: 32, marginBottom: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <UserAvatar name={name} avatar_url={profile.avatar_url} size={120} />
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, margin: '16px 0 4px 0', textAlign: 'center' }}>{name}</h1>
          {profile.username && (
            <div style={{ fontSize: 16, color: '#666', marginBottom: 4, textAlign: 'center' }}>@{profile.username}</div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, color: '#555', fontSize: 15, justifyContent: 'center', marginBottom: 8 }}>
            {profile.location && <span>📍 {profile.location}</span>}
            {profile.age && <span>🎂 {profile.age} years old</span>}
            {typeof totalComments === 'number' && <span>{totalComments} {totalComments === 1 ? 'comment' : 'comments'}</span>}
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
            <a href="/profile/edit">
              <button style={{ padding: '8px 24px', borderRadius: 8, border: '1px solid #bbb', background: '#f7f7f7', fontSize: 16, fontWeight: 500, cursor: 'pointer' }}>Edit Profile</button>
            </a>
            <a href="/profile/settings" title="Settings" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', border: '1px solid #bbb', background: '#f7f7f7', marginLeft: 4, cursor: 'pointer' }}>
              <svg width="22" height="22" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3.5" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1.5 1.1V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82-.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.1-1.5H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1.5-1.1V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.31.22.65.22 1s-.08.69-.22 1a1.65 1.65 0 0 0 1.1 1.5H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.5z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {profile.bio && (
        <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', padding: 20, maxWidth: 480, margin: '0 auto 32px auto' }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Bio</h2>
          <p style={{ whiteSpace: 'pre-wrap', color: '#222', fontSize: 16 }}>{profile.bio}</p>
        </section>
      )}

      {/* --- Tab bar --- */}
      <div style={{ display: 'flex', gap: 32, borderBottom: '2px solid #e5e7eb', margin: '0 0 32px 0', justifyContent: 'center' }}>
        <button
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 20,
            fontWeight: 600,
            padding: '8px 0',
            color: tab === 'comments' ? '#2563eb' : '#888',
            borderBottom: tab === 'comments' ? '4px solid #2563eb' : '4px solid transparent',
            transition: 'color 0.2s, border-bottom 0.2s',
            outline: 'none',
          }}
          onClick={() => setTab('comments')}
        >
          Comments
        </button>
        <button
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 20,
            fontWeight: 600,
            padding: '8px 0',
            color: tab === 'bookmarks' ? '#2563eb' : '#888',
            borderBottom: tab === 'bookmarks' ? '4px solid #2563eb' : '4px solid transparent',
            transition: 'color 0.2s, border-bottom 0.2s',
            outline: 'none',
          }}
          onClick={() => setTab('bookmarks')}
        >
          Bookmarks
        </button>
      </div>

      {/* --- Tab content --- */}
      {tab === 'comments' ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Recent comments</h2>
          {comments.length === 0 ? (
            <p className="text-sm text-gray-600">No comments yet.</p>
          ) : (
            <ul className="space-y-3">
              {comments.map((c) => {
                const a = articleById.get(c.article_id);
                const articleUrl = a ? `/article/${a.slug}#comments` : '#';
                return (
                  <li key={c.id} className="border rounded-lg p-3 bg-white shadow-sm">
                    <div className="text-sm text-gray-600 flex flex-wrap items-center gap-2">
                      <span>On</span>
                      {a ? (
                        <Link href={articleUrl} className="underline">
                          {a.title}
                        </Link>
                      ) : (
                        <span>Article</span>
                      )}
                      <span>• {new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-gray-800">
                      {c.body.length > 400 ? c.body.slice(0, 399) + '…' : c.body}
                    </p>
                    {a && (
                      <div className="mt-2">
                        <Link href={articleUrl} className="text-sm underline">
                          View in context
                        </Link>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {error && <div className="text-sm text-red-600">{error}</div>}

          {canLoadMore && (
            <div className="pt-2">
              <button
                type="button"
                onClick={loadMore}
                className="border rounded px-3 py-1 hover:bg-gray-50"
                disabled={loading}
              >
                {loading ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-3">
          <h2 className="text-2xl font-bold mb-3">Bookmarked Articles</h2>
          {bookmarksLoading ? (
            <div className="text-gray-500 text-base p-8 text-center bg-gray-50 rounded-xl">Loading bookmarks…</div>
          ) : bookmarksError ? (
            <div className="text-red-600 text-base p-8 text-center bg-gray-50 rounded-xl">{bookmarksError}</div>
          ) : bookmarkedArticles.length === 0 ? (
            <div className="text-gray-500 text-base p-8 text-center bg-gray-50 rounded-xl">No bookmarks yet.</div>
          ) : (
            <ul className="article-list">
              {bookmarkedArticles.map((a) => (
                <li key={a.id} className="border rounded-lg p-4 bg-white shadow flex items-center gap-3 hover:shadow-md transition">
                  <span className="w-2 h-2 bg-blue-400 rounded-full inline-block"></span>
                  <Link href={`/article/${a.slug}`} className="underline text-lg font-semibold hover:text-blue-700 transition">
                    {a.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

    </main>
  );
}
