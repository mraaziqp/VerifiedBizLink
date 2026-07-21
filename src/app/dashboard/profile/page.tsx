'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, MapPin, Link2, Edit, Save, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  fullName: string;
  email: string;
  headline: string;
  location: string;
  bio: string;
  phone: string;
  connectionsCount: number;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ headline: '', location: '', bio: '', phone: '' });

  useEffect(() => {
    fetch('/api/users/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setProfile(data);
        setForm({
          headline: data.headline || '',
          location: data.location || '',
          bio: data.bio || '',
          phone: data.phone || '',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setEditing(false);
        toast({ title: 'Profile updated' });
      } else {
        toast({ title: 'Could not save profile', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not save profile', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setForm({
        headline: profile.headline || '',
        location: profile.location || '',
        bio: profile.bio || '',
        phone: profile.phone || '',
      });
    }
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-yellow-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-20">
      {/* Navigation */}
      <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40 p-4">
        <Link href="/dashboard" className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Profile Header */}
        <Card className="bg-slate-800 border-slate-600">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-3xl font-bold text-slate-900">
                  {(profile?.fullName || user?.fullName || '?').slice(0, 1).toUpperCase()}
                </div>
              </div>

              {!editing ? (
                <div>
                  <h1 className="text-3xl font-bold text-white">{profile?.fullName || user?.fullName}</h1>
                  <p className="text-slate-300 mt-2">{profile?.headline || 'No headline yet'}</p>
                  {profile?.bio && <p className="text-slate-400 mt-2 text-sm">{profile.bio}</p>}
                </div>
              ) : (
                <div className="space-y-4 text-left">
                  <div>
                    <label className="text-slate-400 text-sm mb-1 block">Headline</label>
                    <Input
                      value={form.headline}
                      onChange={(e) => setForm({ ...form, headline: e.target.value })}
                      placeholder="e.g. Owner at Acme Corp"
                      className="bg-slate-700 text-white border-slate-600"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-sm mb-1 block">Bio</label>
                    <Textarea
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      placeholder="Tell people about yourself"
                      className="bg-slate-700 text-white border-slate-600"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 mt-8 pt-8 border-t border-slate-700">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{profile?.connectionsCount ?? 0}</p>
                <p className="text-slate-400 text-sm">Connections</p>
              </div>
            </div>

            {/* Edit Button */}
            <div className="flex gap-2 mt-8 justify-center">
              {!editing ? (
                <Button onClick={() => setEditing(true)} className="gap-2 bg-yellow-400 text-slate-900 hover:bg-yellow-300">
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button onClick={handleSave} disabled={saving} className="gap-2 bg-green-600 hover:bg-green-700">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save
                  </Button>
                  <Button onClick={handleCancel} variant="outline" className="gap-2 border-slate-600 text-slate-300">
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="bg-slate-800 border-slate-600">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-white">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {editing ? (
              <>
                <div>
                  <label className="text-slate-400 text-sm mb-2 block">Location</label>
                  <Input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="bg-slate-700 text-white border-slate-600"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-sm mb-2 block">Phone</label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="bg-slate-700 text-white border-slate-600"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-yellow-400" />
                  <div>
                    <p className="text-slate-400 text-sm">Email</p>
                    <p className="text-white">{profile?.email || user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-yellow-400" />
                  <div>
                    <p className="text-slate-400 text-sm">Location</p>
                    <p className="text-white">{profile?.location || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Link2 className="h-5 w-5 text-yellow-400" />
                  <div>
                    <p className="text-slate-400 text-sm">Phone</p>
                    <p className="text-white">{profile?.phone || 'Not set'}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
