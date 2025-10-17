import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const SELECT = `
  id,
  title,
  slug,
  content,
  status,
  published_at,
  cover_image_path,
  cover_image_alt,
  video_provider,
  video_path,
  video_url,
  likes_count,
  comments_count,
  category_id,
  views_count,
  trending_score,
  categories:category_id (slug, name_en)
`;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limitParam = Number(searchParams.get('limit') || '') || DEFAULT_LIMIT;
    const cursorParam = Number(searchParams.get('cursor') || '') || 0;
    const categorySlug = searchParams.get('category') || null;
    const q = searchParams.get('q') || null;
    const sort = (searchParams.get('sort') || 'new').toLowerCase(); // ✅ 'new' | 'trending'

    const limit = Math.max(1, Math.min(MAX_LIMIT, limitParam));
    const offset = Math.max(0, cursorParam);
    const end = offset + limit;

    const supabase = getSupabase();

    // 🔍 Optional: resolve category slug → id
    let categoryId: number | null = null;
    if (categorySlug) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id, slug')
        .eq('slug', categorySlug)
        .maybeSingle();
      categoryId = cat?.id ?? null;
    }

    let query = supabase
      .from('articles')
      .select(SELECT)
      .eq('status', 'published');

    if (categoryId !== null) query = query.eq('category_id', categoryId);
    if (q && q.trim()) query = query.textSearch('fts', q, { type: 'websearch' });

    // 🧠 Sorting: trending or new
    if (sort === 'trending') {
      query = query
        .order('trending_score', { ascending: false })
        .order('published_at', { ascending: false })
        .order('id', { ascending: false });
    } else {
      query = query
        .order('published_at', { ascending: false })
        .order('id', { ascending: false });
    }

    const { data, error } = await query.range(offset, end);
    if (error) throw error;

    const hasMore = (data?.length ?? 0) > limit;
    const items = hasMore ? data!.slice(0, limit) : data ?? [];
    const nextCursor = hasMore ? offset + limit : null;

    return NextResponse.json({ ok: true, items, nextCursor });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
