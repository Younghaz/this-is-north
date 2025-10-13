'use client';

import { use } from 'react';
import AdminGuard from '../../../components/AdminGuard';
import AdminArticleForm from '../../../components/AdminArticleForm';

export default function AdminEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const articleId = Number(id);

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
        <AdminArticleForm mode="edit" articleId={articleId} afterSaveHref="/admin" />
      </AdminGuard>
    </main>
  );
}
