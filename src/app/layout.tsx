import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/auth-context';
import { MobileNav } from '@/components/layout/mobile-nav';
import { AdBanner } from '@/components/ads/ad-banner';
import { ChatWidget } from '@/components/chatbot/chat-widget';
import { EmailVerificationBanner } from '@/components/ui/email-verification-banner';

export const metadata: Metadata = {
  title: 'VerifiedBizLink | Connecting You to Trusted Businesses',
  description: 'Find and connect with verified local businesses. CIPC and SARS verified. Your trusted business marketplace.',
  applicationName: 'VerifiedBizLink',
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
  themeColor: '#FCC200',
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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground overflow-x-hidden">
        <AuthProvider>
          <EmailVerificationBanner />
          <div className="pb-20 lg:pb-0">
            {children}
          </div>
          <MobileNav />
          <AdBanner />
          <ChatWidget />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
