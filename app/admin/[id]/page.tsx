import React from 'react';

"use client";
import AdminGuard from '../../../components/AdminGuard';
import AdminArticleForm from '../../../components/AdminArticleForm';

export default function AdminEditPage({ params }: { params: Promise<{ id: string }> }) {
  const [resolvedId, setResolvedId] = React.useState<string | null>(null);
  React.useEffect(() => {
    params.then(({ id }) => setResolvedId(id));
  }, [params]);
  const articleId = resolvedId ? Number(resolvedId) : null;


  if (!articleId) {
    return (
      <main className="max-w-3xl py-6">
        <AdminGuard>
          <p>Invalid article ID.</p>
        </AdminGuard>
      </main>
    );
  }


  return (
    <main className="max-w-3xl py-6">
      <AdminGuard>
        <h1 className="text-2xl font-semibold mb-4">Edit Article</h1>
        <AdminArticleForm articleId={articleId} afterSaveHref="/admin" />
      </AdminGuard>
    </main>
  );
}
