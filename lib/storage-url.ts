// Rewrites Supabase signed URLs in HTML to public URLs.
// Example:
//  https://<proj>.supabase.co/storage/v1/object/sign/bucket/path/file.mp4?token=...
// -> https://<proj>.supabase.co/storage/v1/object/public/bucket/path/file.mp4
export function rewriteSignedUrlsToPublic(html: string): string {
  if (!html) return html;
  return html.replace(
    /(https?:\/\/[^"'\s]+\/storage\/v1\/object)\/sign\/([^"'\s?]+)(\?[^"'\s"]*)?/g,
    (_m, base, key) => `${base}/public/${key}`
  );
}

// Build a stable public Supabase Storage URL from:
// - a full signed URL -> converts /sign/ to /public/
// - a full public URL -> returns as-is
// - a relative "key" like "covers/123.jpg" or "images/covers/123.jpg"
// - a "storage path" starting with "/storage/v1/object/public/..."
// Reads your project URL from NEXT_PUBLIC_SUPABASE_URL
export function publicStorageUrl(input?: string | null, opts?: { bucket?: string; projectUrl?: string }): string {
  if (!input) return '';
  let url = String(input).trim().replace(/^['"]|['"]$/g, ''); // strip quotes

  const projectUrl = (opts?.projectUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const defaultBucket = (opts?.bucket || process.env.NEXT_PUBLIC_SUPABASE_MEDIA_BUCKET || 'images').replace(/^\/|\/$/g, '');

  // Nothing we can do without the project URL for relative paths
  const ensureProject = (p: string) => (projectUrl ? `${projectUrl}${p.startsWith('/') ? '' : '/'}${p}` : '');

  // Case 1: absolute URL to Supabase Storage
  if (/^https?:\/\//i.test(url)) {
    // If it's a signed URL, rewrite to public
    url = url.replace(/\/storage\/v1\/object\/sign\//, '/storage/v1/object/public/');
    return url;
  }

  // Case 2: already a storage path beginning with /storage/v1/object/public or sign
  if (/^\/?storage\/v1\/object\//i.test(url)) {
    // normalize to /storage...
    url = url.replace(/^\//, '');
    url = url.replace(/\/storage\/v1\/object\/sign\//, '/storage/v1/object/public/');
    return ensureProject(url);
  }

  // Case 3: relative keys. Handle common prefixes.
  // If the key already includes a bucket prefix (images/..., videos/...)
  if (/^(images|videos)\//i.test(url)) {
    return ensureProject(`/storage/v1/object/public/${url}`);
  }

  // Bare paths like "covers/123.jpg" or "articles/clip.mp4" -> prefix the default bucket
  if (/^(covers|articles|uploads|thumbnails|thumbs|media)\//i.test(url)) {
    return ensureProject(`/storage/v1/object/public/${defaultBucket}/${url}`);
  }

  // If it's something else (like "1732564378955.jpg"), still place it under the default bucket root
  if (/^[A-Za-z0-9_\-]+\.(jpg|jpeg|png|webp|gif|mp4|mov|webm)$/i.test(url)) {
    return ensureProject(`/storage/v1/object/public/${defaultBucket}/${url}`);
  }

  // If it's a site-relative file (e.g., /images/foo.jpg) we leave it alone.
  if (url.startsWith('/')) return url;

  // As a last resort, try treating it as a key under the default bucket
  return ensureProject(`/storage/v1/object/public/${defaultBucket}/${url}`);
}