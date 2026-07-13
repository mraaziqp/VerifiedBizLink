'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { GlassBackground, glassInteractive } from '@/components/shared/glass-ui';

export default function BusinessProfilePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    description: '',
    industry: '',
    website: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    fetch('/api/business/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const biz = data?.business;
        if (biz) {
          setFormData({
            company_name: biz.company_name || '',
            description: biz.description || '',
            industry: biz.industry || '',
            website: biz.website || '',
            phone: biz.phone || '',
            address: biz.address || '',
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/business/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast({ title: 'Profile updated successfully!' });
      } else {
        toast({ title: 'Could not save changes', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not save changes', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
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

        <Card className="bg-slate-900/60 backdrop-blur-xl border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-slate-100">Edit Business Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
              </div>
            ) : (
              <>
                <div>
                  <Label className="text-slate-300 mb-2 block">Company Name</Label>
                  <Input
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Your company name"
                    className={`bg-slate-800/60 border-white/10 text-slate-100 placeholder-slate-500 ${glassInteractive}`}
                  />
                </div>

                <div>
                  <Label className="text-slate-300 mb-2 block">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Tell customers about your business"
                    rows={4}
                    className={`bg-slate-800/60 border-white/10 text-slate-100 placeholder-slate-500 ${glassInteractive}`}
                  />
                </div>

                <div>
                  <Label className="text-slate-300 mb-2 block">Industry</Label>
                  <Input
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="e.g., Technology, Retail, Services"
                    className={`bg-slate-800/60 border-white/10 text-slate-100 placeholder-slate-500 ${glassInteractive}`}
                  />
                </div>

                <div>
                  <Label className="text-slate-300 mb-2 block">Website</Label>
                  <Input
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://yourwebsite.com"
                    type="url"
                    className={`bg-slate-800/60 border-white/10 text-slate-100 placeholder-slate-500 ${glassInteractive}`}
                  />
                </div>

                <div>
                  <Label className="text-slate-300 mb-2 block">Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+27 (0) XXX XXX XXXX"
                    type="tel"
                    className={`bg-slate-800/60 border-white/10 text-slate-100 placeholder-slate-500 ${glassInteractive}`}
                  />
                </div>

                <div>
                  <Label className="text-slate-300 mb-2 block">Address</Label>
                  <Textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Your business address"
                    rows={3}
                    className={`bg-slate-800/60 border-white/10 text-slate-100 placeholder-slate-500 ${glassInteractive}`}
                  />
                </div>

                <div className="flex gap-2 pt-6">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className={`gap-2 bg-yellow-500 text-slate-950 hover:bg-yellow-400 font-bold ${glassInteractive}`}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                  </Button>
                  <Link href="/business/dashboard">
                    <Button variant="outline" className={`border-white/10 text-slate-300 hover:bg-white/5 ${glassInteractive}`}>
                      Cancel
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </GlassBackground>
  );
}
