import FeedInfinite from '@/components/FeedInfinite';
import { getSupabase } from '@/lib/supabase';
import type { Article } from '@/components/FeedInfinite';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 10;

export default async function TrendingPage() {
  const supabase = getSupabase();

  // Try to pull from the articles_trending view for fast initial render
  const { data: viaView, error: viewErr } = await supabase
    .from('articles_trending')
    .select(`
      id,
      slug,
      title,
      excerpt,
      published_at,
      cover_image_path,
      cover_image_alt,
      likes_count,
      comments_count,
      views_count,
      trending_score
    `)
    .order('trending_score', { ascending: false })
    .limit(PAGE_SIZE + 1);

  let list: Article[] = (viaView ?? []).map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    content: null,
    status: 'published',
    published_at: a.published_at ?? null,
    cover_image_path: a.cover_image_path ?? null,
    cover_image_alt: a.cover_image_alt ?? null,
    video_provider: null,
    video_path: null,
    video_url: null,
    likes_count: a.likes_count ?? null,
    comments_count: a.comments_count ?? null,
    category_id: null,
    categories: null,
    trending_score: a.trending_score ?? 0,
    views_count: a.views_count ?? null,
    profiles: null,
  }));
  let fallbackNote: string | null = null;

  // Fallback (if view missing or schema not loaded)
  if (viewErr || !viaView) {
    const { data: viaArticles, error: articlesErr } = await supabase
      .from('articles')
      .select(`
        id,
        slug,
        title,
        excerpt,
        published_at,
        cover_image_path,
        cover_image_alt,
        likes_count,
        comments_count,
        views_count
      `)
      .eq('status', 'published')
      .order('likes_count', { ascending: false })
      .limit(PAGE_SIZE + 1);

    if (!articlesErr && viaArticles) {
      list = viaArticles.map((a) => ({
        id: a.id,
        slug: a.slug,
        title: a.title,
        content: null,
        status: 'published',
        published_at: a.published_at ?? null,
        cover_image_path: a.cover_image_path ?? null,
        cover_image_alt: a.cover_image_alt ?? null,
        video_provider: null,
        video_path: null,
        video_url: null,
        likes_count: a.likes_count ?? null,
        comments_count: a.comments_count ?? null,
        category_id: null,
        categories: null,
        trending_score: a.likes_count ?? 0,
        views_count: a.views_count ?? null,
        profiles: null,
      }));
      fallbackNote = '⚠️ Using fallback (ordered by likes).';
    }
  }

  const hasMore = (list?.length ?? 0) > PAGE_SIZE;
  const initialItems = list.slice(0, PAGE_SIZE);
  const initialNextCursor = hasMore ? PAGE_SIZE : null;

  return (
    <main className="py-6 space-y-6">
      <h1 className="text-2xl font-bold">🔥 Trending</h1>

      {viewErr ? (
        <p className="text-sm text-orange-600">Note: {viewErr.message}</p>
      ) : null}
      {fallbackNote ? (
        <p className="text-sm text-gray-600">{fallbackNote}</p>
      ) : null}

      <FeedInfinite
        initialItems={initialItems}
        initialNextCursor={initialNextCursor}
        pageSize={PAGE_SIZE}
        filters={{ sort: 'trending' } as Record<string, unknown>}
      />
    </main>
  );
}
