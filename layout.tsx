import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fly Sapa | Lệnh hoa hồng đại lý',
  description: 'Mini App nội bộ để tạo và theo dõi lệnh hoa hồng đại lý.',
  applicationName: 'Fly Sapa Commission',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#123f6a',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js?63" strategy="beforeInteractive" />
      </head>
      <body>{children}</body>
    </html>
  );
}
