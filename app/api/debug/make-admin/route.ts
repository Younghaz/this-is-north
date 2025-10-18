import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function POST() {
  try {
    const supabase = getSupabase()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      return NextResponse.json({ error: 'Auth error', details: authError.message }, { status: 500 })
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check if user is already an admin
    const { data: existingAdmin } = await supabase
      .from('admins')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (existingAdmin) {
      return NextResponse.json({ 
        success: true, 
        message: 'You are already an admin',
        admin: existingAdmin
      })
    }

    // Make current user an admin
    const { data: newAdmin, error: insertError } = await supabase
      .from('admins')
      .insert([
        { 
          id: user.id,
          email: user.email || 'unknown@email.com'
        }
      ])
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ 
        error: 'Failed to create admin', 
        details: insertError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully made you an admin!',
      admin: newAdmin
    })

  } catch (error) {
    return NextResponse.json({ 
      error: 'Setup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}