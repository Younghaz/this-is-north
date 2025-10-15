'use client';

import { useState } from 'react';

type ShareButtonProps = {
  slug: string;
  title: string;
  excerpt?: string | null;
  className?: string;
  variant?: 'inline' | 'icon';
};

function buildUrl(slug: string) {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    return `${origin}/article/${slug}`;
  }
  // SSR fallback – relative path (will be resolved client-side)
  return `/article/${slug}`;
}

export default function ShareButton({
  slug,
  title,
  excerpt,
  className,
  variant = 'inline',
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = buildUrl(slug);
  const shareText = excerpt
    ? `${title}\n\n${excerpt}\n\n${url}`
    : `${title}\n\n${url}`;

  async function nativeShare() {
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title, text: excerpt || title, url });
        return;
      }
      toggle();
    } catch {
      // fall back to custom panel
      toggle();
    }
  }

  function toggle() {
    setOpen((o) => !o);
    setCopied(false);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      alert('Unable to copy link. Please copy manually: ' + url);
    }
  }

  const panel = open ? (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: 4,
        background: '#fff',
        border: '1px solid #ccc',
        borderRadius: 6,
        padding: 8,
        zIndex: 20,
        width: 240,
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        fontSize: 13,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          type="button"
            onClick={copyLink}
            style={{ textAlign: 'left', padding: '4px 6px', borderRadius: 4, background: copied ? '#e6ffe6' : 'transparent' }}
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none', padding: '4px 6px', borderRadius: 4 }}
        >
          Share on X (Twitter)
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none', padding: '4px 6px', borderRadius: 4 }}
        >
          Share on Facebook
        </a>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none', padding: '4px 6px', borderRadius: 4 }}
        >
          Share on WhatsApp
        </a>
        <a
          href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none', padding: '4px 6px', borderRadius: 4 }}
        >
          Share on Telegram
        </a>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{ textAlign: 'left', padding: '4px 6px', borderRadius: 4 }}
        >
          Close
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} className={className}>
      <button
        type="button"
        onClick={nativeShare}
        onContextMenu={(e) => {
          e.preventDefault();
          toggle();
        }}
        style={{
          padding: variant === 'inline' ? '4px 10px' : '4px 6px',
          border: '1px solid #ccc',
          borderRadius: 6,
          background: '#fff',
          fontSize: 13,
          cursor: 'pointer',
        }}
        aria-haspopup="true"
        aria-expanded={open}
      >
        Share
      </button>
      {panel}
    </div>
  );
}