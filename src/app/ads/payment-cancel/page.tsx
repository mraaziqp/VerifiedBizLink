'use client';

import Link from 'next/link';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="bg-slate-800 border-slate-600 max-w-md w-full">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-red-500/20 p-4 rounded-full">
              <AlertCircle className="h-12 w-12 text-red-400" />
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Payment Cancelled</h1>
            <p className="text-slate-300">Your payment was cancelled — you were not charged.</p>
          </div>

          <div className="bg-slate-700 rounded-lg p-4 space-y-2">
            <p className="text-slate-400 text-sm">If you experienced any issues or need assistance, please contact our support team.</p>
            <p className="text-slate-500 text-xs">No charges have been made to your account.</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Link href="/business/ads" className="flex-1">
              <Button className="w-full gap-2 bg-yellow-400 text-slate-900 hover:bg-yellow-300">
                Back to Ads
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/business/dashboard" className="flex-1">
              <Button variant="outline" className="w-full border-slate-600 text-slate-300">
                Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
