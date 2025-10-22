"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "../../lib/supabase-browser";

export default function SignupPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [location, setLocation] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // 1. Create user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            display_name: displayName,
            location,
            age,
            bio,
          },
        },
      });
      if (signUpError) throw signUpError;
      const user = data.user;
      if (!user) throw new Error("Signup failed");

      // 2. Upload avatar if provided
      if (avatarFile) {
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(`${user.id}/${avatarFile.name}`, avatarFile, {
            upsert: true,
            cacheControl: "3600",
          });
        if (uploadError) throw uploadError;
      }
      router.push("/login?signup=success");
    } catch (e: any) {
      setError(e?.message ?? "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Sign Up</h1>
      <form onSubmit={handleSignup} className="signup-form-card">
        <div className="signup-avatar-upload" style={{ marginBottom: 18 }}>
          <div
            className="signup-avatar-circle"
            onClick={() => avatarInputRef.current?.click()}
            style={{ cursor: 'pointer' }}
            title="Add Photo"
          >
            {avatarFile ? (
              <img
                src={URL.createObjectURL(avatarFile)}
                alt="Profile preview"
                className="signup-avatar-img"
              />
            ) : (
              <span className="signup-avatar-placeholder">Add Photo</span>
            )}
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => setAvatarFile(e.target.files?.[0] || null)}
          />
        </div>
        <div className="signup-form-group">
          <input className="signup-input" placeholder="Email" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          <input className="signup-input" placeholder="Password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div className="signup-form-group">
          <input className="signup-input" placeholder="Username" required value={username} onChange={e => setUsername(e.target.value)} />
          <input className="signup-input" placeholder="Display Name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
        </div>
        <div className="signup-form-group">
          <input className="signup-input" placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} />
          <input className="signup-input" placeholder="Age" type="number" min="0" value={age} onChange={e => setAge(e.target.value)} />
        </div>
        <textarea className="signup-input signup-bio-textarea" placeholder="Bio" value={bio} onChange={e => setBio(e.target.value)} />
        <button type="submit" className="signup-btn" disabled={busy}>
          {busy ? "Signing up..." : "Sign Up"}
        </button>
        {error && <div className="signup-error">{error}</div>}
      </form>
      <div className="signup-switch-login">
        Already have an account? <a href="/login">Sign in</a>
      </div>
    </main>
  );
}
