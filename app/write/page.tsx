'use client';

import ContributorGuard from '../../components/ContributorGuard';
import AdminArticleForm from '../../components/AdminArticleForm';

export default function WriteNewArticlePage() {
  return (
    <main className="max-w-3xl py-6">
      <ContributorGuard>
        <h1 className="text-2xl font-semibold mb-4">Write New Article</h1>
        <AdminArticleForm afterSaveHref="/" />
      </ContributorGuard>
    </main>
  );
}