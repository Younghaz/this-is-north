import Link from 'next/link';
import { makeExcerptFromHtml } from '../lib/excerpt';
import { publicStorageUrl } from '../lib/public-url';

type Article = {
  id: number;
  title: string;
  slug: string;
  content: string | null;
  published_at: string | null;
  cover_image_path?: string | null;
  cover_image_alt?: string | null;
  categories?: { slug: string | null; name_en: string | null } | null;
};

export default function ArticleCard({ article }: { article: Article }) {
  const excerpt = makeExcerptFromHtml(article.content, 320); // ~4 lines for typical widths
  const imgSrc = publicStorageUrl('images', article.cover_image_path);

  return (
    <li
      style={{
        border: '1px solid #ccc',
        padding: 12,
        display: 'grid',
        gap: 8,
      }}
    >
      {/* ✅ Cover image */}
      {imgSrc ? (
        <Link href={`/article/${article.slug}`} style={{ display: 'block' }}>
          <img
            src={imgSrc}
            alt={article.cover_image_alt ?? ''}
            style={{
              width: '100%',
              height: 180,
              objectFit: 'cover',
              background: '#f3f3f3',
              borderRadius: 4,
            }}
          />
        </Link>
      ) : null}

      {/* ✅ Category and date */}
      <div style={{ fontSize: 12, color: '#555' }}>
        {article.categories?.name_en ||
          article.categories?.slug ||
          'Uncategorized'}
        {article.published_at
          ? ` • ${new Date(article.published_at).toLocaleDateString()}`
          : ''}
      </div>

      {/* ✅ Title */}
      <Link
        href={`/article/${article.slug}`}
        style={{
          fontSize: 22,
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        {article.title}
      </Link>

      {/* ✅ Excerpt */}
      {excerpt ? (
        <p
          style={{
            marginTop: 4,
            color: '#222',
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical' as any,
            overflow: 'hidden',
          }}
        >
          {excerpt}
        </p>
      ) : null}

      {/* ✅ Read link */}
      <div>
        <Link href={`/article/${article.slug}`}>Read</Link>
      </div>
    </li>
  );
}
