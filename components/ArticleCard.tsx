'use client';

import { useState } from 'react';
import Link from 'next/link';
import { makeExcerptFromHtml } from '../lib/excerpt';
import { publicStorageUrl } from '../lib/public-url';
import LikeButton from './LikeButton';
import ShareButton from './ShareButton';
import BookmarkButton from './BookmarkButton';

// 🧩 Avatar placeholder
function avatarPlaceholder(name?: string | null) {
  const seed = encodeURIComponent(name?.trim() || 'Guest');
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
  const excerpt = makeExcerptFromHtml(article.content, 280);
  const imgSrc = article.cover_image_path ? publicStorageUrl('images', article.cover_image_path) : '';
  const vidSrc =
    article.video_url
      ? article.video_url
      : article.video_path
      ? publicStorageUrl('videos', article.video_path)
      : '';

  const [likes, setLikes] = useState(article.likes_count ?? 0);
  const comments = article.comments_count ?? 0;

  const author = article.profiles;
  const authorName = author?.display_name?.trim() || 'Guest Author';
  const avatarUrl = author?.avatar_url?.trim() || avatarPlaceholder(authorName);

  return (
    <li
      className="article-card"
      style={{
        borderRadius: 10,
        padding: 14,
        display: 'grid',
        gap: 10,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* 👤 Author */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img
          src={avatarUrl}
          alt={authorName}
          width={40}
          height={40}
          loading="lazy"
          style={{
            borderRadius: '50%',
            objectFit: 'cover',
            border: '1px solid #ccc',
          }}
        />
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{authorName}</div>
          {article.published_at && (
            <div style={{ fontSize: 12, color: '#777' }}>
              {new Date(article.published_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* 📰 Title & Excerpt */}
      <div style={{ marginTop: 6 }}>
        <Link
          href={`/article/${article.slug}`}
          className="article-card-title"
          style={{
            fontSize: 18,
            fontWeight: 600,
            textDecoration: 'none',
            lineHeight: 1.3,
          }}
        >
          {article.title}
        </Link>

        {excerpt && (
          <p className="article-card-excerpt" style={{ marginTop: 4, fontSize: 15, lineHeight: 1.4 }}>
            {excerpt}
          </p>
        )}
      </div>

      {/* 📸 Media */}
      {vidSrc ? (
  <Link href={`/article/${article.slug}`} className="article-card-media-link" style={{ display: 'block' }}>
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
              borderRadius: 8,
              background: '#000',
            }}
          />
        </Link>
      ) : imgSrc ? (
        <Link href={`/article/${article.slug}`} style={{ display: 'block' }}>
          <img
            src={imgSrc}
            alt={article.cover_image_alt ?? ''}
            className="article-card-media-img"
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '70vh',
              objectFit: 'contain',
              borderRadius: 8,
            }}
          />
        </Link>
      ) : null}

      {/* 💬 Actions */}
      <div
        className="article-card-actions"
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
          paddingTop: 8,
          marginTop: 4,
        }}
      >
        <LikeButton articleId={article.id} onLiked={() => setLikes((n) => n + 1)} />
  <span className="article-card-likes" style={{ fontSize: 13 }}>
          {likes} {likes === 1 ? 'like' : 'likes'}
        </span>

        <Link href={`/article/${article.slug}#comments`} className="underline">
          Comment ({comments})
        </Link>

        <BookmarkButton articleId={article.id} />

        <ShareButton slug={article.slug} title={article.title} excerpt={excerpt} />

  <Link href={`/article/${article.slug}`} style={{ marginLeft: 'auto' }}>
          Read more
        </Link>
      </div>
    </li>
  );
}
