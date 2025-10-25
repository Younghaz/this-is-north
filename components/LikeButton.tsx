'use client';

import { useEffect, useMemo, useState } from 'react';

function getOrCreateDeviceId() {
  const key = 'anon_device_id';
  let id = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  if (!id) {
    id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    localStorage.setItem(key, id);
  }
  return id;
}

export default function LikeButton({ articleId, onLiked }: { articleId: number; onLiked?: () => void }) {
  const [state, setState] = useState<'idle' | 'loading' | 'liked'>('idle');

  const deviceId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return getOrCreateDeviceId();
  }, []);

  useEffect(() => {
    if (!articleId || !deviceId) return;

    const localKey = `liked:${articleId}`;
    if (typeof window !== 'undefined' && localStorage.getItem(localKey) === '1') {
      setState('liked');
      return;
    }

    const controller = new AbortController();
    (async () => {
      try {
        const url = `/api/like?articleId=${articleId}&anonDeviceId=${encodeURIComponent(deviceId)}`;
        const res = await fetch(url, { method: 'GET', signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          if (data?.liked) {
            setState('liked');
            if (typeof window !== 'undefined') localStorage.setItem(localKey, '1');
          } else {
            setState('idle');
          }
        } else {
          setState('idle');
        }
      } catch {
        setState('idle');
      }
    })();

    return () => controller.abort();
  }, [articleId, deviceId]);

  async function like() {
    if (state === 'liked' || state === 'loading') return;
    setState('loading');

    try {
      const res = await fetch('/api/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, anonDeviceId: deviceId })
      });

      const ok = res.ok;
  let json: unknown = null;
      try { json = await res.json(); } catch {}

      if (ok || (typeof json === 'object' && json !== null && 'ok' in json && (json as { ok?: boolean }).ok)) {
        setState('liked');
        if (typeof window !== 'undefined') localStorage.setItem(`liked:${articleId}`, '1');
        onLiked?.();
      } else {
        setState('idle');
      }
    } catch {
      setState('idle');
    }
  }

  const disabled = state !== 'idle';

  return (
    <>
      {state === 'liked' ? (
        <button
          onClick={like}
          disabled={disabled}
          className={`px-3 py-1 rounded-md border bg-brand text-white`}
          aria-pressed="true"
          aria-busy="false"
        >
          Liked
        </button>
      ) : (
        <button
          onClick={like}
          disabled={disabled}
          className={`px-3 py-1 rounded-md border hover:bg-gray-50`}
          aria-pressed="false"
          aria-busy="false"
        >
          {state === 'loading' ? 'Liking...' : 'Like'}
        </button>
      )}
    </>
  );
}
