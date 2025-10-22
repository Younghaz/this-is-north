export default function UserAvatar({ name, avatar_url, size = 32 }) {
  const src = avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'User')}&backgroundType=gradientLinear`;
  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className="rounded-full object-cover border"
      loading="lazy"
      decoding="async"
    />
  );
}
