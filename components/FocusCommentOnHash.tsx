'use client';

import { useEffect } from 'react';

export default function FocusCommentOnHash({ textareaId = 'comment-input' }: { textareaId?: string }) {
  useEffect(() => {
    const doFocus = () => {
      if (typeof window === 'undefined') return;
      const wants = window.location.hash === '#comments' || new URLSearchParams(window.location.search).has('comment');
      if (!wants) return;
      const el = document.getElementById(textareaId) as HTMLTextAreaElement | null;
      if (el) {
        el.focus();
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    };
    // Focus now and also if hash changes
    doFocus();
    const onHash = () => doFocus();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [textareaId]);

  return null;
}