import Link from 'next/link';
import { getSupabase } from '../lib/supabase';
import ArticleCard from '../components/ArticleCard';

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
  categories?: { slug: string | null; name_en: string | null } | null;
};

export default async function HomePage() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('articles')
    .select(`
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
      categories:category_id (slug, name_en)
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  const list = (data as unknown as Row[]) ?? [];

  return (
    <main className="py-6 space-y-4">
      <h1 className="text-2xl font-semibold">This is North</h1>

      {error ? <p style={{ color: 'crimson' }}>Error: {error.message}</p> : null}

      {list.length === 0 ? (
        <p>No articles yet.</p>
      ) : (
        <ul style={{ display: 'grid', gap: 12, padding: 0, listStyle: 'none' }}>
          {list.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </ul>
      )}
    </main>
  );
}
