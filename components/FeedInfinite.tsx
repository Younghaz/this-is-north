'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ArticleCard from '@/components/ArticleCard';

type Article = {
  id: number;
  title: string;
  slug: string;
  content: string | null;
  status: 'draft' | 'published';
  published_at: string | null;
  cover_image_path?: string | null;
  cover_image_alt?: string | null;
  video_provider?: string | null;
  video_path?: string | null;
  video_url?: string | null;
  likes_count?: number | null;
  comments_count?: number | null;
  categories?: { slug: string | null; name_en: string | null } | null;
};

type Props = {
  initialItems: Article[];
  initialNextCursor: number | null;
  pageSize?: number;
};

export default function FeedInfinite({
  initialItems,
  initialNextCursor,
  pageSize = 10,
}: Props) {
  const [items, setItems] = useState<Article[]>(() => initialItems || []);
  const [nextCursor, setNextCursor] = useState<number | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMore = useMemo(() => nextCursor !== null, [nextCursor]);
  const seen = useRef<Set<number>>(new Set(initialItems.map((a) => a.id)));

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(pageSize));
      params.set('cursor', String(nextCursor));
      const res = await fetch(`/api/articles?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Failed to load');

      const next = (json.items as Article[]) || [];
      const deduped: Article[] = [];
      for (const it of next) {
        if (!seen.current.has(it.id)) {
          seen.current.add(it.id);
          deduped.push(it);
        }
      }
      setItems((prev) => [...prev, ...deduped]);
      setNextCursor(json.nextCursor ?? null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load more');
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, nextCursor, pageSize]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const ent = entries[0];
        if (ent.isIntersecting) loadMore();
      },
      { rootMargin: '1200px 0px 800px 0px', threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadMore]);

  return (
    <div className="space-y-3">
      <ul style={{ display: 'grid', gap: 12, padding: 0, listStyle: 'none' }}>
        {items.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </ul>

      {error ? <div className="text-sm text-red-600">Error: {error}</div> : null}

      {hasMore ? (
        <div className="flex items-center justify-center py-4">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="border rounded px-3 py-1"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      ) : (
        <div className="text-center text-sm text-gray-500 py-6">
          You’ve reached the end.
        </div>
      )}

      <div ref={sentinelRef} aria-hidden="true" />
    </div>
  );
}
