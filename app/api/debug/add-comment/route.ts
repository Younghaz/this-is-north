import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Find the islam article
    const { data: article } = await supabase
      .from('articles')
      .select('id')
      .eq('slug', 'islam')
      .single()

    if (!article) {
      return NextResponse.json({ error: 'Article not found' })
    }

    // Create a test comment
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        article_id: article.id,
        user_id: '51daf34d-258f-42a3-97b2-b370f2db88e8', // Your admin ID
        body: 'Test comment for reporting - please report this comment to test the system!',
        status: 'visible'
      })
      .select()

    return NextResponse.json({
      success: !error,
      comment: comment,
      article_id: article.id,
      error: error?.message || null
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}