import sanitizeHtml from 'sanitize-html'

// Robust HTML sanitizer with domain-restricted iframe policy
export function sanitizeArticleHtml(input: string): string {
  if (!input) return ''

  return sanitizeHtml(input, {
    allowedTags: [
      // Text formatting
      'p', 'br', 'strong', 'em', 'u', 's', 'del', 'ins', 'span', 'div',
      // Lists
      'ul', 'ol', 'li',
      // Headings
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      // Code
      'code', 'pre', 'blockquote',
      // Links and media
      'a', 'img', 'video', 'source', 'iframe',
      // Tables
      'table', 'thead', 'tbody', 'tr', 'td', 'th'
    ],
    allowedAttributes: {
      '*': ['class', 'style', 'title', 'id'],
      'a': ['href', 'target', 'rel'],
      'img': ['src', 'alt', 'width', 'height', 'loading', 'decoding', 'srcset', 'sizes'],
      'video': ['src', 'width', 'height', 'controls', 'playsinline', 'poster', 'preload', 'muted', 'loop'],
      'source': ['src', 'type', 'media'],
      'iframe': ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'loading']
    },
    allowedIframeHostnames: [
      'www.youtube.com',
      'www.youtube-nocookie.com',
      'player.vimeo.com',
      'www.dailymotion.com',
      'codepen.io'
    ],
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
      video: ['http', 'https'],
      source: ['http', 'https']
    },
    transformTags: {
      'iframe': (tagName: string, attribs: Record<string, string>) => {
        // Ensure YouTube iframes use nocookie domain for privacy
        if (attribs.src?.includes('youtube.com/embed/')) {
          attribs.src = attribs.src.replace('youtube.com', 'youtube-nocookie.com')
        }
        return {
          tagName,
          attribs: {
            ...attribs,
            loading: 'lazy' // Add lazy loading for performance
          }
        }
      }
    },
    // Remove empty paragraphs and normalize whitespace
    exclusiveFilter: (frame: { tag: string; text?: string }) => {
      return frame.tag === 'p' && !frame.text?.trim()
    }
  })
}