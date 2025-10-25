// no 'use client' here
import './globals.css';
import OneSignalLoader from '../components/OneSignalLoader';
import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import SiteNav from '../components/SiteNav';
import AuthStatus from '@/components/AuthStatus';
import ClientRootProvider from '@/components/ClientRootProvider';
import { ThemeProvider } from '@/components/ThemeContext';

export const metadata: Metadata = {
  title: 'This is North',
  description: 'Northern Nigeria news in English and Hausa',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  const adsClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900">
        <OneSignalLoader />
        <ThemeProvider>
          <ClientRootProvider>
            {/* ✅ Google Analytics */}
            {gaId ? (
              <>
                <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
                <Script id="ga-setup" strategy="afterInteractive">
                  {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${gaId}');
                  `}
                </Script>
              </>
            ) : null}

            {/* ✅ Google AdSense */}
            {adsClient ? (
              <Script
                id="adsbygoogle-init"
                strategy="afterInteractive"
                src={`https://pagead2.googlesyndication.com/pagead/js?client=${adsClient}`}
                crossOrigin="anonymous"
              />
            ) : null}

            {/* ✅ Site header */}
            <header className="max-w-5xl mx-auto px-4 py-4" style={{ position: 'relative' }}>
              {/* AuthStatus absolutely top right */}
              <div style={{ position: 'absolute', top: 0, right: 0, margin: '12px 24px 0 0', zIndex: 10 }}>
                <AuthStatus />
              </div>
              {/* Logo */}
              <div className="flex items-center mb-2">
                <Link href="/" className="text-2xl font-semibold text-brand">This is North</Link>
              </div>
              <SiteNav />
              <hr className="my-4" />
            </header>

            {/* ✅ Main content */}
            <main className="max-w-5xl mx-auto px-4 pb-8">
              {children}
            </main>
          </ClientRootProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
