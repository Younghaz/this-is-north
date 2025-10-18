'use client';

import { useState, useEffect } from 'react';
import { getBrowserSupabase } from '@/lib/supabase-browser';

type Contributor = {
  id: string;
  created_at: string;
  status: 'active' | 'suspended';
  bio: string | null;
  display_name: string | null;
  email_notifications: boolean;
  profiles?: {
    username: string | null;
    display_name: string | null;
    email: string | null;
  };
};

export default function ContributorsPage() {
  const supabase = getBrowserSupabase();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newContributorEmail, setNewContributorEmail] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Check if user is admin
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setIsAdmin(false);
        return;
      }

      const { data: adminRow } = await supabase
        .from('admins')
        .select('id')
        .eq('id', auth.user.id)
        .maybeSingle();

      if (!adminRow) {
        setIsAdmin(false);
        return;
      }

      setIsAdmin(true);

      // Load contributors (fallback to original table only if pending table doesn't exist)
      console.log('Loading contributors...');
      
      const { data: contributorsData, error: contributorsError } = await supabase
        .from('contributors')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Contributors data:', contributorsData, 'Error:', contributorsError);

      // Try to load pending contributors, but don't fail if table doesn't exist
      let pendingData = [];
      try {
        const { data, error } = await supabase
          .from('pending_contributors')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (!error) {
          pendingData = data || [];
        } else {
          console.log('Pending contributors table not ready yet:', error.message);
        }
      } catch (err) {
        console.log('Pending contributors table not available:', err);
      }

      // Handle contributors table errors (but allow proceeding)
      if (contributorsError && contributorsError.code !== '42P01') {
        console.error('Contributors table error:', contributorsError);
        // Continue anyway - maybe table exists but is empty
      }

      // Combine both lists, marking pending ones
      const allContributors = [
        ...(contributorsData || []).map(c => ({ ...c, isPending: false })),
        ...pendingData.map(c => ({ ...c, isPending: true }))
      ];

      console.log('All contributors:', allContributors);
      setContributors(allContributors);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function addContributor() {
    if (!newContributorEmail.trim()) return;
    
    setAdding(true);
    try {
      // Look up user by attempting to find them in existing data
      // Check if they already exist as a contributor (in either table)
      const { data: existingContributor } = await supabase
        .from('contributors')
        .select('id')
        .eq('email', newContributorEmail.trim())
        .maybeSingle();

      const { data: existingPending } = await supabase
        .from('pending_contributors')
        .select('id')
        .eq('email', newContributorEmail.trim())
        .maybeSingle();

      if (existingContributor || existingPending) {
        alert('User is already a contributor.');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('You must be logged in to add contributors');
        return;
      }

      // Add to pending_contributors table (no user ID needed)
      const insertData = {
        email: newContributorEmail.trim(),
        added_by: user.id,
        status: 'active' as const
      };

      console.log('Attempting to insert pending contributor:', insertData);
      
      const { error } = await supabase
        .from('pending_contributors')
        .insert(insertData);

      if (error) {
        console.error('Insert error:', error);
        if (error.code === '23505') {
          alert('User is already a contributor.');
        } else {
          alert(`Database error: ${error.message}`);
        }
        return;
      }

      setNewContributorEmail('');
      loadData(); // Refresh list
      alert('Contributor added successfully!');
    } catch (err) {
      console.error('Full error:', err);
      alert(err instanceof Error ? err.message : 'Failed to add contributor');
    } finally {
      setAdding(false);
    }
  }

  // Update toggleStatus to handle both tables
  async function toggleStatus(contributorId: string | null, currentStatus: string, email?: string, isPending?: boolean) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      if (isPending && email) {
        await supabase
          .from('pending_contributors')
          .update({ status: newStatus })
          .eq('email', email);
      } else if (contributorId) {
        await supabase
          .from('contributors')
          .update({ status: newStatus })
          .eq('id', contributorId);
      }
      loadData();
    } catch (err) {
      alert('Failed to update status');
    }
  }

  // Update removeContributor to handle both tables
  async function removeContributor(contributorId: string | null, email?: string, isPending?: boolean) {
    if (!window.confirm('Remove this contributor? They will no longer be able to publish articles.')) return;
    try {
      if (isPending && email) {
        await supabase
          .from('pending_contributors')
          .delete()
          .eq('email', email);
      } else if (contributorId) {
        await supabase
          .from('contributors')
          .delete()
          .eq('id', contributorId);
      }
      loadData();
    } catch (err) {
      alert('Failed to remove contributor');
    }
  }

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Contributors Management</h1>
        <p>Loading...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Contributors Management</h1>
        <p className="text-red-600">Access denied. Admin privileges required.</p>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Contributors Management</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Add new contributor */}
      <div style={{
  maxWidth: '700px',
  margin: '2rem auto',
  background: '#f9fafb',
  borderRadius: '0.75rem',
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  border: '1px solid #e5e7eb',
  padding: '2rem 2rem 1.5rem 2rem',
}}>
  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.2rem', letterSpacing: '0.01em' }}>
    Add New Contributor
  </h2>
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
    <input
      type="email"
      placeholder="Enter user's email address"
      value={newContributorEmail}
      onChange={e => setNewContributorEmail(e.target.value)}
      style={{
        flex: 1,
        padding: '0.7rem 1rem',
        fontSize: '1rem',
        border: '1px solid #d1d5db',
        borderRadius: '0.5rem',
        marginRight: '0.5rem',
        background: '#fff',
      }}
    />
    <button
      onClick={addContributor}
      disabled={adding || !newContributorEmail.trim()}
      style={{
        background: adding ? '#e5e7eb' : '#2563eb',
        color: adding ? '#888' : '#fff',
        border: 'none',
        borderRadius: '0.5rem',
        padding: '0.7rem 1.5rem',
        fontWeight: 600,
        fontSize: '1rem',
        cursor: adding ? 'not-allowed' : 'pointer',
        boxShadow: adding ? 'none' : '0 1px 4px rgba(37,99,235,0.08)',
        transition: 'background 0.2s',
      }}
    >
      {adding ? 'Adding...' : 'Add Contributor'}
    </button>
  </div>
  <div style={{ color: '#374151', fontSize: '1rem', marginBottom: '0.5rem' }}>
    Contributors can write and publish articles but cannot access admin functions.
  </div>
