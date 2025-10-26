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

// GET ping
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.pathname.split('/').pop() ?? '';
  console.log('[comments:GET] ping id=', id);
  return NextResponse.json({ ok: true, route: 'comments/[id]', id });
}

// DELETE comment
export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.pathname.split('/').pop() ?? '';
  const startedAt = Date.now();
  console.log('[comments:DELETE] start', startedAt, 'id=', id);

  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'missing_auth_token' }, { status: 401 });

    const userId = decodeJwtSub(token);
    if (!userId) return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 });

    const idNum = Number(id);
    if (!idNum) return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });

    const supabase = createClient(SUPA_URL, SUPA_ANON, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', idNum)
      .eq('user_id', userId);

    if (error) {
      console.error('[comments:DELETE] error:', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    console.log('[comments:DELETE] success in', Date.now() - startedAt, 'ms');
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[comments:DELETE] server error:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
