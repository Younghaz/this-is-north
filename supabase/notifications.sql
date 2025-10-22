-- Table for notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    url TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: Only allow users to read/update their own notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User can mark own notifications as read" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Trigger: Notify user on new article
CREATE OR REPLACE FUNCTION notify_new_article()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (user_id, type, message, url)
    SELECT c.user_id, 'new_article', 'A new article has been published: ' || NEW.title, '/article/' || NEW.slug
    FROM public.contributors c
    WHERE c.status = 'active';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_new_article ON public.articles;
CREATE TRIGGER trigger_notify_new_article
AFTER INSERT ON public.articles
FOR EACH ROW EXECUTE FUNCTION notify_new_article();

-- Trigger: Notify user on comment reply
CREATE OR REPLACE FUNCTION notify_comment_reply()
RETURNS TRIGGER AS $$
DECLARE
    parent_user UUID;
    parent_comment_id bigint;
    article_slug text;
BEGIN
    -- comments table uses parent_comment_id and stores article_id; get parent author and article slug
    IF NEW.parent_comment_id IS NOT NULL THEN
        parent_comment_id := NEW.parent_comment_id;
        SELECT user_id INTO parent_user FROM public.comments WHERE id = parent_comment_id;
        -- fetch article slug for URL
        SELECT slug INTO article_slug FROM public.articles WHERE id = NEW.article_id;
        IF parent_user IS NOT NULL AND parent_user != NEW.user_id THEN
            INSERT INTO public.notifications (user_id, type, message, url)
            VALUES (parent_user, 'comment_reply', 'Someone replied to your comment', '/article/' || coalesce(article_slug::text, '') || '#comment-' || NEW.id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_comment_reply ON public.comments;
CREATE TRIGGER trigger_notify_comment_reply
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION notify_comment_reply();
