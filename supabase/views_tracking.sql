-- Views tracking system for articles
-- This creates tables and functions for tracking views and calculating trending scores

-- 1. Create article_views table for deduplication (1 view per device per day)
CREATE TABLE IF NOT EXISTS article_views (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL, -- client-generated fingerprint
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET, -- optional for additional deduplication
  user_agent TEXT -- optional for analytics
);

-- 2. Add views_count column to articles if not exists
ALTER TABLE articles ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- 3. Create function to update views_count
CREATE OR REPLACE FUNCTION update_article_views_count()
RETURNS trigger AS $$
BEGIN
  -- Update the views_count in articles table
  UPDATE articles 
  SET views_count = (
    SELECT COUNT(DISTINCT device_id) 
    FROM article_views 
    WHERE article_id = COALESCE(NEW.article_id, OLD.article_id)
  )
  WHERE id = COALESCE(NEW.article_id, OLD.article_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to auto-update views_count
DROP TRIGGER IF EXISTS article_views_count_update ON article_views;
CREATE TRIGGER article_views_count_update
  AFTER INSERT OR DELETE ON article_views
  FOR EACH ROW
  EXECUTE FUNCTION update_article_views_count();

-- 5. Create trending score calculation function
CREATE OR REPLACE FUNCTION compute_trending_score(
  likes_count BIGINT,
  views_count BIGINT,
  published_at TIMESTAMP WITH TIME ZONE
) RETURNS NUMERIC AS $$
DECLARE
  age_hours NUMERIC;
  age_penalty NUMERIC;
  engagement_score NUMERIC;
BEGIN
  -- Calculate age in hours
  age_hours := EXTRACT(EPOCH FROM (NOW() - published_at)) / 3600.0;
  
  -- Time decay: penalty increases exponentially after 24 hours
  age_penalty := CASE 
    WHEN age_hours <= 24 THEN 1.0
    WHEN age_hours <= 168 THEN 1.0 / (1.0 + (age_hours - 24) * 0.02) -- week
    ELSE 1.0 / (1.0 + age_hours * 0.005) -- older content
  END;
  
  -- Engagement score: likes worth more than views
  engagement_score := (COALESCE(likes_count, 0) * 10) + (COALESCE(views_count, 0) * 1);
  
  -- Final score with time decay
  RETURN engagement_score * age_penalty;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trending articles view (drop existing first to avoid schema conflicts)
DROP VIEW IF EXISTS articles_trending;
CREATE VIEW articles_trending AS
SELECT 
  a.id,
  a.title,
  a.slug,
  a.content,
  a.excerpt,
  a.status,
  a.published_at,
  a.created_at,
  a.updated_at,
  a.cover_image_path,
  a.cover_image_alt,
  a.video_provider,
  a.video_path,
  a.video_url,
  a.likes_count,
  a.comments_count,
  a.views_count,
  a.category_id,
  compute_trending_score(a.likes_count, a.views_count, a.published_at) as trending_score
FROM articles a
WHERE a.status = 'published'
ORDER BY compute_trending_score(a.likes_count, a.views_count, a.published_at) DESC;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS article_views_article_id_idx ON article_views(article_id);
CREATE INDEX IF NOT EXISTS article_views_device_id_idx ON article_views(device_id);
CREATE INDEX IF NOT EXISTS article_views_viewed_at_idx ON article_views(viewed_at);
CREATE INDEX IF NOT EXISTS articles_trending_score_idx ON articles(published_at, likes_count, views_count) WHERE status = 'published';

-- 8. Initialize views_count for existing articles
UPDATE articles SET views_count = COALESCE((
  SELECT COUNT(DISTINCT device_id) 
  FROM article_views 
  WHERE article_id = articles.id
), 0) WHERE views_count IS NULL;

-- 9. Create function to clean up old duplicate views (run periodically)
CREATE OR REPLACE FUNCTION cleanup_duplicate_views()
RETURNS void AS $$
BEGIN
  -- Keep only the latest view per device per article per day
  DELETE FROM article_views 
  WHERE id NOT IN (
    SELECT DISTINCT ON (article_id, device_id, DATE(viewed_at)) id
    FROM article_views 
    ORDER BY article_id, device_id, DATE(viewed_at), viewed_at DESC
  );
END;
$$ LANGUAGE plpgsql;