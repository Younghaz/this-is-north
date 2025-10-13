'use client';

import AdminGuard from '../../../components/AdminGuard';
import AdminArticleForm from '../../../components/AdminArticleForm';
import ContentToolbar from '@/components/admin/ContentToolbar'; // ✅ new import

export default function AdminNewArticlePage() {
  return (
    <main className="max-w-3xl py-6">
      <AdminGuard>
        <h1 className="text-2xl font-semibold mb-4">New Article</h1>

        {/* ✅ Toolbar added above the textarea */}
        <ContentToolbar
          textareaId="content"
          bucket={process.env.NEXT_PUBLIC_SUPABASE_MEDIA_BUCKET || 'media'}
        />

        {/* ✅ Ensure your textarea in AdminArticleForm has id="content" */}
        <AdminArticleForm mode="create" afterSaveHref="/admin" />
      </AdminGuard>
    </main>
  );
}
