import { getSupabase } from '../lib/supabase';
import FeedInfinite from '@/components/FeedInfinite';

export const dynamic = 'force-dynamic';

type Row = {
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

const PAGE_SIZE = 10;

// Same SELECT used in API
const SELECT = `
  id,
  title,
  slug,
  content,
  status,
  published_at,
  cover_image_path,
  cover_image_alt,
  video_provider,
  video_path,
  video_url,
  likes_count,
  comments_count,
  categories:category_id (slug, name_en)
`;

export default async function HomePage() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('articles')
    .select(SELECT)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .order('id', { ascending: false })
    .range(0, PAGE_SIZE); // inclusive range → returns PAGE_SIZE + 1 rows

  if (error) {
    return (
      <main className="py-6 space-y-4">
        <h1 className="text-2xl font-semibold">This is North</h1>
        <p style={{ color: 'crimson' }}>Error: {error.message}</p>
      </main>
    );
  }

  const hasMore = (data?.length ?? 0) > PAGE_SIZE;
  const initialItems = (data as unknown as Row[]).slice(0, PAGE_SIZE);
  const initialNextCursor = hasMore ? PAGE_SIZE : null;

  return (
    <main className="py-6 space-y-4">
      <h1 className="text-2xl font-semibold">This is North</h1>
      <FeedInfinite
        initialItems={initialItems}
        initialNextCursor={initialNextCursor}
        pageSize={PAGE_SIZE}
      />
    </main>
  );
}
