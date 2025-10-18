-- Fix Contributors Table - Allow Email-First Approach
-- This allows adding contributors by email before they have a user ID

-- First, modify the contributors table to make id nullable temporarily
ALTER TABLE contributors ALTER COLUMN id DROP NOT NULL;

-- Drop the foreign key constraint temporarily 
ALTER TABLE contributors DROP CONSTRAINT IF EXISTS contributors_id_fkey;

-- Add a unique constraint on email to prevent duplicates
ALTER TABLE contributors ADD CONSTRAINT contributors_email_unique UNIQUE (email);

-- Create a function to link contributors when users log in
CREATE OR REPLACE FUNCTION link_contributor_on_login()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user logs in, check if they exist as a contributor by email
  UPDATE contributors 
  SET id = NEW.id, updated_at = NOW()
  WHERE email = NEW.email AND id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-link contributors when users sign in
DROP TRIGGER IF EXISTS link_contributor_trigger ON auth.users;
CREATE TRIGGER link_contributor_trigger
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION link_contributor_on_login();