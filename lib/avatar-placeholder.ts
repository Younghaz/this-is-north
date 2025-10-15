export function avatarPlaceholder(displayName?: string | null) {
  const seed = (displayName || 'User').trim().slice(0, 2).toUpperCase() || 'U';
  // Could point to a local static asset or dynamic initials service
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear`;
}