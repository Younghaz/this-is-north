import { notFound } from "next/navigation";
import AdSenseSlot from "@/components/AdSenseSlot";
import LikeButton from "@/components/LikeButton";
import BookmarkButton from "@/components/BookmarkButton";
import CommentsRealtime from "@/components/CommentsRealtime";
import CommentForm from "@/components/CommentForm";
import FocusCommentOnHash from "@/components/FocusCommentOnHash";
import { getSupabase } from "@/lib/supabase";
import { publicStorageUrl } from "@/lib/public-url";
import ShareButton from "@/components/ShareButton";
import HighlightOnHash from "@/components/HighlightOnHash";
import ViewTracker from "@/components/ViewTracker";
import CommentsListClient from '@/components/CommentsListClient';
import Image from "next/image";

// 🧩 Sanitizer fallback
import { sanitizeArticleHtml as realSanitize } from "@/lib/sanitize";
const sanitizeArticleHtml: (s: string) => string = realSanitize;

// 🧩 Avatar placeholder
function avatarPlaceholder(name?: string | null) {
  const seed = encodeURIComponent(name?.trim() || "User");
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundType=gradientLinear`;
}

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

  const authorProfile = Array.isArray(article.profiles) ? article.profiles[0] : article.profiles;
  const authorName = authorProfile?.display_name || "Guest Author";
  const avatarUrl = authorProfile?.avatar_url || avatarPlaceholder(authorProfile?.display_name);

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

  // Fetch comments
  const { data: commentsData } = await supabase
    .from('comments')
    .select('id, article_id, body, created_at, user_id, status, parent_comment_id')
    .eq('article_id', article.id)
    .eq('status', 'visible')
    .order('created_at', { ascending: true });

  const allComments = (commentsData as CommentRow[]) ?? [];
  const tree = buildTree(allComments).filter((node) => !node.parent_comment_id);
  const userIds = Array.from(new Set(allComments.map((c) => c.user_id)));
  const profileById = new Map<string, Profile>();

  // Fetch all profiles for comment authors
  let profilesData: Profile[] = [];
  if (userIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, email, avatar_url')
      .in('id', userIds);
    profilesData = (data as Profile[]) ?? [];
    for (const p of profilesData) profileById.set(p.id, p);
  }

  // Ensure every userId in comments has a profile entry (fallback if missing)
  for (const userId of userIds) {
    if (!profileById.has(userId)) {
      // Find a comment by this user to get email if available
      const comment = allComments.find(c => c.user_id === userId);
      profileById.set(userId, {
        id: userId,
        username: null,
        display_name: null,
        email: null,
        avatar_url: null,
      });
    }
  }

  return (
    <>
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-lg shadow-sm p-5 mt-6 font-sans">
        {/* 👤 Author info */}
        <div className="flex items-center gap-3 mb-3">
          <Image
            src={avatarUrl}
            alt={authorName}
            width={40}
            height={40}
            className="rounded-full border border-gray-300 object-cover"
            priority
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
        {/* 📰 Title */}
        <h1 className="text-2xl font-semibold leading-snug mb-3">
          {article.title}
        </h1>
        {/* 📄 Article Content */}
        <article
          className="prose prose-gray max-w-none text-[15px] leading-relaxed mb-4 prose"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
        {/* 🖼️ Media */}
        {videoSrc ? (
          <div className="article-cover-video-container">
            <video
              src={videoSrc}
              controls
              playsInline
              preload="metadata"
              className="article-cover-video"
            />
          </div>
        ) : heroSrc ? (
          <div className="article-cover-image-container">
            <img
              src={heroSrc}
              alt={coverAlt}
              className="article-cover-image"
            />
          </div>
        ) : null}
        {/* 💬 Actions */}
        <div className="not-prose flex items-center gap-4 border-t border-gray-200 pt-3 mt-4">
          <LikeButton articleId={article.id} />
          <BookmarkButton articleId={article.id} />
          <ShareButton slug={article.slug} title={article.title} />
        </div>
        <AdSenseSlot slot="0000000000" />
        {/* 👁️ Track a deduped view (client-side) */}
        <ViewTracker articleId={article.id} />
        {/* 🗨️ Comments */}
        <FocusCommentOnHash textareaId="comment-input" />
        <section id="comments" className="mt-8 not-prose space-y-4">
          <h2 className="text-xl font-semibold">Comments</h2>
          <CommentsRealtime articleId={article.id} />
          {/* ✨ Highlights deep-linked comment when opened via #comment-<id> */}
          <HighlightOnHash />
          <CommentForm articleId={article.id} />
          {/* Use the new polished CommentsListClient for SSR comments */}
          <CommentsListClient
            tree={tree}
            profileById={profileById}
            articleId={article.id}
          />
        </section>
      </main>
    </>
  );
}

// Helper types and functions for comments tree

type CommentRow = {
  id: number;
  article_id: number;
  body: string;
  created_at: string;
  user_id: string;
  status?: string | null;
  parent_comment_id?: number | null;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  email?: string | null;
  avatar_url?: string | null;
};

type TreeNode = CommentRow & { children: TreeNode[] };

function buildTree(rows: CommentRow[]): TreeNode[] {
  const byId = new Map<number, TreeNode>();
  const roots: TreeNode[] = [];
  for (const r of rows) byId.set(r.id, { ...r, children: [] });
  for (const r of rows) {
    const node = byId.get(r.id)!;
    if (r.parent_comment_id && byId.has(r.parent_comment_id)) {
      const parent = byId.get(r.parent_comment_id)!;
      if (r.parent_comment_id !== r.id) parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
