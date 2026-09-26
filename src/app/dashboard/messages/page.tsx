import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { SubpageNav } from '@/components/layout/subpage-nav';
import { MessagingHub } from '@/components/messaging/messaging-hub';

export const metadata = { title: 'Messages — VerifiedBizLink' };

export default function MessagesPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <SubpageNav title="Messages" />
      <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>}>
        <MessagingHub />
      </Suspense>
    </div>
  );
}
