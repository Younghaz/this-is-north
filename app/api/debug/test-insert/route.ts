import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { contentType, contentId, reason, reporterId } = body
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Try the exact same insert as ReportButton
    const { data, error } = await supabase
      .from('reports')
      .insert({
        content_type: contentType,
        content_id: contentId,
        reporter_id: reporterId || '51daf34d-258f-42a3-97b2-b370f2db88e8',
        reason: reason || 'Test report from debug API',
        status: 'pending'
      })
      .select()

    // Also check existing reports for this content
    const { data: existing } = await supabase
      .from('reports')
      .select('*')
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .eq('reporter_id', reporterId || '51daf34d-258f-42a3-97b2-b370f2db88e8')

    return NextResponse.json({
      success: !error,
      data: data,
      error: error?.message || null,
      errorCode: error?.code || null,
      existing: existing || [],
      input: { contentType, contentId, reason, reporterId }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}