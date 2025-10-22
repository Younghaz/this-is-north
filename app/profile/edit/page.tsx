"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supabase-browser';


export default function ProfileEditPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const [profile, setProfile] = useState({
    username: '',
    display_name: '',
    avatar_url: '',
    location: '',
    age: '',
    bio: '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch userId and profile on mount
  useState(() => {
    (async () => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user?.id) {
        setError('Could not get user ID. Please log in again.');
        return;
      }
      setUserId(userData.user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .maybeSingle();
      if (data) setProfile({
        username: data.username ?? '',
        display_name: data.display_name ?? '',
        avatar_url: data.avatar_url ?? '',
        location: data.location ?? '',
        age: data.age ?? '',
        bio: data.bio ?? '',
      });
      if (error) setError(error.message);
    })();
  }, []);

  // Avatar upload handler
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setLoading(true);
    // Upload to Supabase Storage
    if (!userId) {
      setError('User ID not loaded.');
      return;
    }
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(`${userId}/${file.name}`, file, { upsert: true });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(`${userId}/${file.name}`);
    setProfile((p) => ({ ...p, avatar_url: urlData?.publicUrl || '' }));
    setLoading(false);
  }

  // Save profile handler
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      setError('User ID not loaded.');
      return;
    }
    setLoading(true);
    // Always include id for upsert, and ensure age is a number
    const upsertProfile = {
      id: userId,
      username: profile.username, // Always include username for NOT NULL constraint
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      location: profile.location,
      age: profile.age ? Number(profile.age) : null,
      bio: profile.bio,
      email: profile.email,
    };
    // Debug log to trace RLS error
    console.log('userId:', userId);
    console.log('upsertProfile:', upsertProfile);
    const { error } = await supabase
      .from('profiles')
      .upsert(upsertProfile, { onConflict: 'id' });
    setLoading(false);
    if (error) setError(error.message);
    else router.push(`/profile/${userId}`);
  }

  return (
    <main style={{ maxWidth: 480, margin: '40px auto', padding: 20 }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: 24, textAlign: 'center' }}>Edit Profile</h1>
      {error && <div style={{ color: 'red', marginBottom: 16, textAlign: 'center' }}>{error}</div>}
      {!userId ? (
        <div style={{ textAlign: 'center', color: '#555', marginTop: 40, fontSize: 18 }}>
          Please sign in to edit your profile.
        </div>
      ) : (
        <form onSubmit={handleSave} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #0001', padding: 32, border: '1px solid #eee', margin: '0 auto', maxWidth: 400 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
            <label style={{ fontWeight: 500, marginBottom: 6 }}>Profile Photo</label>
            <img
              src={profile.avatar_url || '/avatar-placeholder.png'}
              alt="Avatar"
              width={96}
              height={96}
              style={{ borderRadius: '50%', objectFit: 'cover', border: '2px solid #b3c6ff', marginBottom: 8 }}
            />
            <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ fontSize: 14 }} disabled={!userId} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 500, marginBottom: 4, display: 'block' }}>Username</label>
            <input
              type="text"
              value={profile.username}
              onChange={e => setProfile({ ...profile, username: e.target.value })}
              maxLength={50}
              required
              placeholder="Your username"
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
              disabled={!userId}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 500, marginBottom: 4, display: 'block' }}>Display Name</label>
            <input
              type="text"
              value={profile.display_name}
              onChange={e => setProfile({ ...profile, display_name: e.target.value })}
              maxLength={50}
              required
              placeholder="Your display name"
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
              disabled={!userId}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 500, marginBottom: 4, display: 'block' }}>Location</label>
            <input
              type="text"
              value={profile.location}
              onChange={e => setProfile({ ...profile, location: e.target.value })}
              maxLength={100}
              placeholder="Where are you from?"
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
              disabled={!userId}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 500, marginBottom: 4, display: 'block' }}>Age</label>
            <input
              type="number"
              value={profile.age || ''}
              onChange={e => setProfile({ ...profile, age: e.target.value })}
              min={0}
              max={120}
              placeholder="Your age"
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
              disabled={!userId}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontWeight: 500, marginBottom: 4, display: 'block' }}>Bio</label>
            <textarea
              value={profile.bio}
              onChange={e => setProfile({ ...profile, bio: e.target.value })}
              maxLength={500}
              rows={4}
              placeholder="Tell us about yourself..."
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', resize: 'vertical' }}
              disabled={!userId}
            />
          </div>
          <button
            type="submit"
            style={{ background: '#2563eb', color: '#fff', padding: '10px 0', borderRadius: 6, fontWeight: 600, width: '100%', fontSize: 16, border: 'none', cursor: 'pointer', opacity: loading || (avatarFile && profile.avatar_url === '') ? 0.6 : 1 }}
            disabled={loading || (avatarFile && profile.avatar_url === '') || !userId}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      )}
    </main>
  );
}
