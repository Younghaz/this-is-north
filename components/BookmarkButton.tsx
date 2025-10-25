"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { useSession } from "@/lib/useSession";

export default function BookmarkButton({ articleId }: { articleId: number }) {
  const supabase = getBrowserSupabase();
  const { session } = useSession();
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if this article is already bookmarked by the user
  useEffect(() => {
    console.log('BookmarkButton useEffect', { session, articleId });
    if (!session?.user?.id) {
      setError('You must be logged in to bookmark.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('bookmarks')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('article_id', articleId)
          .maybeSingle();
        if (error) {
          setError('Failed to check bookmark status.');
          console.error('BookmarkButton fetch error:', error);
        }
        if (!cancelled) setBookmarked(!!data);
      } catch (err) {
        setError('Unexpected error.');
        console.error('BookmarkButton fetch exception:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id, articleId, supabase]);

  async function handleClick() {
    console.log('BookmarkButton handleClick', { session, articleId, bookmarked });
    if (!session?.user?.id) {
      setError('You must be logged in to bookmark.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (bookmarked) {
        // Remove bookmark
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', session.user.id)
          .eq('article_id', articleId);
        if (error) {
          setError('Failed to remove bookmark.');
          console.error('BookmarkButton remove error:', error);
          setLoading(false);
          return;
        }
        setBookmarked(false);
      } else {
        // Add bookmark
        const { error } = await supabase
          .from('bookmarks')
          .insert({ user_id: session.user.id, article_id: articleId });
        if (error) {
          setError('Failed to add bookmark.');
          console.error('BookmarkButton add error:', error);
          setLoading(false);
          return;
        }
        setBookmarked(true);
      }
    } catch (err) {
      setError('Unexpected error.');
      console.error('BookmarkButton exception:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'inline-block' }}>
      <button
        className={
          "bookmark-btn px-3 py-1 rounded-full border text-sm " +
          (bookmarked ? "bg-yellow-200 border-yellow-400 text-yellow-900" : "bg-white border-gray-300 text-gray-700 hover:bg-yellow-50")
        }
        onClick={handleClick}
        type="button"
        aria-pressed={bookmarked ? 'true' : 'false'}
        disabled={loading}
      >
        {bookmarked ? "Bookmarked" : "Bookmark"}
      </button>
      {error && (
        <div style={{ color: 'red', fontSize: 13, marginTop: 4 }}>{error}</div>
      )}
    </div>
  );
}
