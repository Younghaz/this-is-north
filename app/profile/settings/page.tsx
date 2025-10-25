'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import OneSignalPromptButton from '@/components/OneSignalPromptButton';
import { getBrowserSupabase } from '@/lib/supabase-browser';
import { useTheme } from '@/components/ThemeContext';

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function ProfileSettingsPage() {
  const supabase = getBrowserSupabase();
  const { theme, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Auth user
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;
        const u = authData.user;
        if (!u) {
          setError('You must be signed in to edit your profile.');
          return;
        }
        if (cancelled) return;
        setUserId(u.id);
        setEmail(u.email ?? null);

        // 2. Fetch profile row
        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .eq('id', u.id)
          .maybeSingle();
        if (profErr) throw profErr;

        if (prof) {
          setDisplayName(prof.display_name || '');
          setAvatarUrl(prof.avatar_url || null);
        } else {
          // Optionally create a blank profile row if not found
          await supabase.from('profiles').insert({ id: u.id }).select().single();
        }
      } catch (e: unknown) {
        if (!cancelled) {
          if (typeof e === 'object' && e !== null && 'message' in e) {
            setError((e as { message?: string }).message || 'Failed to load profile.');
          } else {
            setError('Failed to load profile.');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  function onPickAvatar(file: File | null) {
    if (!file) {
      setAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
    setDirty(true);
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!userId) return;
    setError(null);
    setSaving(true);

    const form = ev.currentTarget as HTMLFormElement;
    const fileInput = form.querySelector<HTMLInputElement>('#avatarFile');
    const file = fileInput?.files?.[0] || null;

    try {
      let finalAvatarUrl = avatarUrl;

      // Upload avatar if a new file selected
      if (file) {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(path, file, {
            upsert: false,
            cacheControl: '3600',
            contentType: file.type,
          });
        if (uploadErr) throw uploadErr;

        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        finalAvatarUrl = data.publicUrl;
      }

      const updatePayload: Partial<Profile> = {
        display_name: displayName.trim() || null,
        avatar_url: finalAvatarUrl,
      };

      const { error: upErr } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId);
      if (upErr) throw upErr;

      setAvatarUrl(finalAvatarUrl || null);
      setDirty(false);
    } catch (e: unknown) {
      if (typeof e === 'object' && e !== null && 'message' in e) {
        setError((e as { message?: string }).message || 'Failed to save profile.');
      } else {
        setError('Failed to save profile.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="max-w-md py-6">
        <h1 className="text-xl font-semibold mb-4">Profile Settings</h1>
        <p>Loading…</p>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="max-w-md py-6">
        <h1 className="text-xl font-semibold mb-4">Profile Settings</h1>
        {error ? <p className="text-red-600">{error}</p> : <p>You are not signed in.</p>}
      </main>
    );
  }

  const previewSrc = avatarPreview || avatarUrl;

  return (
    <div className="max-w-xl mx-auto my-10 p-6 bg-white rounded-xl shadow-lg">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="flex items-center justify-between mb-4">
        <span className="text-lg">Dark mode</span>
        <button
          onClick={toggleTheme}
          className={`w-14 h-8 rounded-full border border-gray-400 relative cursor-pointer transition-colors duration-200 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-200'}`}
          aria-pressed="true"
          title="Toggle dark mode"
        >
          <span
            className={`block w-6 h-6 rounded-full absolute top-1 transition-all duration-200 ${theme === 'dark' ? 'bg-yellow-400 left-7' : 'bg-gray-900 left-1'}`}
          />
        </button>
      </div>
      <div className="text-gray-500 text-sm mt-6">
        Switch between light and dark mode. Your preference is saved.
      </div>
      <div className="mb-6">
        <OneSignalPromptButton />
      </div>

      {error ? (
        <div className="mb-4 text-sm text-red-600 border border-red-300 bg-red-50 p-2 rounded">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email (readonly) */}
        <div className="space-y-1">
          <label className="block text-sm font-medium" htmlFor="profile-email">Email</label>
          <input
            id="profile-email"
            value={email || ''}
            readOnly
            className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-600 cursor-not-allowed"
            title="Email address"
            placeholder="Email address"
          />
        </div>

        {/* Display Name */}
        <div className="space-y-1">
          <label className="block text-sm font-medium" htmlFor="profile-display-name">Display Name</label>
          <input
            id="profile-display-name"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setDirty(true);
            }}
            maxLength={80}
            placeholder="e.g. Amina Bello"
            className="w-full border rounded px-3 py-2"
            title="Display name"
          />
          <p className="text-xs text-gray-500">
            Shown in feed & comments. Leave blank to fall back to username.
          </p>
        </div>

        {/* Avatar Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="avatarFile">Avatar</label>
          {previewSrc ? (
            <Image
              src={previewSrc}
              alt="Avatar preview"
              width={96}
              height={96}
              className="w-24 h-24 rounded-full object-cover border"
            />
          ) : (
            <div className="w-24 h-24 rounded-full flex items-center justify-center bg-gray-200 text-gray-500 text-sm">
              No avatar
            </div>
          )}
          <input
            id="avatarFile"
            type="file"
            accept="image/*"
            onChange={(e) => onPickAvatar(e.target.files?.[0] || null)}
            className="block text-sm"
            title="Upload avatar"
            placeholder="Choose avatar image"
          />
          <p className="text-xs text-gray-500">
            Recommended: square image (e.g. 256x256). Max a few MB.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || !dirty}
            className={`px-4 py-2 rounded text-white ${
              saving || !dirty ? 'bg-gray-400' : 'bg-brand hover:brightness-110'
            }`}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            disabled={saving || !dirty}
            onClick={() => {
              setAvatarPreview(null);
              setDirty(false);
            }}
            className="px-4 py-2 rounded border"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}