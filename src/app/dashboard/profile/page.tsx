'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera, Mail, MapPin, Link2, Edit, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function ProfilePage() {
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: 'John Doe',
    bio: 'Building amazing things with VerifiedBizLink 🚀',
    email: 'john@example.com',
    location: 'Cape Town, South Africa',
    website: 'https://example.com',
    avatar: '👤',
  });

  const [tempProfile, setTempProfile] = useState(profile);

  const handleSave = () => {
    setProfile(tempProfile);
    setEditing(false);
  };

  const handleCancel = () => {
    setTempProfile(profile);
    setEditing(false);
  };

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
              {/* Avatar */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-5xl">
                    {profile.avatar}
                  </div>
                  {editing && (
                    <button className="absolute bottom-0 right-0 bg-yellow-400 text-slate-900 p-2 rounded-full hover:bg-yellow-300">
                      <Camera className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Name and Stats */}
              {!editing ? (
                <div>
                  <h1 className="text-3xl font-bold text-white">{profile.name}</h1>
                  <p className="text-slate-300 mt-2">{profile.bio}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Input
                    value={tempProfile.name}
                    onChange={(e) => setTempProfile({ ...tempProfile, name: e.target.value })}
                    placeholder="Name"
                    className="bg-slate-700 text-white border-slate-600"
                  />
                  <Textarea
                    value={tempProfile.bio}
                    onChange={(e) => setTempProfile({ ...tempProfile, bio: e.target.value })}
                    placeholder="Bio"
                    className="bg-slate-700 text-white border-slate-600"
                  />
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-slate-700">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">12</p>
                <p className="text-slate-400 text-sm">Posts</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">234</p>
                <p className="text-slate-400 text-sm">Followers</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">56</p>
                <p className="text-slate-400 text-sm">Following</p>
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
                  <Button onClick={handleSave} className="gap-2 bg-green-600 hover:bg-green-700">
                    <Save className="h-4 w-4" />
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
                  <label className="text-slate-400 text-sm mb-2 block">Email</label>
                  <Input
                    value={tempProfile.email}
                    onChange={(e) => setTempProfile({ ...tempProfile, email: e.target.value })}
                    className="bg-slate-700 text-white border-slate-600"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-sm mb-2 block">Location</label>
                  <Input
                    value={tempProfile.location}
                    onChange={(e) => setTempProfile({ ...tempProfile, location: e.target.value })}
                    className="bg-slate-700 text-white border-slate-600"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-sm mb-2 block">Website</label>
                  <Input
                    value={tempProfile.website}
                    onChange={(e) => setTempProfile({ ...tempProfile, website: e.target.value })}
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
                    <p className="text-white">{profile.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-yellow-400" />
                  <div>
                    <p className="text-slate-400 text-sm">Location</p>
                    <p className="text-white">{profile.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Link2 className="h-5 w-5 text-yellow-400" />
                  <div>
                    <p className="text-slate-400 text-sm">Website</p>
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-300">
                      {profile.website}
                    </a>
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
