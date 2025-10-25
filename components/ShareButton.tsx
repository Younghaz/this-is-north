'use client';

import { useState } from 'react';

type ShareButtonProps = {
  slug: string;
  title: string;
  excerpt?: string | null;
  className?: string;
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
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = buildUrl(slug);
  const shareText = excerpt
    ? `${title}\n\n${excerpt}\n\n${url}`
    : `${title}\n\n${url}`;

  async function nativeShare() {
    try {
      if ('share' in navigator && typeof navigator.share === 'function') {
        await navigator.share({ title, text: excerpt || title, url });
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
    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg p-2 z-20 w-60 shadow-lg text-sm">
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={copyLink}
          className={`text-left px-2 py-1 rounded ${copied ? 'bg-green-100' : ''}`}
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="no-underline px-2 py-1 rounded"
        >
          Share on X (Twitter)
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="no-underline px-2 py-1 rounded"
        >
          Share on Facebook
        </a>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="no-underline px-2 py-1 rounded"
        >
          Share on WhatsApp
        </a>
        <a
          href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="no-underline px-2 py-1 rounded"
        >
          Share on Telegram
        </a>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-left px-2 py-1 rounded"
        >
          Close
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className={`relative inline-block ${className ?? ''}`}>
      <button
        type="button"
        onClick={nativeShare}
        onContextMenu={(e) => {
          e.preventDefault();
          toggle();
        }}
        className={`px-2 py-1 border border-gray-300 rounded-lg bg-white text-sm cursor-pointer`}
        aria-haspopup="true"
        aria-expanded="true"
      >
        Share
      </button>
      {panel}
    </div>
  );
}