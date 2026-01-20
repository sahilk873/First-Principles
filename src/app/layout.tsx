import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'First Principles - Healthcare Decision Intelligence',
  description:
    'A scalable, data-driven decision-intelligence system for healthcare. Clean, precise, and intelligent clinical review platform.',
  keywords: ['healthcare intelligence', 'clinical decision support', 'medical review', 'data-driven healthcare', 'expert review'],
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
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#F7F9FB] antialiased">{children}</body>
    </html>
  );
}
