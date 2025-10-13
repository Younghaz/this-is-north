'use client';

import { useRef, useState } from 'react';
import { getBrowserSupabase } from '@/lib/supabase-browser';
import { parseYouTubeInput, youtubeEmbedBlock } from '@/lib/youtube';

function insertAtCursor(el: HTMLTextAreaElement, snippet: string) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const before = el.value.slice(0, start);
  const after = el.value.slice(end);
  el.value = `${before}${snippet}${after}`;
  const pos = start + snippet.length;
  el.selectionStart = el.selectionEnd = pos;
  el.focus();
}

export default function ContentToolbar({ textareaId, bucket = 'media' }: { textareaId: string; bucket?: string }) {
  const supabase = getBrowserSupabase();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onInsertYouTube() {
    setMsg(null);
    const input = prompt('Paste YouTube URL or iframe:');
    if (!input) return;
    const parsed = parseYouTubeInput(input);
    if (!parsed) {
      alert('Invalid YouTube URL or iframe. Paste a watch/youtu.be/shorts link or an <iframe>.');
      return;
    }
    const block = youtubeEmbedBlock(parsed.id);
    const ta = document.getElementById(textareaId) as HTMLTextAreaElement | null;
    if (ta) insertAtCursor(ta, `\n${block}\n`);
  }

  async function onPickVideo() {
    setMsg(null);
    fileRef.current?.click();
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMsg(null);
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    // Enforce a video content type
    const contentType = file.type || 'video/mp4';
    if (!contentType.startsWith('video/')) {
      alert('Please choose a video file.');
      return;
    }

    try {
      // Upload to Supabase Storage
      const ts = Date.now();
      const path = `articles/${ts}-${file.name}`;
      const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
        contentType,
        upsert: false,
        cacheControl: '3600',
      });
      if (error) throw error;

      // Prefer public URL (make bucket public in Dashboard)
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = pub?.publicUrl;

      if (!publicUrl) {
        // Fallback: signed URL for private buckets (1h)
        const signed = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
        if (signed.error || !signed.data?.signedUrl) {
          throw signed.error || new Error('Could not get a URL for the uploaded file.');
        }
        // Signed URL will expire; recommend making bucket public for blog assets.
        const url = signed.data.signedUrl;
        insertVideo(url);
      } else {
        insertVideo(publicUrl);
      }
    } catch (err: any) {
      console.error(err);
      setMsg(err?.message ?? 'Upload failed.');
    }
  }

  function insertVideo(src: string) {
    const videoHtml = `
<video controls playsinline style="width:100%;max-height:60vh;border-radius:8px;" src="${src}"></video>
`.trim();

    const ta = document.getElementById(textareaId) as HTMLTextAreaElement | null;
    if (ta) insertAtCursor(ta, `\n${videoHtml}\n`);
    setMsg('Video inserted.');
  }

  return (
    <div className="not-prose mb-2 flex items-center gap-2">
      <button type="button" onClick={onInsertYouTube} className="border rounded px-2 py-1">
        Insert YouTube
      </button>
      <button type="button" onClick={onPickVideo} className="border rounded px-2 py-1">
        Upload video
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        onChange={onFileChange}
        hidden
      />
      {msg ? <span className="text-xs text-gray-600 ml-2">{msg}</span> : null}
    </div>
  );
}