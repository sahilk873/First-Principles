import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'First Principles - Spine Surgery Review Platform',
  description:
    'A secure platform where clinicians submit spine surgery cases for blinded expert review. Expert reviewers score the appropriateness of proposed procedures.',
  keywords: ['spine surgery', 'medical review', 'healthcare', 'expert review', 'appropriateness'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Instrument+Sans:ital,wght@0,400..700;1,400..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-slate-50 antialiased">{children}</body>
    </html>
  );
}
