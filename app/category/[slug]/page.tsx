import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import ArticleCard from '@/components/ArticleCard';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export default async function CategoryPage({ params }: { params: Params }) {
  const { slug } = await params;
  const supabase = getSupabase();

  // 1️⃣ Find the category by slug
  const { data: cat, error: catErr } = await supabase
    .from('categories')
    .select('id, slug, name_en, name_ha')
    .eq('slug', slug)
    .maybeSingle();

  if (catErr || !cat) notFound();

  // 2️⃣ Get published articles (now includes media fields)
  const { data: articles, error } = await supabase
    .from('articles')
    .select(`
      id,
      slug,
      title,
      content,
      excerpt,
      published_at,
      cover_url,
      video_provider,
      video_path,
      categories:category_id (slug, name_en)
    `)
    .eq('status', 'published')
    .eq('category_id', cat.id)
    .order('published_at', { ascending: false })
    .limit(20);

  const list = articles ?? [];

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

      {error ? <p className="text-red-600">Error: {error.message}</p> : null}

      {list.length === 0 ? (
        <p className="text-gray-600">No articles yet in this category.</p>
      ) : (
        <section className="grid gap-6 md:grid-cols-2">
          {list.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </section>
      )}
    </main>
  );
}
