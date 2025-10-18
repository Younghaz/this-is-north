import Link from "next/link";
import { notFound } from "next/navigation";
import AdSenseSlot from "@/components/AdSenseSlot";
import LikeButton from "@/components/LikeButton";
import CommentsList from "@/components/CommentsList";
import CommentForm from "@/components/CommentForm";
import CommentsRealtime from "@/components/CommentsRealtime";
import FocusCommentOnHash from "@/components/FocusCommentOnHash";
import { getSupabase } from "@/lib/supabase";
import { publicStorageUrl } from "@/lib/public-url";
import ShareButton from "@/components/ShareButton";
import HighlightOnHash from "@/components/HighlightOnHash";
import ViewTracker from "@/components/ViewTracker"; // ✅ NEW import

// 🧩 Sanitizer fallback
let sanitizeArticleHtml: (s: string) => string = (s) =>
  (s || "").replace(/<\/?(script|style)[^>]*>/gi, "");
try {
  const { sanitizeArticleHtml: realSanitize } = require("@/lib/sanitize");
  sanitizeArticleHtml = realSanitize;
} catch {}

// 🧩 Avatar placeholder
function avatarPlaceholder(name?: string | null) {
  const seed = encodeURIComponent(name?.trim() || "User");
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundType=gradientLinear`;
}

export const dynamic = "force-dynamic";

// 🧠 SEO Metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = getSupabase();

  const { data: article } = await supabase
    .from("articles")
    .select("title, slug, content, cover_image_path, cover_image_alt")
    .eq("slug", slug)
    .maybeSingle();

  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    "http://localhost:3000";
  const url = `${site}/article/${slug}`;

  if (!article) {
    return {
      title: "Article not found",
      description: "This article could not be found.",
      alternates: { canonical: url },
    };
  }

  const text = (article.content || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const description = text.length > 160 ? text.slice(0, 157) + "…" : text;

  const imageUrl = article.cover_image_path
    ? publicStorageUrl("images", article.cover_image_path)
    : null;

  return {
    title: article.title || "This is North",
    description,
    alternates: { canonical: url },
    openGraph: {
      title: article.title,
      description,
      type: "article",
      url,
      siteName: "This is North",
      images: imageUrl ? [{ url: imageUrl, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: article.title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

// 📰 Article Page
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = getSupabase();

  const { data: article, error } = await supabase
    .from("articles")
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
    .eq("slug", slug)
    .maybeSingle();

  if (error || !article) notFound();

  const videoSrc =
    article.video_url ||
    (article.video_path ? publicStorageUrl("videos", article.video_path) : "");

  const heroSrc = article.cover_image_path
    ? publicStorageUrl("images", article.cover_image_path)
    : "";

  const coverAlt = article.cover_image_alt || article.title || "Cover image";
  const contentHtml = sanitizeArticleHtml(article.content || "");

  const author = (article as any).profiles;
  const authorName = author?.display_name || "Guest Author";
  const avatarUrl =
    author?.avatar_url || avatarPlaceholder(author?.display_name);

  // JSON-LD Schema for SEO
  const publishedDate = article.published_at ? new Date(article.published_at).toISOString() : new Date().toISOString();
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "http://localhost:3000";
  const articleUrl = `${site}/article/${slug}`;
  const imageUrl = heroSrc || `${site}/default-article-image.jpg`;
  
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.content?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) || "",
    "image": imageUrl,
    "author": {
      "@type": "Person",
      "name": authorName,
      "image": avatarUrl
    },
    "publisher": {
      "@type": "Organization",
      "name": "This is North",
      "logo": {
        "@type": "ImageObject",
        "url": `${site}/logo.png`
      }
    },
    "datePublished": publishedDate,
    "dateModified": publishedDate,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": articleUrl
    },
    "url": articleUrl
  };

  return (
    <>
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <main
        className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-lg shadow-sm p-5 mt-6"
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
      {/* 👤 Author info */}
      <div className="flex items-center gap-3 mb-3">
        <img
          src={avatarUrl}
          alt={authorName}
          width={40}
          height={40}
          className="rounded-full border border-gray-300 object-cover"
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

      {/* 📰 Title */}
      <h1 className="text-2xl font-semibold leading-snug mb-3">
        {article.title}
      </h1>

      {/* 📄 Article Content */}
      <article
        className="prose prose-gray max-w-none text-[15px] leading-relaxed mb-4"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />

      {/* 🖼️ Media */}
      {videoSrc ? (
        <div className="not-prose my-4">
          <video
            controls
            playsInline
            preload="metadata"
            style={{ width: "100%", borderRadius: 8, maxHeight: "80vh" }}
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
              width: "100%",
              height: "auto",
              maxHeight: "80vh",
              objectFit: "contain",
              borderRadius: 8,
              display: "block",
            }}
          />
        </div>
      ) : null}

      {/* 💬 Actions */}
      <div className="not-prose flex items-center gap-4 border-t border-gray-200 pt-3 mt-4">
        <LikeButton articleId={article.id} />
        <ShareButton slug={article.slug} title={article.title} />
      </div>

      <AdSenseSlot slot="0000000000" />

      {/* 👁️ Track a deduped view (client-side) */}
      <ViewTracker articleId={article.id} />  {/* ✅ Added here */}

      {/* 🗨️ Comments */}
      <FocusCommentOnHash textareaId="comment-input" />
      <section id="comments" className="mt-8 not-prose space-y-4">
        <h2 className="text-xl font-semibold">Comments</h2>
        <CommentsRealtime articleId={article.id} />

        {/* ✨ Highlights deep-linked comment when opened via #comment-<id> */}
        <HighlightOnHash />

        <CommentForm articleId={article.id} />
        <CommentsList articleId={article.id} />
      </section>
    </main>
    </>
  );
}
