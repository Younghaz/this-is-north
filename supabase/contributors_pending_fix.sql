-- Better Contributors Fix - Use a pending_contributors table
-- This avoids modifying the primary key

-- Create a separate table for pending contributors (added by email, not yet linked)
CREATE TABLE IF NOT EXISTS pending_contributors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  added_by UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE pending_contributors ENABLE ROW LEVEL SECURITY;

-- Policies for pending_contributors (same as contributors)
CREATE POLICY "Admins can manage pending contributors"
  ON pending_contributors FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid()
    )
  );

-- Function to check if user is contributor (checks both tables)
CREATE OR REPLACE FUNCTION is_user_contributor(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is in contributors table
  IF EXISTS (
    SELECT 1 FROM contributors 
    WHERE id = user_id AND status = 'active'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is in pending_contributors by email
  IF EXISTS (
    SELECT 1 FROM pending_contributors pc
    JOIN auth.users u ON u.email = pc.email
    WHERE u.id = user_id AND pc.status = 'active'
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update article policies to use the new function
DROP POLICY IF EXISTS "Contributors can insert articles" ON articles;
DROP POLICY IF EXISTS "Contributors can update own articles" ON articles;

-- Allow contributors (from either table) to create articles
CREATE POLICY "Contributors can insert articles"
  ON articles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND (
      EXISTS (
        SELECT 1 FROM admins 
        WHERE admins.id = auth.uid()
      ) OR 
      is_user_contributor(auth.uid())
    )
  );

-- Allow contributors (from either table) to edit their own articles
CREATE POLICY "Contributors can update own articles"
  ON articles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = author_id AND (
      EXISTS (
        SELECT 1 FROM admins 
        WHERE admins.id = auth.uid()
      ) OR 
      is_user_contributor(auth.uid())
    )
  );