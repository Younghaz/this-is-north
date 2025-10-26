import { notFound } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import FeedInfinite from '@/components/FeedInfinite';

export const dynamic = 'force-dynamic';

export default async function CategoryPage({ 
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = getSupabase();

  // 1️⃣ Find category
  const { data: cat, error: catErr } = await supabase
    .from('categories')
    .select('id, slug, name_en, name_ha')
    .eq('slug', slug)
    .maybeSingle();

  if (catErr || !cat) notFound();

  // 2️⃣ Initial articles (server-render first page)
  const PAGE_SIZE = 10;
  const SELECT = `
    id,
    slug,
    title,
    content,
    excerpt,
    status,
    published_at,
    cover_image_path,
    cover_image_alt,
    video_provider,
    video_path,
    video_url,
    likes_count,
    comments_count,
    category_id,
    categories:category_id (slug, name_en)
  `;

  const { data: articles, error } = await supabase
    .from('articles')
    .select(SELECT)
    .eq('status', 'published')
    .eq('category_id', cat.id)
    .order('published_at', { ascending: false })
    .order('id', { ascending: false })
    .range(0, PAGE_SIZE); // inclusive -> PAGE_SIZE+1

  const list = articles ?? [];
  // Transform to match FeedInfinite's Article type
  const transformedList = list.map(article => ({
    ...article,
    categories: article.categories?.[0] || null // FeedInfinite expects single category object, not array
  }));
  
  const hasMore = (transformedList.length ?? 0) > PAGE_SIZE;
  const initialItems = transformedList.slice(0, PAGE_SIZE);
  const initialNextCursor = hasMore ? PAGE_SIZE : null;

  return (
    <main className="py-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {cat.name_en}
          {cat.name_ha ? (
            <span className="text-gray-500 text-sm ml-2">({cat.name_ha})</span>
          ) : null}
        </h1>
        <span className="text-sm text-gray-500">/{cat.slug}</span>
      </header>

      {error ? (
        <p className="text-red-600">Error: {error.message}</p>
      ) : (
        <FeedInfinite
          initialItems={initialItems}
          initialNextCursor={initialNextCursor}
          pageSize={PAGE_SIZE}
          filters={{ categorySlug: slug }}
        />
      )}
    </main>
  );
}
