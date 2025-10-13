import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getClient() {
  if (!SUPA_URL || !SUPA_ANON) return null;
  return createClient(SUPA_URL, SUPA_ANON, { auth: { persistSession: false } });
}

// GET: status check for this device on this article
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const articleId = Number(url.searchParams.get('articleId') ?? '');
  const anonDeviceId = url.searchParams.get('anonDeviceId') ?? '';

  if (!articleId || !anonDeviceId) {
    return NextResponse.json({ liked: false, error: 'missing_params' }, { status: 400 });
  }

  // If env not configured, we can’t confirm from DB -> default to not liked
  const supabase = getClient();
  if (!supabase) return NextResponse.json({ liked: false, mock: true });

  const { data, error } = await supabase
    .from('likes')
    .select('id')
    .eq('article_id', articleId)
    .eq('anon_device_id', anonDeviceId)
    .maybeSingle();

  if (error) {
    // If no rows, Supabase returns data=null without error when using maybeSingle
    return NextResponse.json({ liked: false, error: error.message }, { status: 200 });
  }

  return NextResponse.json({ liked: !!data });
}

// POST: add a like
export async function POST(req: NextRequest) {
  const { articleId, anonDeviceId } = await req.json();

  // Light throttle by IP per article (Next.js 15+: await cookies())
  const ip = req.headers.get('x-forwarded-for') ?? '0.0.0.0';
  const key = `lk:${ip}:${articleId}`;
  const jar = await cookies();
  const existing = jar.get(key);
  if (existing) {
    return NextResponse.json({ ok: false, reason: 'rate_limited' }, { status: 429 });
  }
  jar.set(key, '1', { maxAge: 3, httpOnly: false });

  // If env not set, mock success
  const supabase = getClient();
  if (!supabase) return NextResponse.json({ ok: true, mock: true });

  const { error } = await supabase.from('likes').insert({
    article_id: articleId,
    anon_device_id: anonDeviceId
  });

  if (error) {
    // Duplicate like? Treat as success so UI can render "Liked"
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('duplicate key value') || msg.includes('unique constraint') || msg.includes('ux_likes')) {
      return NextResponse.json({ ok: true, alreadyLiked: true });
    }
    console.error('Supabase like insert error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}