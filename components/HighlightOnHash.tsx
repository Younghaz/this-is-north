'use client';

import { useEffect } from 'react';

export default function HighlightOnHash() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const highlight = () => {
      const id = window.location.hash?.slice(1); // e.g., "comment-123"
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.classList.add('comment-highlight');
      const t = setTimeout(() => el.classList.remove('comment-highlight'), 2000);
      return () => clearTimeout(t);
    };

    // Run now and on hash changes
    const cleanup = highlight();
    const onHash = () => highlight();
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener('hashchange', onHash);
      if (typeof cleanup === 'function') cleanup();
    };
  }, []);

  return null;
}