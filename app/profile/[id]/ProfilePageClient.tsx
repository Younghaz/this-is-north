
'use client';
import UserAvatar from '@/components/UserAvatar';

import Link from 'next/link';

import { useEffect, useMemo, useState } from 'react';
import { getBrowserSupabase } from '@/lib/supabase-browser';

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  location?: string | null;
  age?: number | null;
  bio?: string | null;
};

type CommentRow = {
  id: number;
  article_id: number;
  body: string;
  created_at: string;
  status?: string | null;
};

type ArticleRow = {
  id: number;
  slug: string;
  title: string;
};

function placeholderAvatar(name: string) {
  const seed = (name || 'User').trim().slice(0, 2).toUpperCase() || 'U';
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    seed
  )}&backgroundType=gradientLinear`;
}

export default function ProfilePageClient({ id }: { id: string }) {
  const supabase = getBrowserSupabase();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [articleById, setArticleById] = useState<Map<number, ArticleRow>>(
    new Map()
  );
  const [totalComments, setTotalComments] = useState<number | null>(null);

  const PAGE = 20;
  const [cursor, setCursor] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const canLoadMore = useMemo(
    () => hasMore && !loading && !error,
    [hasMore, loading, error]
  );

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
  const avatar = profile.avatar_url || placeholderAvatar(name);

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* --- Profile header card --- */}
      <div className="bg-white border rounded-xl shadow-sm p-6">
        <header className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <UserAvatar name={name} avatar_url={profile.avatar_url} size={112} />
          <div>
            <h1 className="text-2xl font-semibold">{name}</h1>
            {profile.username && (
              <div className="text-sm text-gray-600">@{profile.username}</div>
            )}
            {profile.location && (
              <div className="text-sm text-gray-600">📍 {profile.location}</div>
            )}
            {profile.age && (
              <div className="text-sm text-gray-600">🎂 {profile.age} years old</div>
            )}
            {typeof totalComments === 'number' && (
              <div className="text-sm text-gray-600 mt-1">
                {totalComments} {totalComments === 1 ? 'comment' : 'comments'}
              </div>
            )}
            <div style={{ marginTop: '12px' }}>
              <a href="/profile/edit">
                <button style={{ padding: '6px 16px', borderRadius: '6px', border: '1px solid #888', background: '#f3f3f3', cursor: 'pointer' }}>
                  Edit Profile
                </button>
              </a>
            </div>
          </div>
        </header>
        {profile.bio && (
          <section className="max-w-xl mb-2 mt-4">
            <h2 className="text-lg font-semibold mb-1">Bio</h2>
            <p className="whitespace-pre-wrap text-gray-900">{profile.bio}</p>
          </section>
        )}
      </div>

      {/* --- Comments list --- */}
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
    </main>
  );
}
