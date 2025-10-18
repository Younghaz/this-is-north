# Contributors System Setup Guide

This guide will help you set up the three-tier permission system (Users → Contributors → Admins) for your This Is North platform.

## What This Enables

- **Regular Users**: Can read articles and comment
- **Contributors**: Can write and publish articles (limited to ~10 people)
- **Admins**: Full access to dashboard and moderation

## Setup Steps

### 1. Run SQL in Supabase Dashboard

Go to your Supabase dashboard at: https://supabase.com/dashboard/project/omhzvkvxmemvueexziny

Navigate to **SQL Editor** and run the following queries:

```sql
-- Create contributors table
CREATE TABLE IF NOT EXISTS contributors (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  bio TEXT,
  added_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS contributors_status_idx ON contributors(status);
CREATE INDEX IF NOT EXISTS contributors_email_idx ON contributors(email);

-- Enable Row Level Security
ALTER TABLE contributors ENABLE ROW LEVEL SECURITY;
```

### 2. Set Up RLS Policies

```sql
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
```

### 3. Update Article Permissions

```sql
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
```

## After Setup

Once you've run the SQL queries:

1. **Access Contributor Management**: Go to `/admin/contributors` in your app
2. **Add Contributors**: Search for users by email and add them as contributors
3. **Contributors Can Write**: They'll now be able to create and publish articles
4. **Manage Status**: You can suspend/reactivate contributors as needed

## How to Add Contributors

1. Go to your admin dashboard
2. Click "Contributors" in the navigation
3. Enter the email of the user you want to make a contributor
4. Click "Add Contributor"
5. The user will now have article writing permissions

## Security Features

- Database-level security with Row Level Security (RLS)
- Contributors can only edit their own articles
- Admins retain full control over all content
- Contributors can be suspended without losing their articles
- All changes are audited with timestamps

## Troubleshooting

- **User not found**: Make sure the person has signed up for an account first
- **Permission denied**: Verify you're logged in as an admin
- **Can't create articles**: Check the contributor's status is 'active'

Your three-tier system is now ready! You can safely scale content creation while maintaining security.