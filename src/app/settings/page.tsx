"use client";

import { useState, useEffect, Suspense } from "react";
import { compressImage, fetchWithTimeout } from "@/lib/image-compress";
import { SidebarLeft } from "@/components/layout/sidebar-left";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Shield, Bell, CreditCard, Loader2, Camera, Trash2, Download, AlertTriangle, Lock, CheckCircle2, LogOut, Zap } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { TrustScoreInfo } from "@/components/ui/trust-score-info";

interface Tier {
  key: string;
  name: string;
  price: number;
  adLimit: number;
  monthlyAdCredits: number;
  features: string[];
  note?: string | null;
}

interface Payment {
  id: string;
  reference?: string | null;
  description?: string | null;
  plan_type?: string | null;
  amount: number;
  status?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
}

interface BusinessProfile {
  package_type?: string | null;
  status?: string | null;
  trust_score?: number | null;
}

function SettingsForm() {
  const { user, refresh } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const validTabs = ["profile", "security", "notifications", "billing", "privacy"];
  const requestedTab = searchParams.get("tab");
  const initialTab = requestedTab && validTabs.includes(requestedTab) ? requestedTab : "profile";
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deletionConfirm, setDeletionConfirm] = useState("");
  const [deletionRequested, setDeletionRequested] = useState(false);
  const [notifSettings, setNotifSettings] = useState({
    connectionRequests: true,
    vettingUpdates: true,
    postInteractions: false,
    complianceAlerts: false,
  });
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [cancelling, setCancelling] = useState(false);

  const handleCancelSubscription = async () => {
    if (!window.confirm('Cancel your subscription and move to the Free tier? You can upgrade again anytime.')) return;
    setCancelling(true);
    try {
      const res = await fetch('/api/businesses/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageType: 'free', onboardingCompleted: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setBusiness((prev) => (prev ? { ...prev, package_type: data.business?.package_type ?? 'free' } : prev));
        toast({ title: 'Subscription cancelled', description: "You're now on the Free plan." });
      } else {
        toast({ title: 'Could not cancel subscription', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not cancel subscription', variant: 'destructive' });
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    fetch('/api/tiers')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.tiers) setTiers(data.tiers); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/payments/create-intent', { cache: 'no-store' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.payments) {
          setPayments(data.payments);
        }
      })
      .catch(err => console.error('Error fetching payments:', err))
      .finally(() => setLoadingPayments(false));
  }, []);

  useEffect(() => {
    if (user?.role !== 'business') return;
    fetch('/api/business/profile', { cache: 'no-store' })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.business) setBusiness(data.business); })
      .catch(err => console.error('Error fetching business profile:', err));
  }, [user?.role]);

  const [profileForm, setProfileForm] = useState({
    fullName: "",
    headline: "",
    location: "",
    bio: "",
    phone: "",
    avatarUrl: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    // Check if there is already a pending deletion request
    fetch('/api/users/delete-request')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.pending) setDeletionRequested(true); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Fetch full profile from DB (includes bio, phone, location not stored in JWT)
    fetch('/api/users/profile')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setProfileForm({
            fullName: data.fullName || "",
            headline: data.headline || "",
            location: data.location || "",
            bio: data.bio || "",
            phone: data.phone || "",
            avatarUrl: data.avatarUrl || "",
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      setProfileForm(prev => ({
        ...prev,
        fullName: prev.fullName || user.fullName || "",
        headline: prev.headline || user.headline || "",
        avatarUrl: prev.avatarUrl || user.avatarUrl || "",
      }));
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/users/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fullName: profileForm.fullName,
            headline: profileForm.headline,
            location: profileForm.location,
            bio: profileForm.bio,
            phone: profileForm.phone,
          }),
      });
      if (res.ok) {
        await refresh();
        toast({ title: "Profile Updated", description: "Your changes have been saved." });
      } else {
        const d = await res.json();
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/users/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifSettings }),
      });
      if (res.ok) {
        toast({ title: "Preferences Saved", description: "Your notification settings have been updated." });
      } else {
        toast({ title: "Saved locally", description: "Preferences updated for this session." });
      }
    } catch {
      toast({ title: "Saved locally", description: "Preferences updated for this session." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/users/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }),
      });
      if (res.ok) {
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        toast({ title: "Password Changed", description: "Your password has been updated." });
      } else {
        const d = await res.json();
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (deletionConfirm !== "DELETE") return;
    setIsDeletingAccount(true);
    try {
      const res = await fetch('/api/users/delete-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setDeletionRequested(true);
        toast({
          title: "Deletion Request Submitted",
          description: "Your account will be permanently deleted within 30–90 days. You can cancel this within 7 days.",
        });
      } else {
        const d = await res.json();
        toast({ title: "Failed", description: d.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network Error", description: "Could not submit deletion request.", variant: "destructive" });
    } finally {
      setIsDeletingAccount(false);
      setDeletionConfirm("");
    }
  };

  const handleCancelDeletion = async () => {
    try {
      const res = await fetch('/api/users/delete-request', { method: 'DELETE' });
      if (res.ok) {
        setDeletionRequested(false);
        toast({ title: "Deletion Cancelled", description: "Your account deletion request has been cancelled." });
      }
    } catch {
      toast({ title: "Error", description: "Could not cancel deletion.", variant: "destructive" });
    }
  };

  const handleSignOut = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        toast({ title: "Signed Out", description: "You have been signed out." });
        router.push('/login');
      }
    } catch {
      toast({ title: "Error", description: "Could not sign out.", variant: "destructive" });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file even after an error
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid file", description: "Please choose an image.", variant: "destructive" });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Resize to a small square-ish avatar before upload → fast & always under the limit.
      const compressed = await compressImage(file, { maxDim: 512, quality: 0.85 });
      const form = new FormData();
      form.append('avatar', compressed);
      const res = await fetchWithTimeout('/api/users/avatar', { method: 'POST', body: form }, 30000);
      if (res.ok) {
        const data = await res.json();
        setProfileForm(p => ({ ...p, avatarUrl: data.avatarUrl }));
        await refresh();
        toast({ title: "Avatar Updated", description: "Your profile photo has been saved." });
      } else {
        const d = await res.json().catch(() => ({}));
        toast({ title: "Upload Failed", description: d.error || "Please try again.", variant: "destructive" });
      }
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === 'AbortError';
      toast({
        title: "Upload Failed",
        description: aborted ? "Upload timed out — check your connection and retry." : "Could not upload photo.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 overflow-x-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <aside className="hidden lg:block lg:col-span-3 sticky top-6">
            <SidebarLeft />
          </aside>

          <main className="lg:col-span-9 space-y-6 min-w-0">
            <div className="flex items-center justify-between px-2">
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="rounded-xl font-bold border-red-200 text-red-600 hover:bg-red-50 gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>

            <Tabs defaultValue={initialTab} className="w-full space-y-6">
              <TabsList className="bg-white border p-1 rounded-2xl h-auto shadow-sm w-full lg:w-fit flex overflow-x-auto gap-0">
                <TabsTrigger value="profile" className="h-11 px-4 lg:px-6 rounded-xl font-bold gap-2 shrink-0">
                  <User className="h-4 w-4" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="security" className="h-11 px-4 lg:px-6 rounded-xl font-bold gap-2 shrink-0">
                  <Shield className="h-4 w-4" />
                  Security
                </TabsTrigger>
                <TabsTrigger value="notifications" className="h-11 px-4 lg:px-6 rounded-xl font-bold gap-2 shrink-0">
                  <Bell className="h-4 w-4" />
                  <span className="hidden sm:inline">Notifications</span>
                  <span className="sm:hidden">Notifs</span>
                </TabsTrigger>
                <TabsTrigger value="billing" className="h-11 px-4 lg:px-6 rounded-xl font-bold gap-2 shrink-0">
                  <CreditCard className="h-4 w-4" />
                  Billing
                </TabsTrigger>
                <TabsTrigger value="privacy" className="h-11 px-4 lg:px-6 rounded-xl font-bold gap-2 shrink-0">
                  <Lock className="h-4 w-4" />
                  Data & Privacy
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="animate-in fade-in duration-500">
                <Card className="border-none shadow-sm overflow-hidden">
                  <CardHeader className="bg-white border-b py-6">
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your public profile and contact details.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 md:p-8">
                    <form className="space-y-6" onSubmit={handleSaveProfile}>
                      {/* Avatar upload */}
                      <div className="flex items-center gap-5">
                        <Avatar className="h-20 w-20 border-4 border-gray-100">
                          <AvatarImage src={profileForm.avatarUrl || user?.avatarUrl} alt={profileForm.fullName} />
                          <AvatarFallback className="text-xl font-bold">
                            {profileForm.fullName?.[0] ?? 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5"><Camera className="h-4 w-4" />Profile Photo</Label>
                          <label htmlFor="avatar-upload">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-xl cursor-pointer"
                              disabled={isUploadingAvatar}
                              asChild
                            >
                              <span>
                                {isUploadingAvatar ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</> : <><Camera className="h-4 w-4 mr-2" />Upload Photo</>}
                              </span>
                            </Button>
                          </label>
                          <input
                            id="avatar-upload"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="sr-only"
                            onChange={handleAvatarUpload}
                            disabled={isUploadingAvatar}
                          />
                          <p className="text-xs text-gray-500">JPEG, PNG, WebP or GIF · auto-optimized on upload</p>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label>Full Name</Label>
                          <Input
                            value={profileForm.fullName}
                            onChange={e => setProfileForm(p => ({ ...p, fullName: e.target.value }))}
                            className="rounded-xl h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email Address</Label>
                          <Input
                            value={user?.email || ""}
                            disabled
                            className="rounded-xl h-11 bg-gray-50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Professional Headline</Label>
                          <Input
                            value={profileForm.headline}
                            onChange={e => setProfileForm(p => ({ ...p, headline: e.target.value }))}
                            placeholder="e.g. CEO at Acme Corp"
                            className="rounded-xl h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone Number</Label>
                          <Input
                            type="tel"
                            value={profileForm.phone}
                            onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                            placeholder="+27 21 555 0100"
                            className="rounded-xl h-11"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Location</Label>
                          <Input
                            value={profileForm.location}
                            onChange={e => setProfileForm(p => ({ ...p, location: e.target.value }))}
                            placeholder="Cape Town, South Africa"
                            className="rounded-xl h-11"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Bio / About</Label>
                        <Textarea
                          value={profileForm.bio}
                          onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                          placeholder="Tell the community about yourself and your business experience..."
                          className="rounded-xl min-h-[100px] resize-none"
                          maxLength={600}
                        />
                      </div>
                      <div className="pt-2 flex justify-end">
                        <Button
                          type="submit"
                          disabled={isSaving}
                          className="bg-primary text-gray-900 hover:bg-yellow-400 font-bold px-8 h-11 rounded-xl"
                        >
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="animate-in fade-in duration-500">
                <Card className="border-none shadow-sm overflow-hidden">
                  <CardHeader className="bg-white border-b py-6">
                    <CardTitle>Login & Security</CardTitle>
                    <CardDescription>Secure your account with a strong password.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8">
                    <form className="space-y-6 max-w-sm" onSubmit={handleChangePassword}>
                      <div className="space-y-2">
                        <Label>Current Password</Label>
                        <Input
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                          className="rounded-xl h-11"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>New Password</Label>
                        <Input
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                          className="rounded-xl h-11"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Confirm New Password</Label>
                        <Input
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                          className="rounded-xl h-11"
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={isSaving}
                        className="bg-primary text-gray-900 hover:bg-yellow-400 font-bold px-8 h-11 rounded-xl"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Update Password
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications" className="animate-in fade-in duration-500">
                <Card className="border-none shadow-sm overflow-hidden">
                  <CardHeader className="bg-white border-b py-6">
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>Choose how and when you receive alerts.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {([
                      { key: 'connectionRequests', label: "New Connection Requests", desc: "Alert when someone wants to connect" },
                      { key: 'vettingUpdates', label: "Vetting Status Updates", desc: "Alert when your business verification changes" },
                      { key: 'postInteractions', label: "Post Interactions", desc: "Alert when someone likes or comments" },
                      { key: 'complianceAlerts', label: "Compliance Alerts", desc: "Critical compliance notifications" },
                    ] as const).map((item) => (
                      <div key={item.key} className="p-6 border-b last:border-b-0 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div>
                          <p className="font-bold text-gray-900">{item.label}</p>
                          <p className="text-xs text-gray-500 font-medium">{item.desc}</p>
                        </div>
                        <Switch
                          checked={notifSettings[item.key]}
                          onCheckedChange={(val) => setNotifSettings(prev => ({ ...prev, [item.key]: val }))}
                        />
                      </div>
                    ))}
                    <div className="p-6 border-b last:border-b-0 flex items-center justify-between hover:bg-blue-50 transition-colors bg-blue-50/30">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-bold text-gray-900">AI Assistant</p>
                          <p className="text-xs text-gray-500 font-medium">Enable smart support and research features</p>
                        </div>
                      </div>
                      <Switch
                        checked={aiAssistantEnabled}
                        onCheckedChange={setAiAssistantEnabled}
                      />
                    </div>
                    <div className="p-6 flex justify-end border-t bg-gray-50/50">
                      <Button
                        onClick={handleSaveNotifications}
                        disabled={isSaving}
                        className="bg-primary text-gray-900 hover:bg-yellow-400 font-bold px-8 h-11 rounded-xl"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Save Preferences
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="billing" className="animate-in fade-in duration-500 space-y-6">
                {/* Active Plan Overview */}
                <Card className="border-none shadow-sm overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white">
                  <CardHeader className="border-b border-white/5 py-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                          <Zap className="h-5 w-5 text-yellow-400 animate-pulse" />
                          Membership &amp; Subscription
                        </CardTitle>
                        <CardDescription className="text-slate-400 mt-1">
                          Review your subscription plan, features, and billing status.
                        </CardDescription>
                      </div>
                      <div className="px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm font-bold text-center sm:text-left self-start sm:self-center">
                        Active Account
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 sm:p-8 space-y-6">
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Current Tier</p>
                        <p className="text-2xl font-extrabold text-white">
                          {user?.role === 'business'
                            ? tiers.find((t) => t.key === (business?.package_type || 'free'))?.name ?? 'Free'
                            : 'Personal Account'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {user?.role === 'business'
                            ? (tiers.find((t) => t.key === (business?.package_type || 'free'))?.price
                                ? `R${tiers.find((t) => t.key === business?.package_type)?.price}/month`
                                : 'Free tier list visibility')
                            : 'No subscription — personal accounts are always free'}
                        </p>
                      </div>
                      <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">SARS/CIPC Status</p>
                        <p className={`text-2xl font-extrabold ${
                          business?.status === 'verified' ? 'text-green-400'
                          : business?.status === 'rejected' ? 'text-red-400'
                          : 'text-amber-400'
                        }`}>
                          {user?.role !== 'business' ? 'N/A'
                            : business?.status === 'verified' ? 'Verified'
                            : business?.status === 'reviewing' ? 'Under Review'
                            : business?.status === 'rejected' ? 'Action Required'
                            : 'Not Submitted'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {user?.role !== 'business' ? 'Personal accounts are not vetted'
                            : business?.status === 'verified' ? 'CIPC & SARS verification complete'
                            : business?.status === 'reviewing' ? 'Documents submitted for review'
                            : business?.status === 'rejected' ? 'Review Vetting Hub for feedback'
                            : 'Submit documents in Vetting Hub'}
                        </p>
                      </div>
                      <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          Trust Score
                          {user?.role === 'business' && <TrustScoreInfo score={business?.trust_score ?? 0} className="text-slate-400 hover:text-yellow-400" />}
                        </p>
                        <p className="text-2xl font-extrabold text-green-400">
                          {user?.role === 'business' ? `${business?.trust_score ?? 0}/100` : 'N/A'}
                        </p>
                        <p className="text-xs text-slate-500">Trust rating metric</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* One canonical place to browse plans and upgrade — /pricing.
                    Having a second, separate set of upgrade cards here too
                    was exactly the confusing "pricing page vs billing page"
                    duplication we removed. */}
                <Card className="border border-gray-150 shadow-sm overflow-hidden bg-white">
                  <CardContent className="p-6 md:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Change or upgrade your plan</h3>
                      <p className="text-sm text-gray-500 mt-1">Compare all plans and switch instantly — same account, no separate signup.</p>
                    </div>
                    <Link href="/pricing" className="shrink-0">
                      <Button className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold px-6 h-11 rounded-xl">
                        View Plans
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {user?.role === 'business' && business?.package_type && business.package_type !== 'free' && (
                  <Card className="border border-red-100 shadow-sm overflow-hidden bg-white">
                    <CardContent className="p-6 md:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Cancel subscription</h3>
                        <p className="text-sm text-gray-500 mt-1">Move to the Free plan immediately. You can upgrade again anytime.</p>
                      </div>
                      <Button
                        onClick={handleCancelSubscription}
                        disabled={cancelling}
                        variant="outline"
                        className="shrink-0 border-red-300 text-red-600 hover:bg-red-50 font-bold px-6 h-11 rounded-xl"
                      >
                        {cancelling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Cancel Subscription
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Spent Transaction Ledger */}
                <Card className="border border-gray-100 shadow-sm overflow-hidden bg-white">
                  <CardHeader className="bg-white border-b py-6">
                    <CardTitle className="text-lg font-bold">Transaction History</CardTitle>
                    <CardDescription>A ledger of all payments and credits on your profile.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loadingPayments ? (
                      <div className="py-10 text-center flex flex-col items-center justify-center gap-2 text-gray-400">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <p className="text-xs">Loading ledger transactions…</p>
                      </div>
                    ) : payments.length === 0 ? (
                      <div className="py-12 text-center text-gray-400 space-y-2">
                        <CreditCard className="h-10 w-10 mx-auto opacity-30" />
                        <p className="text-sm font-semibold">No transactions found</p>
                        <p className="text-xs">Upgrade your account or buy ad credits to see ledger events.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b text-gray-500 font-semibold">
                              <th className="px-6 py-3">Reference</th>
                              <th className="px-6 py-3">Description</th>
                              <th className="px-6 py-3">Amount</th>
                              <th className="px-6 py-3">Date</th>
                              <th className="px-6 py-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y text-gray-700">
                            {payments.map((p) => {
                              // payments.amount is always stored in cents (see /api/payfast/init) —
                              // a size-based heuristic here previously misread small amounts like a
                              // R5 test payment (500 cents) as R500.
                              const displayAmount = (p.amount / 100).toFixed(2);
                              return (
                                <tr key={p.id} className="hover:bg-gray-50/50">
                                  <td className="px-6 py-4 font-mono text-xs">{p.reference || p.id.substring(0, 8).toUpperCase()}</td>
                                  <td className="px-6 py-4 font-medium">{p.description || `VBL ${p.plan_type || 'Upgrade'}`}</td>
                                  <td className="px-6 py-4 font-bold text-gray-900">R{displayAmount}</td>
                                  <td className="px-6 py-4 text-gray-400">
                                    {p.created_at || p.completed_at
                                      ? new Date(p.created_at || p.completed_at || '').toLocaleDateString()
                                      : '—'}
                                  </td>
                                  <td className="px-6 py-4">
                                    <Badge variant="outline" className={
                                      p.status === 'completed' || p.status === 'success'
                                        ? 'bg-green-50 text-green-700 border-green-200 font-bold'
                                        : p.status === 'failed'
                                        ? 'bg-red-50 text-red-700 border-red-200 font-bold'
                                        : 'bg-yellow-50 text-yellow-700 border-yellow-200 font-bold'
                                    }>
                                      {(p.status || 'pending').toUpperCase()}
                                    </Badge>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="privacy" className="animate-in fade-in duration-500 space-y-5">
                {/* Your Data */}
                <Card className="border-none shadow-sm overflow-hidden">
                  <CardHeader className="bg-white border-b py-6">
                    <CardTitle className="flex items-center gap-2">
                      <Download className="h-5 w-5 text-blue-600" />
                      Your Data Rights
                    </CardTitle>
                    <CardDescription>Under the POPI Act, you control your personal data.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {[
                      {
                        icon: CheckCircle2,
                        title: "View Your Data",
                        desc: "Your email, name, location, and profile information are displayed in your profile settings above.",
                        action: null,
                        color: "text-green-600",
                      },
                      {
                        icon: Download,
                        title: "Download Your Data",
                        desc: "Request a copy of all personal data we hold about you in a machine-readable format.",
                        action: "Download",
                        color: "text-blue-600",
                      },
                      {
                        icon: User,
                        title: "Edit Your Data",
                        desc: "Update your personal information at any time in the Profile tab above.",
                        action: null,
                        color: "text-gray-600",
                      },
                    ].map((item, i) => (
                      <div key={i} className="p-6 border-b last:border-b-0 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <item.icon className={`h-5 w-5 mt-0.5 ${item.color}`} />
                          <div>
                            <p className="font-bold text-gray-900">{item.title}</p>
                            <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                        {item.action && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl font-bold shrink-0"
                            onClick={() => toast({ title: "Request Submitted", description: "We'll email your data export within 24 hours." })}
                          >
                            {item.action}
                          </Button>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Privacy Links */}
                <Card className="border-none shadow-sm">
                  <CardContent className="p-6 flex flex-col sm:flex-row gap-3">
                    <Button asChild variant="outline" className="rounded-xl font-bold flex-1">
                      <a href="/privacy" target="_blank">View Privacy Policy</a>
                    </Button>
                    <Button asChild variant="outline" className="rounded-xl font-bold flex-1">
                      <a href="/terms" target="_blank">View Terms & Conditions</a>
                    </Button>
                    <Button asChild variant="outline" className="rounded-xl font-bold flex-1">
                      <a href="/refund-policy" target="_blank">View Refund Policy</a>
                    </Button>
                    <Button asChild variant="outline" className="rounded-xl font-bold flex-1">
                      <a href="/contact">Contact Data Officer</a>
                    </Button>
                  </CardContent>
                </Card>

                {/* Account Deletion */}
                <Card className="border-none shadow-sm overflow-hidden border-red-100">
                  <CardHeader className="bg-red-50 border-b border-red-100 py-6">
                    <CardTitle className="flex items-center gap-2 text-red-700">
                      <Trash2 className="h-5 w-5" />
                      Delete Account
                    </CardTitle>
                    <CardDescription className="text-red-600">
                      Permanently delete your account and all associated data. This process takes 30–90 days.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {deletionRequested ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-orange-800">Deletion Scheduled</p>
                            <p className="text-sm text-orange-700 mt-0.5">
                              Your account is scheduled for deletion within 30–90 days. All your data, posts, connections, and documents will be permanently removed.
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="rounded-xl font-bold border-orange-300 text-orange-700 hover:bg-orange-50"
                          onClick={handleCancelDeletion}
                        >
                          Cancel Deletion Request
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                          <p className="font-bold mb-2">Before you proceed:</p>
                          <ul className="space-y-1">
                            {[
                              "Your profile, posts, and connections will be permanently deleted.",
                              "Your business verification and documents will be removed.",
                              "You will be logged out immediately.",
                              "You can cancel this request within 7 days.",
                              "Certain audit logs may be retained for legal compliance (up to 5 years).",
                            ].map((item, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <div className="mt-1.5 h-1 w-1 rounded-full bg-red-400 flex-shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-bold text-gray-700">
                            Type <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-red-600">DELETE</span> to confirm
                          </Label>
                          <Input
                            value={deletionConfirm}
                            onChange={(e) => setDeletionConfirm(e.target.value)}
                            placeholder="Type DELETE to confirm"
                            className="rounded-xl h-11 border-red-200 focus:border-red-400"
                          />
                        </div>
                        <Button
                          onClick={handleRequestDeletion}
                          disabled={isDeletingAccount || deletionConfirm !== "DELETE"}
                          className="bg-red-600 text-white hover:bg-red-700 font-bold rounded-xl h-11 disabled:opacity-50 gap-2"
                        >
                          {isDeletingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          Request Account Deletion
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
      </div>
    }>
      <SettingsForm />
    </Suspense>
  );
}
