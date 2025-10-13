import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const rawQ = Array.isArray(sp?.q) ? sp?.q[0] : sp?.q;
  const q = (rawQ ?? '').trim();

  let results:
    | { id: number; slug: string; title: string; excerpt: string | null; published_at: string | null }[]
    | null = null;
  let errorMsg: string | null = null;

  const supabase = getSupabase();

  if (q.length >= 2) {
    const pattern = `%${q}%`;
    const { data, error } = await supabase
      .from('articles')
      .select('id, slug, title, excerpt, published_at')
      .eq('status', 'published')
      .or(`title.ilike.${pattern},excerpt.ilike.${pattern},content.ilike.${pattern}`)
      .order('published_at', { ascending: false })
      .limit(20);

    if (error) errorMsg = error.message;
    results = data ?? [];
  }

  // 🆕 Fallback: show latest articles when no query
  if (!q) {
    const { data, error } = await supabase
      .from('articles')
      .select('id, slug, title, excerpt, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(20);

    if (error) errorMsg = error.message;
    results = data ?? [];
  }

  return (
    <main className="py-6 space-y-6">
      <h1 className="text-2xl font-bold">Search</h1>

      <form method="GET" className="flex gap-2">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search articles…"
          className="border rounded px-3 py-2 w-full"
        />
        <button className="border rounded px-4 py-2 bg-brand text-white">
          Search
        </button>
      </form>

      {q && q.length < 2 ? (
        <p className="text-sm text-gray-600">Type at least 2 characters.</p>
      ) : null}

      {errorMsg ? <p className="text-red-600">Error: {errorMsg}</p> : null}

      {results && (
        <section className="grid gap-6 md:grid-cols-2">
          {results.map((a) => (
            <article key={a.id} className="border p-4 rounded-md">
              <h2 className="font-semibold">{a.title}</h2>
              {a.excerpt ? <p className="text-sm text-gray-600">{a.excerpt}</p> : null}
              <Link className="text-brand" href={`/article/${a.slug}`}>
                Read
              </Link>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