</div>

      {/* Contributors list */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h2 className="text-lg font-semibold">Current Contributors ({contributors.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <style>{`
  .contributors-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
    font-size: 1rem;
  }
  .contributors-table th, .contributors-table td {
    border: 1px solid #e5e7eb;
    padding: 0.75rem 1rem;
    text-align: left;
  }
  .contributors-table th {
    background: #f3f4f6;
    font-weight: 700;
    letter-spacing: 0.02em;
  }
  .contributors-table tr:nth-child(even) {
    background: #fafafa;
  }
  .badge {
    display: inline-block;
    padding: 0.2em 0.7em;
    border-radius: 0.5em;
    font-size: 0.95em;
    font-weight: 600;
    margin-right: 0.5em;
  }
  .badge-active {
    background: #e6ffed;
    color: #059669;
    border: 1px solid #059669;
  }
  .badge-suspended {
    background: #f3f4f6;
    color: #6b7280;
    border: 1px solid #d1d5db;
  }
  .badge-pending {
    background: #fffbe6;
    color: #b45309;
    border: 1px solid #fbbf24;
  }
  .badge-confirmed {
    background: #e0f2fe;
    color: #2563eb;
    border: 1px solid #2563eb;
  }
  .contributors-table button {
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 0.3em;
    padding: 0.3em 0.9em;
    margin-right: 0.5em;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }
  .contributors-table button:hover {
    background: #e0e7ff;
    border-color: #6366f1;
    color: #3730a3;
  }
`}</style>
          <table className="contributors-table">
            <thead>
              <tr>
                <th>EMAIL</th>
                <th>STATUS</th>
                <th>ROLE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {contributors.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: '#666' }}>
                    No contributors yet. Add your first contributor above.
                  </td>
                </tr>
              ) : (
                contributors.map((c) => (
                  <tr key={c.email || c.id}>
                    <td>{c.email || 'Unknown'}</td>
                    <td>
                      <span className={`badge ${c.status === 'active' ? 'badge-active' : 'badge-suspended'}`}>{c.status}</span>
                    </td>
                    <td>
                      <span className={`badge ${c.isPending ? 'badge-pending' : 'badge-confirmed'}`}>{c.isPending ? 'Pending' : 'Confirmed'}</span>
                    </td>
                    <td>
                      <button onClick={() => toggleStatus(c.id ?? null, c.status, c.email, c.isPending)}>
                        {c.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                      <button onClick={() => removeContributor(c.id ?? null, c.email, c.isPending)}>Remove</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}