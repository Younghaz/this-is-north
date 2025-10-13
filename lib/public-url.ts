export function publicStorageUrl(bucket: 'images' | 'videos', path?: string | null) {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
  const prefix = base ? `${base}/storage/v1/object/public` : `/storage/v1/object/public`;
  return `${prefix}/${bucket}/${path}`;
}