// Normalizes article HTML before rendering:
// - Converts Supabase signed URLs to public URLs
// - Converts relative storage keys in img/video/source src attributes to absolute public URLs
// - Converts YouTube watch/youtu.be/shorts links or iframes using watch?v= to proper embed iframes
import { publicStorageUrl } from './storage-url';

export function normalizeArticleHtml(html: string): string {
  if (!html) return html;
  let out = html;

  // 1) Rewrite Supabase signed URLs -> public URLs
  out = out.replace(
    /(https?:\/\/[^"'\s]+\/storage\/v1\/object)\/sign\/([^"'\s?]+)(\?[^"'\s"]*)?/g,
    (_m, base, key) => `${base}/public/${key}`
  );

  // 2) Convert relative storage keys in src="" to absolute public URLs.
  // Only touch img, video, and source tags.
  out = out.replace(
    /<(img|video|source)\b([^>]*?\s)src=["']([^"']+)["']([^>]*)>/gi,
    (_m, tag, pre, src, post) => {
      const abs = publicStorageUrl(src);
      return `<${tag}${pre}src="${abs}"${post}>`;
    }
  );

  // 3) Normalize YouTube iframes using watch?v= to embed
  out = out.replace(
    /<iframe([^>]*?)src=["']https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})[^"']*["']([^>]*)><\/iframe>/g,
    (_m, pre, id, post) => youtubeEmbedIframe(id, `${pre} ${post}`)
  );
  // Replace raw watch links with embed
  out = out.replace(
    /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/g,
    (_m, id) => youtubeEmbedIframe(id)
  );
  // youtu.be/ID
  out = out.replace(
    /https?:\/\/(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/g,
    (_m, id) => youtubeEmbedIframe(id)
  );
  // shorts/ID
  out = out.replace(
    /https?:\/\/(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/g,
    (_m, id) => youtubeEmbedIframe(id)
  );

  return out;
}

function youtubeEmbedIframe(id: string, extraAttrs = ''): string {
  const src = `https://www.youtube.com/embed/${id}`;
  const attrs =
    'title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen';
  return `
  <div style="position:relative;width:100%;padding-top:56.25%;overflow:hidden;border-radius:8px;">
    <iframe
      src="${src}"
      ${attrs}
      ${extraAttrs}
      style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"
    ></iframe>
  </div>`.trim();
}