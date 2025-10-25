'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabase-browser'

export default function CommentForm({ articleId }: { articleId: number }) {
  const router = useRouter()
  const supabase = getBrowserSupabase()

  const [userId, setUserId] = useState<string | null>(null)
  const [emailConfirmed, setEmailConfirmed] = useState<boolean>(false)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const mounted = true
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (!mounted) return
      const u = data.user ?? null
      setUserId(u?.id ?? null)
      setEmailConfirmed(!!u?.email_confirmed_at)
    })()
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUserId(session?.user?.id ?? null)
      setEmailConfirmed(!!session?.user?.email_confirmed_at)
    })
    return () => sub.subscription.unsubscribe()
  }, [supabase])

  if (!userId)
    return (
      <div className="rounded-xl bg-gray-50 border p-3 text-sm">
        You must be signed in to comment.{' '}
        <a className="underline text-blue-600" href="/login">
          Sign in
        </a>
      </div>
    )

  if (!emailConfirmed)
    return (
      <div className="rounded-xl bg-yellow-50 border p-3 text-sm">
        Please confirm your email to comment.
      </div>
    )

  async function submit() {
    setError(null)
    const text = body.trim()
    if (text.length < 2) return setError('Comment is too short.')
    if (text.length > 2000) return setError('Comment is too long (max 2000 chars).')

    setBody('')

    const { error } = await supabase
      .from('comments')
      .insert({ article_id: articleId, user_id: userId, body: text, status: 'visible' })
    if (error) setError(error.message)
    router.refresh()

    setTimeout(() => router.refresh(), 300)
  }

  return (
    <div className="comment-form-card">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        className="comment-form-textarea"
        placeholder="Write a comment..."
        maxLength={2000}
      />
      <div className="comment-form-actions">
        <button
          onClick={submit}
          className="comment-form-post-btn"
          type="button"
        >
          Post
        </button>
        {error && <span className="comment-form-error">{error}</span>}
      </div>
    </div>
  )
}
