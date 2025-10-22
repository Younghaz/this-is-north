import Link from 'next/link';
import { getSupabase } from '../lib/supabase';
import WriteButton from './WriteButton';
import ProfileTab from './ProfileTab';

// Utility: convert "food-and-stocks" → "Food And Stocks"
function toTitle(slug: string) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export const dynamic = 'force-dynamic';

export default async function SiteNav() {
  const supabase = getSupabase();

  // Fetch visible categories (ordered by position if exists)
  const { data, error } = await supabase
    .from('categories')
    .select('slug, name_en')
    .order('position', { ascending: true })
    .order('name_en', { ascending: true });

  const categories = (data ?? []).filter(Boolean);

  return (
    <nav
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        fontSize: '0.95rem',
        margin: '1rem 0',
      }}
    >
      {/* Left: categories */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        <Link href="/trending">Trending</Link>
        {error ? (
          <span style={{ color: 'red' }}>Error loading categories</span>
        ) : categories.length === 0 ? (
          <span style={{ color: '#666' }}>No categories</span>
        ) : (
          categories.map((cat) => (
            <Link key={cat.slug} href={`/category/${cat.slug}`}>
              {cat.name_en || toTitle(cat.slug)}
            </Link>
          ))
        )}
      </div>

      {/* Right: write button, profile, and search */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <WriteButton />
        <ProfileTab />
        <Link href="/search" style={{ fontWeight: 500 }}>
          Search
        </Link>
      </div>
    </nav>
  );
}
