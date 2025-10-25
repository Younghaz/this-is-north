"use client";
import Image from 'next/image';

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
          playsInline
          preload="metadata"
          className="w-full max-h-[70vh] rounded-lg block"
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
        <Image
          src={photos[0]}
          alt=""
          width={1200}
          height={700}
          className="w-full h-auto rounded-lg block"
          priority={false}
          unoptimized
        />
      </div>
    );
  }

  const gridCols = photos.length === 2 ? 'grid-cols-2' : 'grid-cols-2';
  const gridRows = photos.length === 3 ? 'grid-rows-2' : 'grid-rows-2';

  const max = Math.min(photos.length, 4);
  const rest = photos.length - max;

  return (
    <div className={`not-prose my-4 grid gap-2 ${gridCols} ${gridRows}`}>
      {photos.slice(0, max).map((src, i) => (
        <div key={i} className="relative overflow-hidden rounded-lg">
          <Image
            src={src}
            alt=""
            width={1200}
            height={700}
            className="w-full h-full object-cover block"
            priority={false}
            unoptimized
          />
          {i === 3 && rest > 0 ? (
            <div className="absolute inset-0 bg-black bg-opacity-50 text-white flex items-center justify-center text-2xl font-bold">
              +{rest}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}