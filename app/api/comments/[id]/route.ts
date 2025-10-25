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

// GET ping to verify dynamic route is mounted
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  console.log('[comments:delete] GET ping id=', params.id);
  return NextResponse.json({ ok: true, route: 'comments/[id]', id: params.id });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const startedAt = Date.now();
  console.log('[comments:delete] start', startedAt, 'id=', params.id);
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      console.log('[comments:delete] missing token');
      return NextResponse.json({ ok: false, error: 'missing_auth_token' }, { status: 401 });
    }
    const userId = decodeJwtSub(token);
    if (!userId) {
      console.log('[comments:delete] invalid token');
      return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 });
    }

    const idNum = Number(params.id);
    if (!idNum) {
      return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
    }

    const supabase = createClient(SUPA_URL, SUPA_ANON, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', idNum)
      .eq('user_id', userId);

    if (error) {
      console.error('[comments:delete] error:', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    console.log('[comments:delete] success in', Date.now() - startedAt, 'ms');
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    let msg = 'Unknown error';
    if (typeof e === 'object' && e !== null && 'message' in e) {
      msg = (e as { message?: string }).message ?? 'Unknown error';
    } else {
      msg = String(e);
    }
    console.error('[comments:delete] server error:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}