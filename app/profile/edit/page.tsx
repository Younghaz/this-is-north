"use client";
import Image from 'next/image';
import { useState, useEffect } from 'react';
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
  useEffect(() => {
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
  }, [supabase]);

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
    const { error } = await supabase.storage
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
  // Remove email from upsertProfile, not present in state
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
  <main className="max-w-xl mx-auto p-5">
  <h1 className="text-2xl font-bold mb-6 text-center">Edit Profile</h1>
  {error && <div className="text-red-600 mb-4 text-center">{error}</div>}
      {!userId ? (
        <div className="text-center text-gray-600 mt-10 text-lg">
          Please sign in to edit your profile.
        </div>
      ) : (
        <form onSubmit={handleSave} className="bg-white rounded-xl shadow p-8 border border-gray-200 mx-auto max-w-md">
          <div className="flex flex-col items-center mb-5">
            <label className="font-medium mb-2">Profile Photo</label>
            <Image
              src={profile.avatar_url || '/avatar-placeholder.png'}
              alt="Avatar"
              width={96}
              height={96}
              className="rounded-full object-cover border-2 border-blue-300 mb-2"
              priority={false}
              unoptimized
            />
            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="text-sm" disabled={!userId} title="Upload profile photo" placeholder="Choose a profile photo" aria-label="Profile photo upload" />
          </div>
          <div className="mb-4">
            <label className="font-medium mb-1 block">Username</label>
            <input
              type="text"
              value={profile.username}
              onChange={e => setProfile({ ...profile, username: e.target.value })}
              maxLength={50}
              required
              placeholder="Your username"
              className="w-full p-2 rounded border border-gray-300"
              disabled={!userId}
            />
          </div>
          <div className="mb-4">
            <label className="font-medium mb-1 block">Display Name</label>
            <input
              type="text"
              value={profile.display_name}
              onChange={e => setProfile({ ...profile, display_name: e.target.value })}
              maxLength={50}
              required
              placeholder="Your display name"
              className="w-full p-2 rounded border border-gray-300"
              disabled={!userId}
            />
          </div>
          <div className="mb-4">
            <label className="font-medium mb-1 block">Location</label>
            <input
              type="text"
              value={profile.location}
              onChange={e => setProfile({ ...profile, location: e.target.value })}
              maxLength={100}
              placeholder="Where are you from?"
              className="w-full p-2 rounded border border-gray-300"
              disabled={!userId}
            />
          </div>
          <div className="mb-4">
            <label className="font-medium mb-1 block">Age</label>
            <input
              type="number"
              value={profile.age || ''}
              onChange={e => setProfile({ ...profile, age: e.target.value })}
              min={0}
              max={120}
              placeholder="Your age"
              className="w-full p-2 rounded border border-gray-300"
              disabled={!userId}
            />
          </div>
          <div className="mb-5">
            <label className="font-medium mb-1 block">Bio</label>
            <textarea
              value={profile.bio}
              onChange={e => setProfile({ ...profile, bio: e.target.value })}
              maxLength={500}
              rows={4}
              placeholder="Tell us about yourself..."
              className="w-full p-2 rounded border border-gray-300 resize-vertical"
              disabled={!userId}
            />
          </div>
          <button
            type="submit"
            className={`bg-blue-600 text-white py-2 rounded font-semibold w-full text-base border-none cursor-pointer ${loading || (avatarFile && profile.avatar_url === '') ? 'opacity-60' : ''}`}
            disabled={loading || (avatarFile && profile.avatar_url === '') || !userId}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      )}
    </main>
  );
}
