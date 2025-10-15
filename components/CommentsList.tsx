import { getSupabase } from '@/lib/supabase';
import DeleteCommentButton from './DeleteCommentButton';
import ReplyAction from './ReplyAction';

// 🔹 DiceBear fallback helper — creates initials avatar
function avatarPlaceholder(name?: string | null, email?: string | null) {
  const base = name || email || 'User';
  const initials = base
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    initials
  )}&backgroundType=gradientLinear`;
}

// 🔹 Helper: append ?v=timestamp only once (for cache busting)
function withCacheBuster(url: string | null | undefined): string {
  if (!url) return '';
  if (url.includes('?v=')) return url; // already versioned
  // Only append when the user has recently updated their avatar
  const timestamp = Date.now().toString().slice(-6); // short suffix
  return `${url}${url.includes('?') ? '&' : '?'}v=${timestamp}`;
}

type CommentRow = {
  id: number;
  article_id: number;
  body: string;
  created_at: string;
  user_id: string;
  status?: string | null;
  parent_id?: number | null;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  email?: string | null;
  avatar_url?: string | null;
};

type TreeNode = CommentRow & { children: TreeNode[] };

function buildTree(rows: CommentRow[]): TreeNode[] {
  const byId = new Map<number, TreeNode>();
  const roots: TreeNode[] = [];
  for (const r of rows) byId.set(r.id, { ...r, children: [] });
  for (const r of rows) {
    const node = byId.get(r.id)!;
    if (r.parent_id && byId.has(r.parent_id)) {
      const parent = byId.get(r.parent_id)!;
      if (r.parent_id !== r.id) parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export default async function CommentsList({ articleId }: { articleId: number }) {
  const supabase = getSupabase();

  // 🧠 Fetch all visible comments
  const { data: commentsData, error: commentsError } = await supabase
    .from('comments')
    .select('id, article_id, body, created_at, user_id, status, parent_id')
    .eq('article_id', articleId)
    .eq('status', 'visible')
    .order('created_at', { ascending: true });

  const all = (commentsData as CommentRow[]) ?? [];
  const tree = buildTree(all);

  // 🧠 Fetch all commenter profiles
  const userIds = Array.from(new Set(all.map((c) => c.user_id)));
  const profileById = new Map<string, Profile>();

  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, display_name, email, avatar_url')
      .in('id', userIds);

    for (const p of (profilesData as Profile[]) ?? []) profileById.set(p.id, p);
  }

  // 🧩 Recursive render
  function renderNode(node: TreeNode, depth = 0) {
    const author = profileById.get(node.user_id);
    const authorName =
      author?.display_name || author?.username || author?.email || 'User';
    const avatarRaw =
      author?.avatar_url && author.avatar_url.trim() !== ''
        ? author.avatar_url
        : avatarPlaceholder(author?.display_name, author?.email);

    // 🔹 Append version param for cache busting
    const avatarUrl = withCacheBuster(avatarRaw);

    const indent = depth > 0 ? 12 : 0;

    return (
      <div key={node.id} style={{ marginLeft: indent, marginTop: depth === 0 ? 0 : 12 }}>
        <div className="border rounded p-3">
          <div className="flex items-start gap-3">
            {/* 👤 Avatar */}
            <img
              src={avatarUrl}
              alt={author?.display_name || author?.username || 'User avatar'}
              width={32}
              height={32}
              loading="lazy"
              decoding="async"
              style={{
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1px solid #ddd',
                flexShrink: 0,
              }}
            />

            {/* 💬 Comment content */}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  <span className="sr-only">Author:</span> {authorName}
                </div>
                <DeleteCommentButton commentId={node.id} authorUserId={node.user_id} />
              </div>

              <p className="mt-2 whitespace-pre-wrap text-sm">{node.body}</p>

              <div className="text-xs text-gray-500 mt-2">
                {new Date(node.created_at).toLocaleString()}
              </div>

              <ReplyAction articleId={articleId} parentId={node.id} />

              {node.children.length > 0 ? (
                <div className="mt-2 space-y-2 border-l pl-3">
                  {node.children.map((child) => renderNode(child, depth + 1))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {commentsError ? (
        <p className="text-red-600 text-sm">Error loading comments: {commentsError.message}</p>
      ) : null}

      {tree.length === 0 ? (
        <p className="text-sm text-gray-600">No comments yet. Be the first to comment.</p>
      ) : (
        tree.map((n) => renderNode(n))
      )}
    </div>
  );
}
