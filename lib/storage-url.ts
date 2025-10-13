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