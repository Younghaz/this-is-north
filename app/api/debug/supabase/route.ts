import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const t0 = Date.now();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) {
    return NextResponse.json({ ok: false, error: 'missing_env' }, { status: 500 });
  }

  const t1 = Date.now();
  const supabase = createClient(url, anon, { auth: { persistSession: false } });
  const t2 = Date.now();
  const { data, error } = await supabase.from('articles').select('id').limit(1);
  const t3 = Date.now();

  return NextResponse.json({
    ok: !error,
    timings_ms: {
      route_total: t3 - t0,
      create_client: t2 - t1,
      select_articles: t3 - t2,
    },
    count: data?.length ?? 0,
    error: error?.message ?? null,
  });
}