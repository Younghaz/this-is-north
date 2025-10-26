import React from 'react';
import Image from 'next/image';
type UserAvatarProps = {
  name?: string;
  avatar_url?: string;
  size?: number;
};

export default function UserAvatar({ name, avatar_url, size = 32 }: UserAvatarProps) {
  const src = avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'User')}&backgroundType=gradientLinear`;
    return (
      <Image
        src={src}
  alt={name || 'User'}
        width={Number(size)}
        height={Number(size)}
        className="rounded-full object-cover border"
        priority={false}
        unoptimized
      />
    );
}
