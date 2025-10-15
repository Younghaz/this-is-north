'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '../lib/supabase-browser';

type Category = { id: number; slug: string; name_en: string | null };

type ArticleRow = {
  id?: number;
  title: string;
  slug: string;
  content: string | null;
  status: 'draft' | 'published';
  category_id: number | null;
  published_at: string | null;
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

async function uploadToBucket(supabase: any, bucket: 'images' | 'videos', file: File, prefix = '') {
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
    <div style={{ borderTop: '1px solid #ddd', paddingTop: 12, marginTop: 12 }}>
      <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Media</h3>

      {/* Cover image */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>
          Cover image (optional)
        </label>
        <input type="file" accept="image/*" onChange={(e) => onPickImage(e.target.files?.[0] ?? null)} />
        {value.coverImagePreview && (
          <div style={{ marginTop: 8 }}>
            <img
              src={value.coverImagePreview}
              alt="cover preview"
              style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'cover' }}
            />
          </div>
        )}
        <input
          placeholder="Alt text"
          value={value.coverImageAlt}
          onChange={(e) => onChange({ ...value, coverImageAlt: e.target.value })}
          style={{ display: 'block', marginTop: 8, width: '100%', padding: 6 }}
        />
      </div>

      {/* Video (no YouTube; file upload only) */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Video (optional)</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="file" accept="video/*" onChange={(e) => onPickVideo(e.target.files?.[0] ?? null)} />
        </div>
        {value.videoPreview && (
          <video
            src={value.videoPreview}
            controls
            style={{ marginTop: 8, maxWidth: '100%', maxHeight: 240 }}
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

  const [existingMedia, setExistingMedia] = useState({
    cover_image_path: null,
    cover_image_alt: null,
    video_provider: null,
    video_url: null,
    video_path: null,
  } as any);

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
      } catch (e: any) {
        setErr(e?.message ?? 'Failed to load article');
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
        payload.video_provider = existingMedia.video_provider;
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
            : { data: null as any };
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
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to save article');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>
        {articleId ? 'Edit Article' : 'New Article'}
      </h1>
      {loading && <p>Loading…</p>}
      {err && <p style={{ color: 'crimson' }}>{err}</p>}

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Title</span>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!articleId) setSlug(slugify(e.target.value));
          }}
          style={{ padding: 8 }}
        />
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Slug</span>
        <input
          value={slug}
          onChange={(e) => setSlug(slugify(e.target.value))}
          style={{ padding: 8 }}
        />
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Category</span>
        <select
          value={categoryId ?? ''}
          onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
          style={{ padding: 8 }}
        >
          <option value="">Select category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_en ?? c.slug}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Status</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          style={{ padding: 8 }}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Content (HTML allowed)</span>
        <textarea
          id="article-content-editor"
          rows={14}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{ width: '100%', padding: 10 }}
          placeholder="<p>Your article HTML…</p>"
        />
      </label>

      <MediaInputs value={media} onChange={setMedia} />

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSave} disabled={!canSave || saving} style={{ padding: '8px 12px' }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => router.push(afterSaveHref)}
          style={{ padding: '8px 12px' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}