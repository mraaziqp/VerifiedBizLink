import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/auth-context';
import { MobileMenuProvider } from '@/contexts/mobile-menu-context';
import { MobileNav } from '@/components/layout/mobile-nav';
import { DeferredTopBanners, DeferredWidgets } from '@/components/layout/deferred-widgets';
import { CANONICAL_ORIGIN } from '@/lib/site-url';
import { ServiceWorkerRegister } from '@/components/pwa/sw-register';
import { PwaInstallPrompt } from '@/components/pwa/install-prompt';
import { SwitchedAccountBanner } from '@/components/auth/account-switcher';

// Self-hosted by Next at build time: no render-blocking request to Google
// Fonts on every page load, and no layout shift while the font swaps in.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  // Without this, any relative address in a page's metadata (a link-preview
  // image, a canonical link) is resolved against localhost at build time.
  metadataBase: new URL(CANONICAL_ORIGIN),
  title: 'VerifiedBizLink | Connecting You to Trusted Businesses',
  description: 'Find and connect with verified local businesses. CIPC and SARS verified. Your trusted business marketplace.',
  applicationName: 'VerifiedBizLink',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VerifiedBizLink',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  // Required for env(safe-area-inset-*) to resolve to real values on notched
  // iPhones — without this, the bottom nav's safe-area padding is always 0.
  viewportFit: 'cover',
  themeColor: '#FCC200',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-body antialiased bg-background text-foreground overflow-x-hidden">
        <AuthProvider>
          <MobileMenuProvider>
            {/* Only while the developer account is switched into another one. */}
            <SwitchedAccountBanner />
            <ServiceWorkerRegister />
            <DeferredTopBanners />
            {/* Stays in the first load: it has to be listening when the
                browser announces that the app can be installed. */}
            <PwaInstallPrompt />
            <div className="pb-20 lg:pb-0">
              {children}
            </div>
            <MobileNav />
            {/* Menu drawer, ad slot, messages bubble and assistant: loaded
                once the page is idle or at the first tap. */}
            <DeferredWidgets />
            <Toaster />
          </MobileMenuProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
