import Link from 'next/link';
import { notFound } from 'next/navigation';
import AdSenseSlot from '@/components/AdSenseSlot';
import LikeButton from '@/components/LikeButton';
import CommentsList from '@/components/CommentsList';
import CommentForm from '@/components/CommentForm';
import CommentsRealtime from '@/components/CommentsRealtime';
import FocusCommentOnHash from '@/components/FocusCommentOnHash';
import { getSupabase } from '@/lib/supabase';
import { publicStorageUrl } from '@/lib/public-url';
import ShareButton from '@/components/ShareButton';

// 🔹 Simple sanitizer fallback (no iframes)
let sanitizeArticleHtml: (s: string) => string = (s) =>
  (s || '').replace(/<\/?(script|style)[^>]*>/gi, '');
try {
  const { sanitizeArticleHtml: realSanitize } = require('@/lib/sanitize');
  sanitizeArticleHtml = realSanitize;
} catch {}

// 🔹 Helper for DiceBear avatar placeholders
function avatarPlaceholder(name?: string | null) {
  const seed = encodeURIComponent(name || 'User');
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundType=gradientLinear`;
}

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export default async function ArticlePage({ params }: { params: Params }) {
  const { slug } = await params;
  const supabase = getSupabase();

  // 🧠 Fetch article + author profile join
  const { data: article, error } = await supabase
    .from('articles')
    .select(`
      id,
      slug,
      title,
      content,
      status,
      published_at,
      cover_image_path,
      cover_image_alt,
      video_url,
      video_path,
      profiles:author_id (display_name, avatar_url)
    `)
    .eq('slug', slug)
    .maybeSingle();

  if (error || !article) notFound();

  // 🧩 Video or image sources
  const videoSrc =
    article.video_url ||
    (article.video_path ? publicStorageUrl('videos', article.video_path) : '');

  const heroSrc = article.cover_image_path
    ? publicStorageUrl('images', article.cover_image_path)
    : '';

  const coverAlt = article.cover_image_alt || article.title || 'Cover image';
  const contentHtml = sanitizeArticleHtml(article.content || '');

  // 👤 Author info
  const author = (article as any).profiles;
  const authorName = author?.display_name || 'Guest Author';
  const avatarUrl =
    author?.avatar_url || avatarPlaceholder(author?.display_name);

  return (
    <main className="prose max-w-3xl py-6">
      <h1>{article.title}</h1>

      {/* 👤 Author info */}
      <div className="not-prose mb-6 flex items-center gap-3">
        <img
          src={avatarUrl}
          alt={authorName}
          width={40}
          height={40}
          style={{
            borderRadius: '50%',
            objectFit: 'cover',
            width: 40,
            height: 40,
            border: '1px solid #ddd',
          }}
        />
        <div>
          <div style={{ fontWeight: 600 }}>{authorName}</div>
          {article.published_at && (
            <div style={{ fontSize: 12, color: '#777' }}>
              {new Date(article.published_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* 🎥 Video or 🖼️ Cover image */}
      {videoSrc ? (
        <div className="not-prose my-4">
          <video
            controls
            playsInline
            preload="metadata"
            style={{ width: '100%', maxHeight: '80vh', borderRadius: 8 }}
            src={videoSrc}
          />
        </div>
      ) : heroSrc ? (
        <div className="not-prose my-4">
          <img
            src={heroSrc}
            alt={coverAlt}
            loading="eager"
            decoding="async"
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '80vh',
              objectFit: 'contain',
              borderRadius: 8,
              display: 'block',
            }}
          />
        </div>
      ) : null}

      {/* 💬 Actions: Like + Share */}
      <div className="not-prose mb-4 flex items-center gap-4">
        <LikeButton articleId={article.id} />
        <ShareButton slug={article.slug} title={article.title} />
      </div>

      <AdSenseSlot slot="0000000000" />

      {/* 📄 Article content */}
      <article dangerouslySetInnerHTML={{ __html: contentHtml }} />

      {/* 🗨️ Comments section */}
      <FocusCommentOnHash textareaId="comment-input" />
      <section id="comments" className="mt-8 not-prose space-y-4">
        <h2 className="text-xl font-semibold">Comments</h2>
        <CommentsRealtime articleId={article.id} />
        <CommentForm articleId={article.id} />
        <CommentsList articleId={article.id} />
      </section>
    </main>
  );
}
