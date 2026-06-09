import type { Metadata } from 'next';
import './globals.css';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: 'Sekondment — Deploy Expertise, Not Headcount',
  description:
    'A trusted expertise marketplace. Engage verified experts, advisors and specialists through secure, milestone-based engagements.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolve the theme on the server from the persisted cookie (default: light).
  // Setting the class here means no inline <script> and no flash — and nothing
  // for browser extensions / dev proxies to collide with during hydration.
  const theme = (await cookies()).get('theme')?.value;
  const isDark = theme === 'dark';
  return (
    <html lang="en" className={isDark ? 'dark' : undefined} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
