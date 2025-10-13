import { getSupabase } from '@/lib/supabase';
import DeleteCommentButton from './DeleteCommentButton';

type CommentRow = {
  id: number;
  body: string;
  created_at: string;
  user_id: string;
  status?: string | null;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
};

export default async function CommentsList({ articleId }: { articleId: number }) {
  const supabase = getSupabase();

  // 1) Load visible comments for this article (no embed)
  const { data: commentsData, error: commentsError } = await supabase
    .from('comments')
    .select('id, body, created_at, user_id, status')
    .eq('article_id', articleId)
    .eq('status', 'visible')
    .order('created_at', { ascending: true });

  const comments = (commentsData as CommentRow[]) ?? [];

  // 2) If we have comments, load the author profiles separately
  let profileById = new Map<string, Profile>();
  if (comments.length > 0) {
    const userIds = Array.from(new Set(comments.map((c) => c.user_id)));
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .in('id', userIds);

    if (!profilesError && profilesData) {
      for (const p of profilesData as Profile[]) {
        profileById.set(p.id, p);
      }
    }
  }

  return (
    <div className="space-y-4">
      {commentsError ? (
        <p className="text-red-600 text-sm">Error loading comments: {commentsError.message}</p>
      ) : null}

      {comments.length === 0 ? (
        <p className="text-sm text-gray-600">No comments yet. Be the first to comment.</p>
      ) : (
        comments.map((c) => {
          const author = profileById.get(c.user_id);
          return (
            <div key={c.id} className="border rounded p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  {author?.display_name || author?.username || 'User'}
                </div>
                <DeleteCommentButton commentId={c.id} authorUserId={c.user_id} />
              </div>
              <p className="mt-2 whitespace-pre-wrap">{c.body}</p>
              <div className="text-xs text-gray-500 mt-2">
                {new Date(c.created_at).toLocaleString()}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}