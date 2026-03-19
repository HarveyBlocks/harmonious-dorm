import type { Metadata } from 'next';

import { Providers } from '@/components/providers';

import './globals.css';
import React from "react";

export const metadata: Metadata = {
  title: 'Harmonious Dorm',
  description: 'Dorm collaboration platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div
          className="hidden dark-mode study-mode party-mode wallet-total-card sleep-depth-near light-tooltip accent-border app-toast-error app-toast-success app-toast-info"
          aria-hidden="true"
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
