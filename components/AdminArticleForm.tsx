'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '../lib/supabase-browser';
import type { SupabaseClient } from '@supabase/supabase-js';
import Image from 'next/image';

type Category = { id: number; slug: string; name_en: string | null };

type ArticleRow = {
  id?: number;
  title: string;
  slug: string;
  content: string | null;
  status: 'draft' | 'published';
  category_id: number | null;
  published_at: string | null;
  author_id?: string | null;
  // media
  cover_image_path: string | null;
  cover_image_alt: string | null;
  video_provider: 'file' | null;
  video_url: string | null;  // public file url
  video_path: string | null; // storage path for uploaded file
};

type Props = {
  articleId?: number;
  afterSaveHref?: string;
};

// ----- helpers -----
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

async function uploadToBucket(supabase: SupabaseClient, bucket: 'images' | 'videos', file: File, prefix = '') {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const cleanPrefix = prefix.replace(/^\/+|\/+$/g, '');
  const path = cleanPrefix ? `${cleanPrefix}/${fileName}` : fileName;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    cacheControl: '3600',
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl as string };
}

// ----- media input subcomponent -----
type MediaState = {
  coverImageFile: File | null;
  coverImagePreview: string | null;
  coverImageAlt: string;
  videoFile: File | null;
  videoPreview: string | null;
};

function MediaInputs(props: { value: MediaState; onChange: (v: MediaState) => void }) {
  const { value, onChange } = props;

  function onPickImage(f: File | null) {
    onChange({
      ...value,
      coverImageFile: f,
      coverImagePreview: f ? URL.createObjectURL(f) : null,
    });
  }
  function onPickVideo(f: File | null) {
    onChange({
      ...value,
      videoFile: f,
      videoPreview: f ? URL.createObjectURL(f) : null,
    });
  }

  return (
    <div className="border-t border-gray-300 pt-3 mt-3">
      <h3 className="font-semibold mb-2 text-base">Media</h3>

      {/* Cover image */}
      <div className="mb-3">
        <label className="block text-sm mb-1">Cover image (optional)</label>
        <input type="file" accept="image/*" title="Select cover image" onChange={(e) => onPickImage(e.target.files?.[0] ?? null)} className="block" />
        {value.coverImagePreview && (
          <div className="mt-2">
            <Image
              src={value.coverImagePreview}
              alt="cover preview"
              width={400}
              height={200}
              className="max-w-full max-h-[200px] object-cover"
            />
          </div>
        )}
        <input
          placeholder="Alt text"
          value={value.coverImageAlt}
          onChange={(e) => onChange({ ...value, coverImageAlt: e.target.value })}
          className="block mt-2 w-full p-2 border rounded"
        />
      </div>

      {/* Video */}
      <div className="mb-3">
        <label className="block text-sm mb-1">Video (optional)</label>
        <div className="flex gap-2 items-center flex-wrap">
          <input type="file" accept="video/*" title="Select video file" onChange={(e) => onPickVideo(e.target.files?.[0] ?? null)} className="block" />
        </div>
        {value.videoPreview && (
          <video
            src={value.videoPreview}
            controls
            className="mt-2 max-w-full max-h-[240px]"
          />
        )}
      </div>
    </div>
  );
}

