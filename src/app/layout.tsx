// ============================================================
// SECTION: Frontend — Root Layout
// PURPOSE: Global app shell, fonts, and metadata
// MODIFY: Change fonts, title, or global UI wrapper here
// ============================================================

import React from 'react';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import '../styles/globals.css';
import { AuthProvider } from '@/components/AuthProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });

export const metadata: Metadata = {
  title: 'AI Code Review Copilot',
  description: 'Enterprise-grade automated code review powered by generative AI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <AuthProvider>
          <main className="container" style={{ padding: '40px 24px' }}>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
