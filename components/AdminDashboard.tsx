'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBrowserSupabase } from '../lib/supabase-browser';

type Article = {
  id: number;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  published_at: string | null;
};

export default function AdminDashboard() {
  const supabase = getBrowserSupabase();
  const [items, setItems] = useState<Article[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('articles')
      .select('id, title, slug, status, published_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) setError(error.message);
    setItems((data as unknown as Article[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function onDelete(id: number, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setBusyId(id);
    setError(null);
    try {
      const { error } = await supabase.from('articles').delete().eq('id', id);
      if (error) throw error;
      setItems((prev) => (prev ? prev.filter((a) => a.id !== id) : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <div className="flex items-center gap-3">
          <Link className="underline" href="/admin/contributors">Contributors</Link>
          <Link className="underline" href="/admin/moderation">Moderation</Link>
          <button onClick={load} className="border rounded px-3 py-1">Refresh</button>
          <Link className="underline" href="/admin/new">New article</Link>
        </div>
      </div>

      {loading ? <p>Loading…</p> : null}
      {error ? <p className="text-red-600">Error: {error}</p> : null}
      {items && items.length === 0 && !loading ? <p>No articles yet.</p> : null}

      {items && items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id} className="border rounded p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{a.title}</div>
                <div className="text-sm text-gray-600">
                  {a.status} {a.published_at ? `• ${new Date(a.published_at).toLocaleString()}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link className="underline" href={`/article/${a.slug}`} target="_blank">View</Link>
                <Link className="underline" href={`/admin/${a.id}`}>Edit</Link>
                <button
                  onClick={() => onDelete(a.id, a.title)}
                  disabled={busyId === a.id}
                  className="text-red-600 underline disabled:opacity-50"
                  title="Delete article"
                >
                  {busyId === a.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}