import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Check comments for the "islam" article
    const { data: article } = await supabase
      .from('articles')
      .select('id, title, slug')
      .eq('slug', 'islam')
      .single()

    if (!article) {
      return NextResponse.json({ error: 'Article not found' })
    }

    // Get comments for this article
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .eq('article_id', article.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      article: article,
      comments: {
        data: comments,
        error: commentsError?.message || null,
        count: comments?.length || 0
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}