import { getSupabase } from '@/lib/supabase';
import ProfilePageClient from './ProfilePageClient';

// --- 🧠 SEO Metadata ---
export async function generateMetadata({ params }: { params: { id: string } }) {
  const resolvedParams = params;
  const supabase = getSupabase();
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, username, avatar_url')
    .eq('id', resolvedParams.id)
    .maybeSingle();

  if (!profile) {
    return { title: 'Profile not found' };
  }

  const name = profile.display_name || profile.username || 'User';
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || 'http://localhost:3000';
  const url = `${site}/profile/${resolvedParams.id}`;

  return {
    title: `${name} — Profile | This is North`,
    description: `View ${name}'s comments and activity on This is North.`,
    openGraph: {
      title: `${name} — Profile`,
      description: `View ${name}'s comments and activity on This is North.`,
      url,
      images: profile.avatar_url ? [{ url: profile.avatar_url }] : [],
    },
  };
}

// --- 🚀 Server entrypoint ---
export default async function Page({ params }: { params: { id: string } }) {
  const resolvedParams = params;
  return <ProfilePageClient id={resolvedParams.id} />;
}
