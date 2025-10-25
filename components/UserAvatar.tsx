export default function UserAvatar({ name, avatar_url, size = 32 }) {
  const src = avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'User')}&backgroundType=gradientLinear`;
    return (
      <Image
        src={src}
        alt={name}
        width={Number(size)}
        height={Number(size)}
        className="rounded-full object-cover border"
        priority={false}
        unoptimized
      />
    );
}
