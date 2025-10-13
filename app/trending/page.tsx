import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function TrendingPage() {
  const supabase = getSupabase();

  // First try the view
  const { data: viaView, error: viewErr } = await supabase
    .from('articles_trending')
    .select('id, slug, title, excerpt, published_at, trending_score')
    .order('trending_score', { ascending: false })
    .limit(20);

  let list =
    viaView ??
    [];

  // Fallback if the view is missing or schema cache hasn’t picked it up yet
  let fallbackNote: string | null = null;
  if (viewErr || !viaView) {
    const { data: viaArticles, error: articlesErr } = await supabase
      .from('articles')
      .select('id, slug, title, excerpt, published_at, likes_count')
      .eq('status', 'published')
      .order('likes_count', { ascending: false })
      .limit(20);

    if (!articlesErr && viaArticles) {
      list = viaArticles.map((a) => ({
        ...a,
        trending_score: a.likes_count ?? 0
      })) as any[];
      fallbackNote = 'Using fallback (ordered by likes_count).';
    }
  }

  return (
    <main className="py-6 space-y-6">
      <h1 className="text-2xl font-bold">Trending</h1>

      {viewErr ? <p className="text-sm text-orange-600">Note: {viewErr.message}</p> : null}
      {fallbackNote ? <p className="text-sm text-gray-600">{fallbackNote}</p> : null}

      <section className="grid gap-6 md:grid-cols-2">
        {list.map((a: any) => (
          <article key={a.id} className="border p-4 rounded-md">
            <h2 className="font-semibold">{a.title}</h2>
            {a.excerpt ? <p className="text-sm text-gray-600">{a.excerpt}</p> : null}
            <Link className="text-brand" href={`/article/${a.slug}`}>Read</Link>
          </article>
        ))}
      </section>
    </main>
  );
}