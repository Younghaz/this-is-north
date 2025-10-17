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
    let mounted = true
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

    supabase
      .from('comments')
      .insert(
        { article_id: articleId, user_id: userId, body: text, status: 'visible' },
        { returning: 'minimal' }
      )
      .then(({ error }) => {
        if (error) setError(error.message)
        router.refresh()
      })
      .catch((e) => setError(e?.message ?? 'Failed to post comment.'))

    setTimeout(() => router.refresh(), 300)
  }

  return (
    <div className="space-y-2 mt-4">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        className="w-full border rounded-2xl p-3 text-sm focus:outline-none focus:ring focus:ring-blue-200"
        placeholder="Write a comment..."
        maxLength={2000}
      />
      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-full text-sm"
          type="button"
        >
          Post
        </button>
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>
    </div>
  )
}
