export function getAnonDeviceId(): string {
  if (typeof window === 'undefined') return '';
  const key = 'anonDeviceId';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export function shouldSendView(articleId: number, hoursCooldown = 6): boolean {
  if (typeof window === 'undefined') return false;
  const key = `view:${articleId}`;
  const last = localStorage.getItem(key);
  const now = Date.now();
  if (!last) return true;
  const deltaHrs = (now - Number(last)) / (1000 * 60 * 60);
  return deltaHrs >= hoursCooldown;
}

export function markViewSent(articleId: number) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`view:${articleId}`, String(Date.now()));
}