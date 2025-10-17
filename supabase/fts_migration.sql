-- Add full-text search capabilities to articles table
-- This migration adds tsvector column, trigger, and GIN index for fast FTS

-- 1. Add tsvector column for search
ALTER TABLE articles ADD COLUMN IF NOT EXISTS fts tsvector;

-- 2. Create function to update the tsvector
CREATE OR REPLACE FUNCTION update_articles_fts()
RETURNS trigger AS $$
BEGIN
  NEW.fts := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.excerpt, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(regexp_replace(NEW.content, '<[^>]*>', '', 'g'), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger to auto-update fts column
DROP TRIGGER IF EXISTS articles_fts_update ON articles;
CREATE TRIGGER articles_fts_update
  BEFORE INSERT OR UPDATE OF title, excerpt, content
  ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_articles_fts();

-- 4. Update existing rows
UPDATE articles SET fts = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(excerpt, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(regexp_replace(content, '<[^>]*>', '', 'g'), '')), 'C')
WHERE fts IS NULL;

-- 5. Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS articles_fts_idx ON articles USING GIN (fts);

-- 6. Create a view for easy search with ranking
CREATE OR REPLACE VIEW articles_search AS
SELECT 
  id,
  slug,
  title,
  excerpt,
  published_at,
  status,
  likes_count,
  views_count,
  fts,
  -- Add search ranking function
  CASE 
    WHEN fts IS NOT NULL THEN ts_rank(fts, plainto_tsquery('english', ''))
    ELSE 0
  END as base_rank
FROM articles
WHERE status = 'published';