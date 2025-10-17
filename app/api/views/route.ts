import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { articleId, anonDeviceId } = await req.json();

    const article_id = Number(articleId || 0);
    const device_id = String(anonDeviceId || '').slice(0, 200);

    if (!article_id || !device_id) {
      return NextResponse.json({ ok: false, error: 'Missing articleId or anonDeviceId' }, { status: 400 });
    }

    // upsert-like behavior (unique constraint enforces 1/day/device)
    const { error } = await supabase
      .from('article_views')
      .insert({ article_id, device_id }); // day defaults to today (UTC)

    if (error) {
      // If duplicate (already viewed today), ignore gracefully
      if (!/duplicate key value|already exists/i.test(error.message)) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}