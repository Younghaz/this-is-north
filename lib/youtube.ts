// Accepts iframe HTML or any YouTube URL, returns { id, embedUrl } or null.
export function parseYouTubeInput(input: string): { id: string; embedUrl: string } | null {
  if (!input) return null;
  const s = input.trim();

  // 1) If it's an iframe, extract src
  const iframeSrcMatch = s.match(/<iframe[^>]*\s+src=["']([^"']+)["'][^>]*>\s*<\/iframe>/i);
  const src = iframeSrcMatch ? iframeSrcMatch[1] : s;

  // Normalize shorts/watch/embed to an ID
  // Matches: watch?v=ID, youtu.be/ID, shorts/ID, embed/ID
  const patterns = [
    /youtube\.com\/watch\?[^#]*v=([a-zA-Z0-9_-]{11})/i,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
  ];
  for (const re of patterns) {
    const m = src.match(re);
    if (m?.[1]) {
      const id = m[1];
      return { id, embedUrl: `https://www.youtube.com/embed/${id}` };
    }
  }
  return null;
}

// Returns a responsive iframe block for a video id
export function youtubeEmbedBlock(id: string, heightPx = 360): string {
  const src = `https://www.youtube.com/embed/${id}`;
  return `
<div style="position:relative;width:100%;padding-top:56.25%;overflow:hidden;border-radius:8px;">
  <iframe
    src="${src}"
    title="YouTube video"
    loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
    style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"
  ></iframe>
</div>`.trim();
}