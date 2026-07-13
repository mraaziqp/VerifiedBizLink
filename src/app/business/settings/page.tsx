'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Bell, Eye, Lock, Shield } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { GlassBackground, glassInteractive } from '@/components/shared/glass-ui';

export default function BusinessSettingsPage() {
  const { toast } = useToast();
  const [visibility, setVisibility] = useState(true);
  const [notifications, setNotifications] = useState(true);

  const handleSave = () => {
    toast({ title: 'Preferences saved for this session' });
  };

  return (
    <GlassBackground>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href="/business/dashboard"
          className={`inline-flex items-center gap-2 text-yellow-500 hover:text-yellow-400 mb-6 rounded-lg ${glassInteractive}`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold text-slate-100 mb-8">Business Settings</h1>

        {/* Visibility Settings */}
        <Card className="mb-6 bg-slate-900/60 backdrop-blur-xl border-white/5 shadow-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-slate-100">Visibility</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-100">Public Profile</p>
                <p className="text-sm text-slate-400">Your business appears in search results and explore</p>
              </div>
              <input
                type="checkbox"
                checked={visibility}
                onChange={(e) => setVisibility(e.target.checked)}
                className={`w-4 h-4 rounded accent-yellow-500 ${glassInteractive}`}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="mb-6 bg-slate-900/60 backdrop-blur-xl border-white/5 shadow-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-slate-100">Notifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-100">Contact Requests</p>
                <p className="text-sm text-slate-400">Get notified when someone contacts you</p>
              </div>
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
                className={`w-4 h-4 rounded accent-yellow-500 ${glassInteractive}`}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="mb-6 bg-slate-900/60 backdrop-blur-xl border-white/5 shadow-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-slate-100">Security</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Link href="/forgot-password">
              <Button
                variant="outline"
                className={`w-full gap-2 border-white/10 text-slate-300 hover:bg-white/5 ${glassInteractive}`}
              >
                <Lock className="h-4 w-4" />
                Change Password
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          className={`w-full bg-yellow-500 text-slate-950 hover:bg-yellow-400 font-bold ${glassInteractive}`}
        >
          Save Settings
        </Button>
      </div>
    </GlassBackground>
  );
}
