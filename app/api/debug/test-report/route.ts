import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Create a test report
    const { data, error } = await supabase
      .from('reports')
      .insert({
        content_type: 'comment',
        content_id: 1, // Test comment ID
        reporter_id: '51daf34d-258f-42a3-97b2-b370f2db88e8', // Your admin ID
        reason: 'Test report - debugging',
        status: 'pending'
      })
      .select()

    return NextResponse.json({
      success: !error,
      data: data,
      error: error?.message || null
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get all reports
    const { data: reports, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })

    return NextResponse.json({
      reports: {
        data: reports,
        error: error?.message || null,
        count: reports?.length || 0
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}