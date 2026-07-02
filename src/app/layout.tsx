import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: 'EduAR — Educational AR Projection Platform',
  description:
    'Bring history, science, and nature to life with AI-powered AR characters projected into real classrooms, museums, and stages.',
  keywords: 'educational AR, augmented reality, classroom, AI characters, historical figures, animals',
  openGraph: {
    title: 'EduAR — Educational AR Projection Platform',
    description: 'Interactive AI-powered AR characters for immersive education',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>{children}</body>
    </html>
  );
}