// ----- main form -----
export default function AdminArticleForm({ articleId, afterSaveHref = '/admin' }: Props) {
  const supabase = getBrowserSupabase();
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(!!articleId);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState<string>('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const [media, setMedia] = useState<MediaState>({
    coverImageFile: null,
    coverImagePreview: null,
    coverImageAlt: '',
    videoFile: null,
    videoPreview: null,
  });

  const [existingMedia, setExistingMedia] = useState<{
    cover_image_path: string | null;
    cover_image_alt: string | null;
    video_provider: string | null;
    video_url: string | null;
    video_path: string | null;
  }>({
    cover_image_path: null,
    cover_image_alt: null,
    video_provider: null,
    video_url: null,
    video_path: null,
  });

  // STEP B — current user
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, [supabase]);

  // Load categories
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, slug, name_en')
        .order('position', { ascending: true })
        .order('name_en', { ascending: true });
      setCategories((data as Category[]) ?? []);
    })();
  }, [supabase]);

  // Load article if editing
  useEffect(() => {
    if (!articleId) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('articles')
          .select(
            'id, title, slug, content, status, category_id, published_at, cover_image_path, cover_image_alt, video_provider, video_url, video_path'
          )
          .eq('id', articleId)
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('Article not found');
        setTitle(data.title ?? '');
        setSlug(data.slug ?? '');
        setContent(data.content ?? '');
        setStatus((data.status as 'draft' | 'published') ?? 'draft');
        setCategoryId(data.category_id ?? null);
        setExistingMedia({
          cover_image_path: data.cover_image_path ?? null,
          cover_image_alt: data.cover_image_alt ?? null,
          video_provider: data.video_provider ?? null,
          video_url: data.video_url ?? null,
          video_path: data.video_path ?? null,
        });
        setMedia((m) => ({ ...m, coverImageAlt: data.cover_image_alt ?? '' }));
      } catch (e) {
        if (e instanceof Error) {
          setErr(e.message ?? 'Failed to load article');
        } else {
          setErr('Failed to load article');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [articleId, supabase]);

  const canSave = useMemo(() => {
    return title.trim().length > 0 && slug.trim().length > 0 && categoryId !== null;
  }, [title, slug, categoryId]);

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setErr(null);
    try {
      const payload: Partial<ArticleRow> = {
        title: title.trim(),
        slug: slug.trim(),
        content,
        status,
        category_id: categoryId,
      };

      // Cover image
      if (media.coverImageFile) {
        const up = await uploadToBucket(supabase, 'images', media.coverImageFile, 'covers');
        payload.cover_image_path = up.path;
        payload.cover_image_alt = media.coverImageAlt || '';
      } else if (articleId) {
        payload.cover_image_path = existingMedia.cover_image_path;
        payload.cover_image_alt = media.coverImageAlt || existingMedia.cover_image_alt || '';
      }

      // Video (file only)
      if (media.videoFile) {
        const upv = await uploadToBucket(supabase, 'videos', media.videoFile, 'articles');
        payload.video_provider = 'file';
        payload.video_url = upv.publicUrl;
        payload.video_path = upv.path;
      } else if (articleId) {
        payload.video_provider = existingMedia.video_provider === 'file' ? 'file' : null;
        payload.video_url = existingMedia.video_url;
        payload.video_path = existingMedia.video_path;
      } else {
        payload.video_provider = null;
        payload.video_url = null;
        payload.video_path = null;
      }

      if (status === 'published') {
        const { data: current } =
          articleId
            ? await supabase.from('articles').select('published_at').eq('id', articleId).maybeSingle()
            : { data: { published_at: null } };
        const alreadyPublished = !!current?.published_at;
        if (!alreadyPublished) {
          payload.published_at = new Date().toISOString();
        }
      } else {
        payload.published_at = null;
      }

      if (articleId) {
        const { error } = await supabase.from('articles').update(payload).eq('id', articleId);
        if (error) throw error;
      } else {
        // include author_id on create
        payload.author_id = currentUserId ?? null;
        const { data, error } = await supabase
          .from('articles')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        if (data?.id) {
          router.push(afterSaveHref);
          return;
        }
      }

      router.push(afterSaveHref);
    } catch (e) {
      if (e instanceof Error) {
        setErr(e.message ?? 'Failed to save article');
      } else {
        setErr('Failed to save article');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-3">
      <h1 className="text-2xl font-bold">
        {articleId ? 'Edit Article' : 'New Article'}
      </h1>
      {loading && <p>Loading…</p>}
      {err && <p className="text-red-600">{err}</p>}

      <label className="grid gap-1">
        <span>Title</span>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!articleId) setSlug(slugify(e.target.value));
          }}
          className="p-2 border rounded"
        />
      </label>

      <label className="grid gap-1">
        <span>Slug</span>
        <input
          value={slug}
          onChange={(e) => setSlug(slugify(e.target.value))}
          className="p-2 border rounded"
        />
      </label>

      <label className="grid gap-1">
        <span>Category</span>
        <select
          value={categoryId ?? ''}
          onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
          className="p-2 border rounded"
        >
          <option value="">Select category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_en ?? c.slug}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1">
        <span>Status</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
          className="p-2 border rounded"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </label>

      <label className="grid gap-1">
        <span>Content (HTML allowed)</span>
        <textarea
          id="article-content-editor"
          rows={14}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="<p>Your article HTML…</p>"
        />
      </label>

      <MediaInputs value={media} onChange={setMedia} />

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={!canSave || saving} className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => router.push(afterSaveHref)}
          className="px-3 py-2 bg-gray-200 text-gray-700 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
