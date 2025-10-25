
"use client";

// --- Bookmarks tab state ---
import UserAvatar from '@/components/UserAvatar';
import type { Profile } from '../../../lib/types';
import type { CommentRow, ArticleRow } from '../../../lib/types';
// import removed: avatarPlaceholder
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
// import removed: useSession
import { getBrowserSupabase } from '@/lib/supabase-browser';

export default function ProfilePageClient({ id }: { id: string }) {
  // Removed unused session
  const supabase = getBrowserSupabase();
  const [tab, setTab] = useState<'comments' | 'bookmarks'>('comments');
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [articleById, setArticleById] = useState<Map<number, ArticleRow>>(new Map());
  const [totalComments, setTotalComments] = useState<number | null>(null);
  // Bookmarks state
  // Remove unused state setters and specify a better type for bookmarkedArticles
  const [bookmarkedArticles] = useState<ArticleRow[]>([]);
  const [bookmarksLoading] = useState(false);
  const [bookmarksError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const PAGE = 20;
  const [cursor, setCursor] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const canLoadMore = useMemo(() => hasMore && !loading && !error, [hasMore, loading, error]);

  // Only show bookmarks if the session user is the profile owner
  // Removed unused isProfileOwner
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
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load profile.');
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more comments.');
    } finally {
      setLoading(false);
    }
  }


  // Show error if profile fetch fails, so user is not stuck on Loading…
  if (loading && !profile && !error) return <main className="p-6">Loading…</main>;
  if (error && !profile) return <main className="p-6 text-red-600 font-semibold">{error}</main>;
  if (!profile) return null;

  const name = profile.display_name || profile.username || 'User';
  // Removed unused avatar

  return (
    <main className="max-w-2xl mx-auto p-0">
      {/* --- Profile header card --- */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-8 mb-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col items-center">
            <UserAvatar name={name} avatar_url={profile.avatar_url} size={120} />
          </div>
          <h1 className="text-3xl font-bold mt-4 mb-1 text-center">{name}</h1>
          {profile.username && (
            <div className="text-base text-gray-600 mb-1 text-center">@{profile.username}</div>
          )}
          <div className="flex flex-wrap gap-4 text-gray-700 text-base justify-center mb-2">
            {profile.location && <span>📍 {profile.location}</span>}
            {profile.age && <span>🎂 {profile.age} years old</span>}
            {typeof totalComments === 'number' && <span>{totalComments} {totalComments === 1 ? 'comment' : 'comments'}</span>}
          </div>
          <div className="mt-2 flex gap-3 justify-center items-center">
            <Link href="/profile/edit" passHref legacyBehavior>
              <button className="px-6 py-2 rounded-lg border border-gray-300 bg-gray-100 text-base font-medium cursor-pointer">Edit Profile</button>
            </Link>
            <Link href="/profile/settings" passHref legacyBehavior>
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 bg-gray-100 ml-1 cursor-pointer" title="Settings">
                <svg width="22" height="22" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="3.5" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1.5 1.1V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82-.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.1-1.5H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1.5-1.1V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.31.22.65.22 1s-.08.69-.22 1a1.65 1.65 0 0 0 1.1 1.5H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.5z" />
                </svg>
              </span>
            </Link>
          </div>
        </div>
      </div>

      {profile.bio && (
        <section className="bg-white border border-gray-200 rounded-xl shadow p-5 max-w-lg mx-auto mb-8">
          <h2 className="text-xl font-semibold mb-2">Bio</h2>
          <p className="whitespace-pre-wrap text-gray-800 text-base">{profile.bio}</p>
        </section>
      )}

      {/* --- Tab bar --- */}
      <div className="flex gap-8 border-b-2 border-gray-200 mb-8 justify-center">
        <button
          className={`bg-none border-none cursor-pointer text-xl font-semibold py-2 ${tab === 'comments' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-500 border-b-4 border-transparent'} transition-colors`}
          onClick={() => setTab('comments')}
        >
          Comments
        </button>
        <button
          className={`bg-none border-none cursor-pointer text-xl font-semibold py-2 ${tab === 'bookmarks' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-500 border-b-4 border-transparent'} transition-colors`}
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
