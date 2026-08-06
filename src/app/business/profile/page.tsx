'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Loader2, Facebook, Instagram, Linkedin, Youtube, MessageCircle, X, Plus } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { GlassBackground, glassInteractive } from '@/components/shared/glass-ui';
import { ImageUploader } from '@/components/media/image-uploader';
import { BUSINESS_CATEGORIES } from '@/lib/categories';

const SOCIAL_PLATFORMS: { key: string; label: string; placeholder: string; icon: any }[] = [
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourbusiness', icon: Facebook },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourbusiness', icon: Instagram },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/yourbusiness', icon: Linkedin },
  { key: 'twitter', label: 'X (Twitter)', placeholder: 'https://x.com/yourbusiness', icon: MessageCircle },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@yourbusiness', icon: MessageCircle },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@yourbusiness', icon: Youtube },
  { key: 'whatsapp', label: 'WhatsApp Business', placeholder: '+27 XX XXX XXXX', icon: MessageCircle },
];

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
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [tagline, setTagline] = useState('');
  const [highlights, setHighlights] = useState<string[]>([]);
  const [newHighlight, setNewHighlight] = useState('');

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
          const links = typeof biz.social_links === 'string' ? JSON.parse(biz.social_links || '{}') : (biz.social_links || {});
          setSocialLinks(links);
          setCoverImageUrl(biz.cover_image_url || '');
          setTagline(biz.tagline || '');
          const h = typeof biz.highlights === 'string' ? JSON.parse(biz.highlights || '[]') : (biz.highlights || []);
          setHighlights(h);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addHighlight = () => {
    const text = newHighlight.trim();
    if (!text || highlights.length >= 6) return;
    setHighlights([...highlights, text]);
    setNewHighlight('');
  };

  const removeHighlight = (index: number) => {
    setHighlights(highlights.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/business/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          social_links: socialLinks,
          cover_image_url: coverImageUrl,
          tagline,
          highlights,
        }),
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
          className={`inline-flex items-center gap-2 text-yellow-500 hover:text-yellow-600 mb-6 rounded-lg ${glassInteractive}`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <Card className="bg-white/80 backdrop-blur-xl border-gray-200 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-gray-900">Edit Business Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
              </div>
            ) : (
              <>
                <div>
                  <Label className="text-gray-600 mb-2 block">Cover Photo</Label>
                  <p className="text-sm text-slate-500 mb-3">Shown as a banner at the top of your public profile.</p>
                  {coverImageUrl && (
                    <div className="mb-3 rounded-xl overflow-hidden border border-gray-200 aspect-[3/1] bg-gray-100">
                      <img src={coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <ImageUploader
                      onImageSelect={(url) => setCoverImageUrl(url)}
                      onUploadStateChange={setCoverUploading}
                      buttonClassName="border border-gray-200 bg-gray-100 text-gray-600 hover:text-yellow-500"
                    />
                    {coverUploading && (
                      <span className="text-xs text-slate-500">Uploading — don&apos;t save yet…</span>
                    )}
                    {coverImageUrl && (
                      <button
                        onClick={() => setCoverImageUrl('')}
                        className={`text-sm text-red-400 hover:text-red-700 ${glassInteractive}`}
                      >
                        Remove cover photo
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-gray-600 mb-2 block">Tagline</Label>
                  <Input
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="A short line under your name — e.g. Trusted electrical contractors since 2010"
                    maxLength={100}
                    className={`bg-white border-gray-300 text-gray-900 placeholder-gray-400 ${glassInteractive}`}
                  />
                </div>

                <div>
                  <Label className="text-gray-600 mb-2 block">Company Name</Label>
                  <Input
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Your company name"
                    className={`bg-white border-gray-300 text-gray-900 placeholder-gray-400 ${glassInteractive}`}
                  />
                </div>

                <div>
                  <Label className="text-gray-600 mb-2 block">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Tell customers about your business"
                    rows={4}
                    className={`bg-white border-gray-300 text-gray-900 placeholder-gray-400 ${glassInteractive}`}
                  />
                </div>

                <div>
                  <Label className="text-gray-600 mb-2 block">Industry</Label>
                  <select
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className={`w-full h-10 rounded-md bg-white border border-gray-300 text-gray-900 px-3 ${glassInteractive}`}
                  >
                    <option value="">Select an industry</option>
                    {formData.industry && !BUSINESS_CATEGORIES.includes(formData.industry) && (
                      <option value={formData.industry}>{formData.industry}</option>
                    )}
                    {BUSINESS_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Matching a category exactly makes your business easier to find on the home page and Explore.
                  </p>
                </div>

                <div>
                  <Label className="text-gray-600 mb-2 block">Website</Label>
                  <Input
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://yourwebsite.com"
                    type="url"
                    className={`bg-white border-gray-300 text-gray-900 placeholder-gray-400 ${glassInteractive}`}
                  />
                </div>

                <div>
                  <Label className="text-gray-600 mb-2 block">Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+27 (0) XXX XXX XXXX"
                    type="tel"
                    className={`bg-white border-gray-300 text-gray-900 placeholder-gray-400 ${glassInteractive}`}
                  />
                </div>

                <div>
                  <Label className="text-gray-600 mb-2 block">Address</Label>
                  <Textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Your business address"
                    rows={3}
                    className={`bg-white border-gray-300 text-gray-900 placeholder-gray-400 ${glassInteractive}`}
                  />
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <h3 className="text-gray-900 font-semibold mb-1 mt-6">Highlights</h3>
                  <p className="text-sm text-slate-500 mb-4">Up to 6 short bullet points — what makes your business worth choosing. Shown on your public profile.</p>
                  <div className="space-y-2 mb-3">
                    {highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2">
                        <span className="flex-1 text-sm text-gray-700">{h}</span>
                        <button onClick={() => removeHighlight(i)} className={`text-slate-500 hover:text-red-400 ${glassInteractive}`}>
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {highlights.length < 6 && (
                    <div className="flex gap-2">
                      <Input
                        value={newHighlight}
                        onChange={(e) => setNewHighlight(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHighlight(); } }}
                        placeholder="e.g. Same-day quotes, 15 years experience"
                        maxLength={80}
                        className={`bg-white border-gray-300 text-gray-900 placeholder-gray-400 ${glassInteractive}`}
                      />
                      <Button type="button" onClick={addHighlight} variant="outline" className={`border-gray-200 text-gray-600 hover:bg-gray-100 shrink-0 ${glassInteractive}`}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <h3 className="text-gray-900 font-semibold mb-1 mt-6">Social Media</h3>
                  <p className="text-sm text-slate-500 mb-4">Add your social pages — they&apos;ll show as icons on your public business profile.</p>
                  <div className="space-y-4">
                    {SOCIAL_PLATFORMS.map(({ key, label, placeholder, icon: Icon }) => (
                      <div key={key}>
                        <Label className="text-gray-600 mb-2 flex items-center gap-2">
                          <Icon className="h-4 w-4 text-yellow-500" />
                          {label}
                        </Label>
                        <Input
                          value={socialLinks[key] || ''}
                          onChange={(e) => setSocialLinks({ ...socialLinks, [key]: e.target.value })}
                          placeholder={placeholder}
                          className={`bg-white border-gray-300 text-gray-900 placeholder-gray-400 ${glassInteractive}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-6">
                  <Button
                    onClick={handleSave}
                    disabled={saving || coverUploading}
                    title={coverUploading ? 'Wait for the cover photo to finish uploading' : undefined}
                    className={`gap-2 bg-yellow-500 text-slate-950 hover:bg-yellow-400 font-bold ${glassInteractive}`}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {coverUploading ? 'Uploading photo…' : 'Save Changes'}
                  </Button>
                  <Link href="/business/dashboard">
                    <Button variant="outline" className={`border-gray-200 text-gray-600 hover:bg-gray-100 ${glassInteractive}`}>
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
