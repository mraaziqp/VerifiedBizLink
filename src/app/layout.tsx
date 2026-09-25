import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/auth-context';
import { MobileMenuProvider } from '@/contexts/mobile-menu-context';
import { MobileNav } from '@/components/layout/mobile-nav';
import { MobileMenuDrawer } from '@/components/layout/mobile-menu-drawer';
import { AdBanner } from '@/components/ads/ad-banner';
import { ChatWidget } from '@/components/chatbot/chat-widget';
import MessagesWidget from '@/components/chat/chat-widget';
import { EmailVerificationBanner } from '@/components/ui/email-verification-banner';
import { ServiceWorkerRegister } from '@/components/pwa/sw-register';
import { PwaInstallPrompt } from '@/components/pwa/install-prompt';

// Self-hosted by Next at build time: no render-blocking request to Google
// Fonts on every page load, and no layout shift while the font swaps in.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
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
            <ServiceWorkerRegister />
            <EmailVerificationBanner />
            <PwaInstallPrompt />
            <MobileMenuDrawer />
            <div className="pb-20 lg:pb-0">
              {children}
            </div>
            <MobileNav />
            <AdBanner />
            <MessagesWidget />
            <ChatWidget />
            <Toaster />
          </MobileMenuProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
