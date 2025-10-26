'use client';

import { useEffect } from 'react';
import { getAnonDeviceId, shouldSendView, markViewSent } from '@/lib/device-id';

export default function ViewTracker({ articleId }: { articleId: number }) {
  useEffect(() => {
    if (!articleId || typeof window === 'undefined') return;

    const trySend = async () => {
      if (!shouldSendView(articleId, 6)) return; // send at most once per 6h per device
      const anonDeviceId = getAnonDeviceId();
      try {
        await fetch('/api/views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleId, anonDeviceId }),
          keepalive: true, // allow during unload
        });
      } finally {
        markViewSent(articleId);
      }
    };

    // After first paint to avoid blocking render
    const id = window.requestIdleCallback ? window.requestIdleCallback(trySend) : window.setTimeout(trySend, 0);
    return () => {
      if (typeof id === 'number') window.clearTimeout(id);
  else if (id && 'cancelIdleCallback' in window) (window as unknown as { cancelIdleCallback: (handle: number) => void }).cancelIdleCallback(id);
    };
  }, [articleId]);

  return null;
}