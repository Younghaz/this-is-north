'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
      className="article-card rounded-xl p-4 grid gap-2 font-sans"
    >
      {/* 👤 Author */}
  <div className="flex items-center gap-2">
        <Image
          src={avatarUrl}
          alt={authorName}
          width={40}
          height={40}
          className="rounded-full object-cover border border-gray-300"
          priority={false}
          unoptimized
        />
        <div>
          <div className="font-semibold text-sm">{authorName}</div>
          {article.published_at && (
            <div className="text-xs text-gray-500">
              {new Date(article.published_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* 📰 Title & Excerpt */}
  <div className="mt-2">
        <Link
          href={`/article/${article.slug}`}
          className="article-card-title text-lg font-semibold no-underline leading-snug"
        >
          {article.title}
        </Link>

        {excerpt && (
          <p className="article-card-excerpt mt-1 text-base leading-relaxed">
            {excerpt}
          </p>
        )}
      </div>

      {/* 📸 Media */}
      {vidSrc ? (
        <Link href={`/article/${article.slug}`} className="article-card-media-link block">
          <video
            src={vidSrc}
            controls
            playsInline
            preload="metadata"
            className="w-full h-auto max-h-[70vh] object-contain rounded-lg bg-black"
          />
        </Link>
      ) : imgSrc ? (
        <Link href={`/article/${article.slug}`} className="block">
          <Image
            src={imgSrc}
            alt={article.cover_image_alt ?? ''}
            width={1200}
            height={700}
            className="article-card-media-img w-full h-auto max-h-[70vh] object-contain rounded-lg"
            priority={false}
            unoptimized
          />
        </Link>
      ) : null}

      {/* 💬 Actions */}
      <div
        className="article-card-actions flex items-center flex-wrap gap-2 pt-2 mt-1"
      >
        <LikeButton articleId={article.id} onLiked={() => setLikes((n) => n + 1)} />
        <span className="article-card-likes text-sm">
          {likes} {likes === 1 ? 'like' : 'likes'}
        </span>

        <Link href={`/article/${article.slug}#comments`} className="underline">
          Comment ({comments})
        </Link>

        <BookmarkButton articleId={article.id} />

        <ShareButton slug={article.slug} title={article.title} excerpt={excerpt} />

        <Link href={`/article/${article.slug}`} className="ml-auto">
          Read more
        </Link>
      </div>
    </li>
  );
}
