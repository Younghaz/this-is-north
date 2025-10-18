import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Check all reports (not just pending)
    const { data: allReports, error: allReportsError } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    // Check pending reports specifically
    const { data: pendingReports, error: pendingError } = await supabase
      .from('reports')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    // Check admins
    const { data: admins, error: adminsError } = await supabase
      .from('admins')
      .select('*')

    // Check if we can query comments table
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('id, body, status')
      .limit(5)

    return NextResponse.json({
      success: true,
      tables: {
        allReports: {
          data: allReports,
          error: allReportsError?.message || null,
          count: allReports?.length || 0
        },
        pendingReports: {
          data: pendingReports,
          error: pendingError?.message || null,
          count: pendingReports?.length || 0
        },
        admins: {
          data: admins,
          error: adminsError?.message || null,
          count: admins?.length || 0
        },
        comments: {
          data: comments,
          error: commentsError?.message || null,
          count: comments?.length || 0
        }
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}