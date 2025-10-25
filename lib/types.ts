export type Profile = {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  location?: string;
  age?: number;
  bio?: string;
};

export type CommentRow = {
  id: number;
  article_id: number;
  body: string;
  created_at: string;
  status: string;
};

export type ArticleRow = {
  id: number;
  slug: string;
  title: string;
};
