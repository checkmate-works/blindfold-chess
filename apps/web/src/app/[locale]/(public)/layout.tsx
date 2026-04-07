import Script from 'next/script';

import { ADSENSE_PUBLISHER_ID } from '@/config';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {ADSENSE_PUBLISHER_ID && (
        <Script
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`}
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
      )}
      {children}
    </>
  );
}
