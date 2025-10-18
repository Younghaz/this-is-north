-- Contributors System Setup - Clean Version
-- This handles existing policies properly

-- Step 1: Create contributors table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS contributors (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  bio TEXT,
  added_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Step 2: Create indexes (if they don't exist)
CREATE INDEX IF NOT EXISTS contributors_status_idx ON contributors(status);
CREATE INDEX IF NOT EXISTS contributors_email_idx ON contributors(email);

-- Step 3: Enable Row Level Security
ALTER TABLE contributors ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies first, then recreate them
DROP POLICY IF EXISTS "Admins can view all contributors" ON contributors;
DROP POLICY IF EXISTS "Admins can add contributors" ON contributors;
DROP POLICY IF EXISTS "Admins can update contributors" ON contributors;
DROP POLICY IF EXISTS "Admins can delete contributors" ON contributors;
DROP POLICY IF EXISTS "Contributors can view their own record" ON contributors;

-- Step 5: Create fresh policies
-- Admins can view all contributors
CREATE POLICY "Admins can view all contributors"
  ON contributors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid()
    )
  );

-- Admins can add contributors
CREATE POLICY "Admins can add contributors"
  ON contributors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid()
    )
  );

-- Admins can update contributors
CREATE POLICY "Admins can update contributors"
  ON contributors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid()
    )
  );

-- Admins can delete contributors
CREATE POLICY "Admins can delete contributors"
  ON contributors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid()
    )
  );

-- Contributors can view their own record
CREATE POLICY "Contributors can view their own record"
  ON contributors FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Step 6: Update article permissions for contributors
-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Contributors can insert articles" ON articles;
DROP POLICY IF EXISTS "Contributors can update own articles" ON articles;

-- Allow contributors to create articles
CREATE POLICY "Contributors can insert articles"
  ON articles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND (
      EXISTS (
        SELECT 1 FROM admins 
        WHERE admins.id = auth.uid()
      ) OR 
      EXISTS (
        SELECT 1 FROM contributors 
        WHERE contributors.id = auth.uid() 
        AND contributors.status = 'active'
      )
    )
  );

-- Allow contributors to edit their own articles
CREATE POLICY "Contributors can update own articles"
  ON articles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = author_id AND (
      EXISTS (
        SELECT 1 FROM admins 
        WHERE admins.id = auth.uid()
      ) OR 
      EXISTS (
        SELECT 1 FROM contributors 
        WHERE contributors.id = auth.uid() 
        AND contributors.status = 'active'
      )
    )
  );