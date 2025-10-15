'use client';

import { useState } from 'react';
import Link from 'next/link';
import { makeExcerptFromHtml } from '../lib/excerpt';
import { publicStorageUrl } from '../lib/public-url';
import LikeButton from './LikeButton';
import ShareButton from './ShareButton';

// 🔹 Helper for placeholder avatars (DiceBear)
function avatarPlaceholder(name?: string | null) {
  const seed = encodeURIComponent(name && name.trim() ? name : 'Guest');
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundType=gradientLinear`;
}

type Article = {
  id: number;
  title: string;
  slug: string;
  content: string | null;
  published_at: string | null;
  cover_image_path?: string | null;
  cover_image_alt?: string | null;
  video_provider?: string | null;
  video_path?: string | null;
  video_url?: string | null;
  likes_count?: number | null;
  comments_count?: number | null;
  categories?: { slug: string | null; name_en: string | null } | null;
  profiles?: { display_name?: string | null; avatar_url?: string | null } | null;
};

export default function ArticleCard({ article }: { article: Article }) {
  const excerpt = makeExcerptFromHtml(article.content, 320);
  const imgSrc = article.cover_image_path ? publicStorageUrl('images', article.cover_image_path) : '';
  const vidSrc =
    article.video_url
      ? article.video_url
      : article.video_path
      ? publicStorageUrl('videos', article.video_path)
      : '';

  const [likes, setLikes] = useState<number>(article.likes_count ?? 0);
  const comments = article.comments_count ?? 0;

  const author = article.profiles;
  const authorName = author?.display_name?.trim() || 'Guest Author';
  const avatarUrl = author?.avatar_url?.trim() || avatarPlaceholder(authorName);

  return (
    <li
      style={{
        border: '1px solid #ccc',
        padding: 12,
        display: 'grid',
        gap: 8,
        borderRadius: 6,
      }}
    >
      {/* 👤 Author info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img
          src={avatarUrl}
          alt={authorName}
          width={32}
          height={32}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = avatarPlaceholder(authorName);
          }}
          style={{
            borderRadius: '50%',
            objectFit: 'cover',
            width: 32,
            height: 32,
            border: '1px solid #ddd',
            background: '#f9f9f9',
          }}
        />
        <div style={{ fontSize: 13, color: '#444' }}>
          <div style={{ fontWeight: 600 }}>{authorName}</div>
          {article.published_at ? (
            <div style={{ fontSize: 11, color: '#777' }}>
              {new Date(article.published_at).toLocaleDateString()}
            </div>
          ) : null}
        </div>
      </div>

      {/* 📸 Media: image or video */}
      {imgSrc ? (
        <Link href={`/article/${article.slug}`} style={{ display: 'block' }}>
          <img
            src={imgSrc}
            alt={article.cover_image_alt ?? ''}
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '70vh',
              objectFit: 'contain',
              background: '#f3f3f3',
              borderRadius: 4,
              display: 'block',
            }}
          />
        </Link>
      ) : vidSrc ? (
        <Link href={`/article/${article.slug}`} style={{ display: 'block' }}>
          <video
            src={vidSrc}
            controls
            playsInline
            preload="metadata"
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '70vh',
              objectFit: 'contain',
              background: '#000',
              borderRadius: 4,
              display: 'block',
            }}
          />
        </Link>
      ) : null}

      {/* 🏷️ Category */}
      <div style={{ fontSize: 12, color: '#555' }}>
        {article.categories?.name_en || article.categories?.slug || 'Uncategorized'}
      </div>

      {/* 📰 Title */}
      <Link
        href={`/article/${article.slug}`}
        style={{ fontSize: 22, fontWeight: 700, textDecoration: 'none' }}
      >
        {article.title}
      </Link>

      {/* 🧩 Excerpt */}
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

      {/* 💬 Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginTop: 6,
        }}
      >
        <LikeButton articleId={article.id} onLiked={() => setLikes((n) => n + 1)} />
        <span style={{ fontSize: 12, color: '#444' }}>
          {likes} {likes === 1 ? 'like' : 'likes'}
        </span>

        <Link href={`/article/${article.slug}#comments`} className="underline">
          Comment ({comments})
        </Link>

        <ShareButton slug={article.slug} title={article.title} excerpt={excerpt} />

        <Link href={`/article/${article.slug}`} style={{ marginLeft: 'auto' }}>
          Read more
        </Link>
      </div>
    </li>
  );
}
