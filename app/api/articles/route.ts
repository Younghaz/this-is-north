import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

// Fields we need for the homepage cards (match ArticleCard)
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
  categories:category_id (slug, name_en)
`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limitParam = Number(searchParams.get('limit')) || DEFAULT_LIMIT;
  const cursorParam = Number(searchParams.get('cursor')) || 0;

  const limit = Math.max(1, Math.min(MAX_LIMIT, limitParam));
  const offset = Math.max(0, cursorParam);
  const end = offset + limit;

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('articles')
    .select(SELECT)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, end);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const hasMore = (data?.length ?? 0) > limit;
  const items = hasMore ? data!.slice(0, limit) : (data ?? []);
  const nextCursor = hasMore ? offset + limit : null;

  return NextResponse.json({
    ok: true,
    items,
    nextCursor,
  });
}
