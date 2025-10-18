-- Contributors/Authors permission system
-- Run this in Supabase Dashboard > SQL Editor

-- Create contributors table for users who can write and publish articles
CREATE TABLE IF NOT EXISTS public.contributors (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id), -- Which admin added them
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  bio text, -- Optional contributor bio
  display_name text, -- Optional custom display name for articles
  email_notifications boolean DEFAULT true -- Whether they want email notifications
);

-- Enable RLS
ALTER TABLE public.contributors ENABLE ROW LEVEL SECURITY;

-- Contributors policies
DO $$
BEGIN
  -- Anyone can read contributor info (for article attribution)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contributors' AND policyname='contributors_read_public') THEN
    CREATE POLICY contributors_read_public ON public.contributors FOR SELECT USING (true);
  END IF;

  -- Contributors can read their own info
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contributors' AND policyname='contributors_read_self') THEN
    CREATE POLICY contributors_read_self ON public.contributors FOR SELECT USING (auth.uid() = id);
  END IF;

  -- Only admins can insert/update/delete contributors
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contributors' AND policyname='contributors_admin_manage') THEN
    CREATE POLICY contributors_admin_manage ON public.contributors
      FOR ALL USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.id = auth.uid()));
  END IF;
END $$;

-- Update articles table to allow contributors to insert/update their own articles
DO $$
BEGIN
  -- Drop existing article policies that might conflict
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='articles' AND policyname='articles_insert_contributors') THEN
    DROP POLICY articles_insert_contributors ON public.articles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='articles' AND policyname='articles_update_own_or_admin') THEN
    DROP POLICY articles_update_own_or_admin ON public.articles;
  END IF;

  -- Contributors and admins can insert articles
  CREATE POLICY articles_insert_contributors ON public.articles
    FOR INSERT WITH CHECK (
      auth.uid() = author_id AND (
        EXISTS (SELECT 1 FROM public.contributors c WHERE c.id = auth.uid() AND c.status = 'active') OR
        EXISTS (SELECT 1 FROM public.admins a WHERE a.id = auth.uid())
      )
    );

  -- Contributors can update their own articles, admins can update any
  CREATE POLICY articles_update_own_or_admin ON public.articles
    FOR UPDATE USING (
      (auth.uid() = author_id AND EXISTS (SELECT 1 FROM public.contributors c WHERE c.id = auth.uid() AND c.status = 'active')) OR
      EXISTS (SELECT 1 FROM public.admins a WHERE a.id = auth.uid())
    )
    WITH CHECK (
      (auth.uid() = author_id AND EXISTS (SELECT 1 FROM public.contributors c WHERE c.id = auth.uid() AND c.status = 'active')) OR
      EXISTS (SELECT 1 FROM public.admins a WHERE a.id = auth.uid())
    );
END $$;