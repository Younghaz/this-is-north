'use client';

import AdminGuard from '../../../components/AdminGuard';
import AdminArticleForm from '../../../components/AdminArticleForm';

export default function AdminNewArticlePage() {
  return (
    <main className="max-w-3xl py-6">
      <AdminGuard>
        <h1 className="text-2xl font-semibold mb-4">New Article</h1>
  <AdminArticleForm afterSaveHref="/admin" />
      </AdminGuard>
    </main>
  );
}