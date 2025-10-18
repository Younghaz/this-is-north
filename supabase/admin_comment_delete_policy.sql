-- Allow admins to delete any comment
-- Run this in Supabase Dashboard > SQL Editor

DO $$
BEGIN
  -- Drop existing policy if it exists
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='comments' AND policyname='comments_delete_own_or_admin') THEN
    DROP POLICY comments_delete_own_or_admin ON public.comments;
  END IF;
  
  -- Drop the old policy that only allows own comments
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='comments' AND policyname='comments_delete_own') THEN
    DROP POLICY comments_delete_own ON public.comments;
  END IF;

  -- Create new policy that allows users to delete their own comments OR admins to delete any comment
  CREATE POLICY comments_delete_own_or_admin ON public.comments
    FOR DELETE USING (
      auth.uid() = user_id OR 
      EXISTS (SELECT 1 FROM public.admins a WHERE a.id = auth.uid())
    );
END $$;