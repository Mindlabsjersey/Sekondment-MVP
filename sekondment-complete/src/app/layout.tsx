import type { Metadata } from 'next';
import './globals.css';
import { themeInitScript } from '@/components/ThemeToggle';

export const metadata: Metadata = {
  title: 'Sekondment — Deploy Expertise, Not Headcount',
  description:
    'A trusted expertise marketplace. Engage verified experts, advisors and specialists through secure, milestone-based engagements.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
