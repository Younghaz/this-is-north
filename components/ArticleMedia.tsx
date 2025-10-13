import { publicStorageUrl } from '../lib/public-url';

type Props = {
  cover_image_path?: string | null;
  cover_image_alt?: string | null;
  video_provider?: 'youtube' | 'file' | null;
  video_url?: string | null; // for youtube: any watch/shorts/embed; for file: public URL
};

function toYouTubeEmbed(src?: string | null): string | null {
  if (!src) return null;
  const raw = src.trim();

  // Bare ID
  if (/^[A-Za-z0-9_-]{10,}$/.test(raw)) return `https://www.youtube-nocookie.com/embed/${raw}`;

  try {
    // Normalize mobile/music hosts
    const normalized = raw
      .replace(/^https?:\/\/(m\.|music\.)?youtube\.com\//, 'https://www.youtube.com/')
      .replace(/^https?:\/\/(www\.)?youtu\.be\//, 'https://youtu.be/');

    const u = new URL(normalized);

    // youtu.be/<id>
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace(/^\//, '').split(/[/?#]/)[0];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }

    if (u.hostname.includes('youtube.com')) {
      // /shorts/<id>
      if (u.pathname.startsWith('/shorts/')) {
        const id = u.pathname.split('/')[2]?.split(/[/?#]/)[0];
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
      }
      // /live/<id>
      if (u.pathname.startsWith('/live/')) {
        const id = u.pathname.split('/')[2]?.split(/[/?#]/)[0];
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
      }
      // /embed/<id>
      if (u.pathname.includes('/embed/')) {
        // move to nocookie domain for consistency
        const id = u.pathname.split('/').pop() || '';
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
      }
      // watch?v=<id>
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

export default function ArticleMedia(a: Props) {
  // YouTube (preferred)
  if (a.video_provider === 'youtube' && a.video_url) {
    const src = toYouTubeEmbed(a.video_url);
    if (src) {
      return (
        <div style={{ margin: '12px 0' }}>
          <div style={{ position: 'relative', paddingTop: '56.25%', minHeight: 180 }}>
            <iframe
              src={src}
              title="YouTube video"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              loading="lazy"
            />
          </div>
          {/* Fallback link (useful if a CSP blocks iframe) */}
          <div style={{ marginTop: 8, fontSize: 14 }}>
            If the video doesn’t load, open it on YouTube:{" "}
            <a href={src} target="_blank" rel="noopener noreferrer">Watch video</a>
          </div>
        </div>
      );
    }
  }

  // Uploaded video file
  if (a.video_provider === 'file' && a.video_url) {
    return (
      <video
        src={a.video_url.trim()}
        controls
        style={{ width: '100%', maxHeight: 480, background: '#000', margin: '12px 0', borderRadius: 6 }}
      />
    );
  }

  // Cover image
  const img = publicStorageUrl('images', a.cover_image_path);
  if (img) {
    return (
      <a href={img} target="_blank" rel="noopener noreferrer" style={{ display: 'block', margin: '12px 0' }}>
        <img
          src={img}
          alt={a.cover_image_alt ?? ''}
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: 'clamp(240px, 60vh, 560px)',
            objectFit: 'contain',
            background: '#f6f6f6',
            borderRadius: 6,
            border: '1px solid #eaeaea',
          }}
        />
      </a>
    );
  }

  return null;
}