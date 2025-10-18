import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Check if reports table exists and get all reports
    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select('*')
      .limit(10)

    // Check if admins table exists  
    const { data: admins, error: adminsError } = await supabase
      .from('admins')
      .select('*')
      .limit(5)

    return NextResponse.json({
      success: true,
      reports: {
        data: reports,
        error: reportsError?.message || null,
        count: reports?.length || 0
      },
      admins: {
        data: admins,
        error: adminsError?.message || null,
        count: admins?.length || 0
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}