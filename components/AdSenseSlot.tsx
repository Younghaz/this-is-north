'use client';

import React, { useEffect } from 'react';

declare global { interface Window { adsbygoogle?: unknown[] } }

type Props = {
  slot: string;
  className?: string;
  style?: React.CSSProperties;
  layout?: string;
  format?: string;
};

export default function AdSenseSlot({ slot, className, style, layout, format }: Props) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // ignore rendering errors locally
    }
  }, []);

  if (!client) return null; // hide if AdSense client not set yet

  return (
    <ins
      className={`adsbygoogle ${className ?? ''}`}
      style={style ?? { display: 'block' }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={format ?? 'auto'}
      data-ad-layout={layout}
    />
  );
}