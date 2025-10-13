// Minimal, dependency-free sanitizer to unblock dev.
// Note: This is not as robust as sanitize-html, but it will allow video/iframe quickly.
const ALLOWED_TAGS = new Set([
  'p','br','strong','em','u','s','ul','ol','li','blockquote','code','pre','span','div','a','img',
  'video','source','iframe','h1','h2','h3','h4','h5','h6'
]);

const ALLOWED_ATTR = new Set([
  'href','target','rel','src','alt','title','width','height','style','loading','decoding',
  'srcset','sizes','controls','playsinline','poster','preload','muted','loop','autoplay',
  'allow','allowfullscreen'
]);

export function sanitizeArticleHtml(input: string): string {
  if (!input) return '';
  // Strip script/style tags entirely
  let html = input.replace(/<\/?(script|style)[^>]*>/gi, '');
  // Strip on* event handlers
  html = html.replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '');
  // Remove tags not in the allowlist
  html = html.replace(/<\/?([a-z0-9-]+)(\s[^>]*)?>/gi, (m, tag, attrs = '') => {
    const t = String(tag).toLowerCase();
    if (!ALLOWED_TAGS.has(t)) return '';
    if (!attrs) return `<${t}>`;
    // Keep only allowed attributes
    const safeAttrs = Array.from(attrs.matchAll(/\s([a-z0-9-:]+)(\s*=\s*("[^"]*"|'[^']*'|[^'"\s>]+))?/gi))
      .map(([full, name, , val]) => {
        const n = String(name).toLowerCase();
        if (!ALLOWED_ATTR.has(n)) return '';
        return val ? ` ${n}=${val}` : ` ${n}`;
      })
      .join('');
    // Close tags preserved as-is
    if (m.startsWith('</')) return `</${t}>`;
    // Self-closing if present
    return `<${t}${safeAttrs}>`;
  });
  return html;
}