'use client';

type Props = {
  photoUrls?: string[];
  videoUrl?: string | null;
};

export default function PostMedia({ photoUrls = [], videoUrl }: Props) {
  if (videoUrl) {
    return (
      <div className="not-prose my-4">
        <video
          controls
          playsinline
          preload="metadata"
          style={{ width: '100%', maxHeight: '70vh', borderRadius: 8, display: 'block' }}
          src={videoUrl}
        />
      </div>
    );
  }

  const photos = (photoUrls || []).filter(Boolean);
  if (!photos.length) return null;

  // Simple grid layouts for 1–4 images
  if (photos.length === 1) {
    return (
      <div className="not-prose my-4">
        <img
          src={photos[0]}
          alt=""
          style={{ width: '100%', height: 'auto', borderRadius: 8, display: 'block' }}
        />
      </div>
    );
  }

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gap: 8,
    gridTemplateColumns: photos.length === 2 ? '1fr 1fr' : '1fr 1fr',
    gridTemplateRows: photos.length === 3 ? 'auto auto' : 'auto auto',
  };

  const max = Math.min(photos.length, 4);
  const rest = photos.length - max;

  return (
    <div className="not-prose my-4" style={gridStyle}>
      {photos.slice(0, max).map((src, i) => (
        <div key={i} style={{ position: 'relative', overflow: 'hidden', borderRadius: 8 }}>
          <img
            src={src}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {i === 3 && rest > 0 ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              +{rest}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}