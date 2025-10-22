import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function decodeJwtSub(token: string | null): string | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson);
    return payload?.sub ?? null;
  } catch {
    return null;
  }
}

// GET ping to verify the route is mounted
export async function GET() {
  console.log('[comments] GET ping');
  return NextResponse.json({ ok: true, route: 'comments' });
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  console.log('[comments] start', startedAt);

  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      console.log('[comments] missing token');
      return NextResponse.json({ ok: false, error: 'missing_auth_token' }, { status: 401 });
    }

    const userId = decodeJwtSub(token);
    if (!userId) {
      console.log('[comments] invalid token');
      return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 });
    }

    const { articleId, body } = await req.json();
    const text = (body ?? '').trim();
    if (!articleId || !text) {
      console.log('[comments] missing params', { articleId, hasText: !!text });
      return NextResponse.json({ ok: false, error: 'missing_params' }, { status: 400 });
    }

    if (!SUPA_URL || !SUPA_ANON) {
      console.log('[comments] missing env');
      return NextResponse.json({ ok: false, error: 'server_env_missing' }, { status: 500 });
    }

    console.log('[comments] creating client');
    const supabase = createClient(SUPA_URL, SUPA_ANON, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    console.log('[comments] inserting…', { articleId, userId });
    const { error } = await supabase
      .from('comments')
      .insert({ article_id: articleId, user_id: userId, body: text, status: 'visible' }, { returning: 'minimal' });

    if (error) {
      console.error('[comments] insert error:', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    console.log('[comments] success in', Date.now() - startedAt, 'ms');
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message || String(e);
    console.error('[comments] server error:', msg);
    const status = msg === 'timeout' ? 504 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}