import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/auth-context';
import { MobileNav } from '@/components/layout/mobile-nav';
import { AdBanner } from '@/components/ads/ad-banner';
import { ChatWidget } from '@/components/chatbot/chat-widget';

export const metadata: Metadata = {
  title: 'VerifiedBizLink | Trusted B2B Networking',
  description: 'Verified business networking for professionals and vetted companies.',
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
      <body className="font-body antialiased bg-background text-foreground">
        <AuthProvider>
          <div className="pb-16 md:pb-0">
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
