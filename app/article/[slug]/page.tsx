import Link from 'next/link';
import { notFound } from 'next/navigation';
import AdSenseSlot from '@/components/AdSenseSlot';
import LikeButton from '@/components/LikeButton';
import CommentsList from '@/components/CommentsList';
import CommentForm from '@/components/CommentForm';
import CommentsRealtime from '@/components/CommentsRealtime';
import { getSupabase } from '@/lib/supabase';
import { normalizeArticleHtml } from '@/lib/content-normalize';

// Safe import of sanitizer (use a tiny fallback if package isn't installed)
let sanitizeArticleHtml: (s: string) => string = (s) => s;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { sanitizeArticleHtml: realSanitize } = require('@/lib/sanitize');
  sanitizeArticleHtml = realSanitize;
} catch {
  // minimal fallback – allows rendering while you install sanitize-html
  sanitizeArticleHtml = (s) =>
    (s || '')
      .replace(/<\/?(script|style)[^>]*>/gi, '')
      .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '');
}

// Normalize a single URL: convert signed storage URL -> public URL
function toPublicStorageUrl(url: string | null | undefined) {
  if (!url) return '';
  return url.replace(
    /(https?:\/\/[^"'\s]+\/storage\/v1\/object)\/sign\/([^"'\s?]+)(\?[^"'\s"]*)?/,
    (_m, base, key) => `${base}/public/${key}`
  );
}

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export default async function ArticlePage({ params }: { params: Params }) {
  const { slug } = await params;

  const supabase = getSupabase();
  // Select common cover fields so we can support whatever your table has
  let query = supabase
    .from('articles')
    .select(
      [
        'id',
        'slug',
        'title',
        'content',
        'published_at',
        'status',
        // cover variants (any that exist in your schema will be populated)
        'cover_url',
        'cover_image_url',
        'cover_image',
        'image_url',
        'cover_alt',
        'image_alt',
      ].join(', ')
    )
    .eq('slug', slug);

  // In development, show drafts too; in production, only published
  if (process.env.NODE_ENV === 'production') {
    query = query.eq('status', 'published');
  }

  const { data: article, error } = await query.maybeSingle();

  if (error || !article) {
    notFound();
  }

  // Pick whichever cover field exists
  const coverUrlRaw =
    (article as any).cover_url ||
    (article as any).cover_image_url ||
    (article as any).cover_image ||
    (article as any).image_url ||
    null;

  const coverAlt =
    (article as any).cover_alt || (article as any).image_alt || article.title || 'Cover image';

  // Convert any signed URL to a public URL for the hero image
  const heroSrc = toPublicStorageUrl(coverUrlRaw);

  // 1) Normalize content (YouTube embeds + Supabase signed URLs -> public)
  const normalized = normalizeArticleHtml(article.content || '');
  // 2) Sanitize (or pass-through via the tiny fallback above)
  const contentHtml = sanitizeArticleHtml(normalized);

  return (
    <main className="prose max-w-3xl py-6">
      <h1>{article.title}</h1>

      {/* Render hero image if provided */}
      {heroSrc ? (
        <div className="not-prose my-4">
          {/* Use plain img so we don't depend on next/image config */}
          <img
            src={heroSrc}
            alt={coverAlt}
            loading="eager"
            decoding="async"
            style={{ width: '100%', height: 'auto', borderRadius: 8, display: 'block' }}
          />
        </div>
      ) : null}

      <div className="not-prose mb-4 flex items-center gap-4">
        <LikeButton articleId={article.id} />
        <Link className="text-sm" href={`/profile/admin`}>
          @admin
        </Link>
      </div>

      <AdSenseSlot slot="0000000000" />

      {/* Main article content (images/videos inside content will show) */}
      <article dangerouslySetInnerHTML={{ __html: contentHtml }} />

      <section className="mt-8 not-prose space-y-4">
        <h2 className="text-xl font-semibold">Comments</h2>
        <CommentsRealtime articleId={article.id} />
        <CommentForm articleId={article.id} />
        <CommentsList articleId={article.id} />
      </section>
    </main>
  );
}