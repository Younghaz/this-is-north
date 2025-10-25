'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { getBrowserSupabase } from '@/lib/supabase-browser';

type Props = {
  imageBucket?: string; // default 'images'
  videoBucket?: string; // default 'videos'
  photoInputId?: string; // hidden input id for photo_urls
  videoInputId?: string; // hidden input id for video_url
};

export default function MediaPicker({
  imageBucket,
  videoBucket,
  photoInputId = 'photo_urls',
  videoInputId = 'video_url',
}: Props) {
  const supabase = getBrowserSupabase();
  const imgBucket = imageBucket || process.env.NEXT_PUBLIC_SUPABASE_MEDIA_BUCKET || 'images';
  const vidBucket = videoBucket || 'videos';

  const [photos, setPhotos] = useState<string[]>([]);
  const [video, setVideo] = useState<string | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);

  const canAddImages = useMemo(() => !video, [video]);
  const canAddVideo = useMemo(() => photos.length === 0 && !video, [photos, video]);

  async function uploadFiles(files: FileList, bucket: string): Promise<string[]> {
    const result: string[] = [];
    for (const file of Array.from(files)) {
      const ts = Date.now();
      const path = `articles/${ts}-${file.name}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
        cacheControl: '3600',
      });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      if (data?.publicUrl) result.push(data.publicUrl);
    }
    return result;
  }

  async function onPickImages() {
    if (!canAddImages) return;
    imgRef.current?.click();
  }
  async function onPickVideo() {
    if (!canAddVideo) return;
    vidRef.current?.click();
  }

  async function onImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = '';
    if (!files?.length) return;
    if (!canAddImages) return;

    const urls = await uploadFiles(files, imgBucket);
    const next = [...photos, ...urls];
    setPhotos(next);

    const input = document.getElementById(photoInputId) as HTMLInputElement | null;
    if (input) input.value = JSON.stringify(next);
  }

  async function onVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!canAddVideo) return;
    if (!file.type.startsWith('video/')) {
      alert('Please select a video file');
      return;
    }
    // Create a FileList-like array for uploadFiles
    const filesArr = [file];
    const [url] = await uploadFiles({
      ...filesArr,
      length: 1,
      item: (i: number) => filesArr[i],
      [Symbol.iterator]: function* () { yield* filesArr; }
    } as unknown as FileList, vidBucket);
    setVideo(url || null);

    const input = document.getElementById(videoInputId) as HTMLInputElement | null;
    if (input) input.value = url || '';
  }

  function clearPhotos() {
    setPhotos([]);
    const input = document.getElementById(photoInputId) as HTMLInputElement | null;
    if (input) input.value = '[]';
  }
  function clearVideo() {
    setVideo(null);
    const input = document.getElementById(videoInputId) as HTMLInputElement | null;
    if (input) input.value = '';
  }

  return (
    <div className="space-y-2">
      <label className="block font-medium">Media</label>
      <div className="flex gap-2">
        <button type="button" onClick={onPickImages} disabled={!canAddImages} className="border rounded px-2 py-1">
          Add photos
        </button>
        <button type="button" onClick={onPickVideo} disabled={!canAddVideo} className="border rounded px-2 py-1">
          Add video
        </button>
        {(photos.length > 0) && (
          <button type="button" onClick={clearPhotos} className="border rounded px-2 py-1">
            Clear photos
          </button>
        )}
        {video && (
          <button type="button" onClick={clearVideo} className="border rounded px-2 py-1">
            Clear video
          </button>
        )}
      </div>

      {/* Hidden inputs carried with your form submit */}
      <input type="hidden" id={photoInputId} name="photo_urls" defaultValue="[]" />
      <input type="hidden" id={videoInputId} name="video_url" defaultValue="" />

      {/* Previews */}
      {video ? (
        <div className="not-prose my-2">
          <video
            controls
            playsInline
            preload="metadata"
            className="w-full max-h-[50vh] rounded-lg"
            src={video}
          />
        </div>
      ) : null}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((src, i) => (
            <Image key={i} src={src} alt="" width={320} height={160} className="w-full h-40 object-cover rounded-md" />
          ))}
        </div>
      ) : null}

      {/* Hidden file pickers */}
      <input ref={imgRef} type="file" accept="image/*" multiple hidden onChange={onImagesChange} />
      <input ref={vidRef} type="file" accept="video/*" hidden onChange={onVideoChange} />
      <p className="text-xs text-gray-600">Tip: choose either multiple photos or one video.</p>
    </div>
  );
}