import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'VibeCart — AI Room Shopping', template: '%s | VibeCart' },
  description:
    'Upload a photo of your room and instantly find matching furniture from top stores using AI vision.',
  keywords: ['furniture', 'AI shopping', 'room design', 'interior', 'AR preview'],
  authors: [{ name: 'VibeCart' }],
  openGraph: {
    type: 'website',
    siteName: 'VibeCart',
    title: 'VibeCart — AI Room Shopping',
    description: 'Snap your room. Find your furniture.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#7C3AED',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        {/* Global nav */}
        <header className="fixed inset-x-0 top-0 z-50 border-b border-neutral-800/60 bg-neutral-950/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <a href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
              <span className="text-2xl">🛋️</span>
              <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                VibeCart
              </span>
            </a>
            <nav className="flex items-center gap-6 text-sm font-medium text-neutral-400">
              <a href="/" className="hover:text-neutral-100 transition-colors">Home</a>
              <a href="/results" className="hover:text-neutral-100 transition-colors">
                My Results
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-violet-600 px-4 py-1.5 text-white hover:bg-violet-500 transition-colors"
              >
                GitHub
              </a>
            </nav>
          </div>
        </header>
        <main className="pt-16">{children}</main>
        <footer className="mt-24 border-t border-neutral-800 py-8 text-center text-sm text-neutral-500">
          © {new Date().getFullYear()} VibeCart. Powered by AI Vision + Stripe.
        </footer>
      </body>
    </html>
  );
}
