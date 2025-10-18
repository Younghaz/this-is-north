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

  async function toggleStatus(contributorId: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    
    try {
      const { error } = await supabase
        .from('contributors')
        .update({ status: newStatus })
        .eq('id', contributorId);

      if (error) throw error;

      loadData(); // Refresh list
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  async function removeContributor(contributorId: string) {
    if (!confirm('Remove this contributor? They will no longer be able to publish articles.')) return;

    try {
      const { error } = await supabase
        .from('contributors')
        .delete()
        .eq('id', contributorId);

      if (error) throw error;

      loadData(); // Refresh list
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove contributor');
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
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Add New Contributor</h2>
        <div className="flex gap-3">
          <input
            type="email"
            placeholder="Enter user's email address"
            value={newContributorEmail}
            onChange={(e) => setNewContributorEmail(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addContributor}
            disabled={adding || !newContributorEmail.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? 'Adding...' : 'Add Contributor'}
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Contributors can write and publish articles but cannot access admin functions.
        </p>
      </div>

      {/* Contributors list */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h2 className="text-lg font-semibold">Current Contributors ({contributors.length})</h2>
        </div>

        {contributors.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No contributors yet. Add your first contributor above.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {contributors.map((contributor) => (
              <div key={contributor.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium">
                    {contributor.profiles?.display_name || contributor.profiles?.username || 'Unknown User'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {contributor.profiles?.email}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Added {new Date(contributor.created_at).toLocaleDateString()} • 
                    <span className={`ml-1 ${contributor.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                      {contributor.status}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleStatus(contributor.id, contributor.status)}
                    className={`px-3 py-1 text-sm rounded ${
                      contributor.status === 'active'
                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                  >
                    {contributor.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                  
                  <button
                    onClick={() => removeContributor(contributor.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-800 hover:bg-red-200 rounded"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}