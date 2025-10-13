import AdminGuard from '../../components/AdminGuard';
import AdminDashboard from '../../components/AdminDashboard';

export const dynamic = 'force-dynamic';

export default function AdminHome() {
  return (
    <main className="max-w-3xl py-6">
      <AdminGuard>
        <AdminDashboard />
      </AdminGuard>
    </main>
  );
}