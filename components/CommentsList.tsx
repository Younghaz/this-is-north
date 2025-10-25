import Link from 'next/link'
import Image from 'next/image';
// Use the server-side Supabase client for server components (full access, never exposed to client)
import { getSupabaseServer } from '@/lib/supabaseServer'
import DeleteCommentButton from './DeleteCommentButton'
import ReplyAction from './ReplyAction'
// import ReportButton from './ReportButton'

function avatarPlaceholder(name?: string | null, email?: string | null) {
  const base = name || email || 'User'
  const initials = base
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    initials
  )}&backgroundType=gradientLinear`
}

function withCacheBuster(url: string | null | undefined): string {
  if (!url) return ''
  if (url.includes('?v=')) return url
  const timestamp = Date.now().toString().slice(-6)
  return `${url}${url.includes('?') ? '&' : '?'}v=${timestamp}`
}

type CommentRow = {
  id: number
  article_id: number
  body: string
  created_at: string
  user_id: string
  status?: string | null
  parent_id?: number | null
}

type Profile = {
  id: string
  username: string | null
  display_name: string | null
  email: string | null
  avatar_url?: string | null
  is_admin?: boolean
}

type TreeNode = CommentRow & { children: TreeNode[] }

function buildTree(rows: CommentRow[]): TreeNode[] {
  const byId = new Map<number, TreeNode>()
  const roots: TreeNode[] = []
  for (const r of rows) byId.set(r.id, { ...r, children: [] })
  for (const r of rows) {
    const node = byId.get(r.id)!
    if (r.parent_id && byId.has(r.parent_id)) {
      const parent = byId.get(r.parent_id)!
      if (r.parent_id !== r.id) parent.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

// This is a server component. Always use getSupabaseServer() here.
// Debug: Confirm this code runs server-side and log the articleId
export default async function CommentsList({ articleId }: { articleId: number }) {
  console.log('[CommentsList] Running on server. articleId:', articleId)
  const supabase = getSupabaseServer()

  // Debug: Log after fetching comments
  const { data: commentsData, error: commentsError } = await supabase
    .from('comments')
    .select('id, article_id, body, created_at, user_id, status, parent_id')
    .eq('article_id', articleId)
    .eq('status', 'visible')
    .order('created_at', { ascending: true })
  if (commentsError) {
    console.error('[CommentsList] Error fetching comments:', commentsError)
  } else {
    console.log('[CommentsList] Comments fetched:', commentsData)
  }

  const all = (commentsData as CommentRow[]) ?? []
  const tree = buildTree(all)

  const userIds = Array.from(new Set(all.map((c) => c.user_id)))
  const profileById = new Map<string, Profile>()

  if (userIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, email, avatar_url')
      .in('id', userIds)
    if (profilesError) {
      console.error('[CommentsList] Error fetching profiles:', profilesError)
    } else {
      console.log('[CommentsList] Profiles fetched:', profilesData)
    }
    for (const p of (profilesData as Profile[]) ?? []) profileById.set(p.id, p)
  }

  // No 'use client' directive: this file is a server component and will only run on the server.
  function renderNode(node: TreeNode, depth = 0) {
    const author = profileById.get(node.user_id)
    // Compose a richer display for the author
    const authorName = author?.display_name || author?.username || author?.email || 'User';
    const authorUsername = author?.username ? `@${author.username}` : null;
    const authorEmail = author?.email || null;
    const isAdmin = author?.is_admin;
    const avatarRaw =
      author?.avatar_url && author.avatar_url.trim() !== ''
        ? author.avatar_url
        : avatarPlaceholder(author?.display_name, author?.email);
    const avatarUrl = withCacheBuster(avatarRaw);
    const isReply = depth > 0;

    return (
      <div
        key={node.id}
        className={`mt-3 ${isReply ? 'ml-10 border-l-2 pl-3 border-gray-200' : ''}`}
      >
        <div className="flex items-start gap-3">
          <Image
            src={avatarUrl}
            alt={authorName}
            width={44}
            height={44}
            className="rounded-full border-2 border-blue-200 shadow object-cover flex-shrink-0 bg-gradient-to-br from-blue-100 to-blue-300"
            title={authorEmail || undefined}
            priority={false}
            unoptimized
          />
          <div className="flex-1 min-w-0">
            <div className="bg-gray-50 rounded-2xl px-5 py-3 border border-gray-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 min-w-0">
                  <Link
                    href={`/profile/${node.user_id}`}
                    className="font-bold text-base hover:underline text-blue-900 truncate"
                    title={authorEmail || undefined}
                  >
                    {authorName}
                  </Link>
                  {authorUsername && (
                    <span className="text-xs text-blue-600 font-mono ml-1 truncate" title={authorUsername}>{authorUsername}</span>
                  )}
                  {isAdmin && (
                    <span className="ml-2 px-2 py-0.5 rounded bg-yellow-200 text-yellow-900 text-xs font-semibold border border-yellow-300">Admin</span>
                  )}
                  {authorEmail && (
                    <span className="ml-2 text-xs text-gray-400 truncate" title={authorEmail}>{authorEmail}</span>
                  )}
                </div>
                <DeleteCommentButton
                  commentId={node.id}
                  authorUserId={node.user_id}
                />
              </div>
              <p className="text-sm mt-2 whitespace-pre-wrap text-gray-800">{node.body}</p>
            </div>
            <div className="text-xs text-gray-500 mt-2 flex items-center gap-3">
              <span>{new Date(node.created_at).toLocaleString()}</span>
              <ReplyAction articleId={articleId} parentId={node.id} />
              {/* <ReportButton contentType="comment" contentId={node.id} /> */}
            </div>
            {node.children.length > 0 && (
              <div className="mt-2 space-y-2">
                {node.children.map((child) => renderNode(child, depth + 1))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {commentsError && (
        <p className="text-red-600 text-sm">
          Error loading comments: {commentsError.message}
        </p>
      )}

      {tree.length === 0 ? (
        <p className="text-sm text-gray-600">
          No comments yet. Be the first to comment!
        </p>
      ) : (
        tree.map((n) => renderNode(n))
      )}
    </div>
  )
}
