'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Users, KeyRound, Shield, Check,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { GlassBackground } from '@/components/shared/glass-ui';
import { useToast } from '@/hooks/use-toast';

interface StaffMember {
  id: string;
  user_id: string;
  role: 'owner' | 'manager' | 'cashier' | 'stock_controller';
  display_name?: string;
  full_name?: string;
  email?: string;
  is_active: boolean;
  pin_hash?: string;
}

export default function PosStaffPage() {
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal
  const [staffModal, setStaffModal] = useState(false);
  const [userIdInput, setUserIdInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<'cashier' | 'manager' | 'stock_controller'>('cashier');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [savingStaff, setSavingStaff] = useState(false);

  const loadStaff = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/staff');
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff || []);
      }
    } catch {
      toast({ title: 'Could not load staff', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleSaveStaff = async () => {
    if (!userIdInput.trim()) {
      toast({ title: 'Please provide user ID or email', variant: 'destructive' });
      return;
    }
    if (pinInput && pinInput.length !== 4) {
      toast({ title: 'PIN must be exactly 4 digits', variant: 'destructive' });
      return;
    }

    setSavingStaff(true);
    try {
      const res = await fetch('/api/pos/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userIdInput.trim(),
          role: selectedRole,
          displayName: displayNameInput.trim() || undefined,
          pin: pinInput || undefined,
        }),
      });

      if (res.ok) {
        toast({ title: 'Staff member configured successfully' });
        setStaffModal(false);
        setUserIdInput('');
        setPinInput('');
        setDisplayNameInput('');
        loadStaff();
      } else {
        const data = await res.json();
        toast({ title: 'Error saving staff', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setSavingStaff(false);
    }
  };

  return (
    <GlassBackground>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="rounded-xl">
              <Link href="/business/pos">
                <ArrowLeft className="h-5 w-5 text-slate-700" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Staff & Till Access</h1>
              <p className="text-xs text-slate-500">Assign cashier permissions and 4-digit quick-switch PINs for shifts.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setStaffModal(true)}
              className="rounded-xl bg-amber-400 font-extrabold text-slate-950 hover:bg-amber-300 text-xs shadow-xs"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Assign Staff Member
            </Button>
          </div>
        </div>

        {/* Roles Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs font-black text-amber-700">
              <Shield className="h-4 w-4" /> Owner / Manager
            </div>
            <p className="text-xs text-slate-600">
              Full control over stock adjustments, price changes, purchasing, refunds, and financial ledgers.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs font-black text-blue-700">
              <Users className="h-4 w-4" /> Cashier
            </div>
            <p className="text-xs text-slate-600">
              Streamlined checkout till access, cash tendering, contactless card tap, and receipt issuing.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs font-black text-emerald-700">
              <KeyRound className="h-4 w-4" /> 4-Digit Quick PIN
            </div>
            <p className="text-xs text-slate-600">
              Cashiers switch active shifts in 1 second by entering their PIN without typing passwords.
            </p>
          </div>
        </div>

        {/* Staff Table */}
        <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : staff.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <p className="text-base font-bold text-slate-900">No delegated staff members assigned</p>
              <p className="text-xs text-slate-400 mt-1">
                You are currently operating the till as the primary business owner.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold">
                  <tr>
                    <th className="py-3.5 px-4">Staff Member</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Quick Till PIN</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staff.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{m.display_name || m.full_name || 'Staff User'}</p>
                        <p className="text-[11px] text-slate-400">{m.email}</p>
                      </td>
                      <td className="py-3.5 px-4 font-bold capitalize text-slate-800">
                        {m.role.replace('_', ' ')}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {m.pin_hash ? '•••• (PIN Configured)' : 'No PIN Set'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                          <Check className="h-3 w-3" /> Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ======================= ADD STAFF MODAL ======================= */}
        <Dialog open={staffModal} onOpenChange={setStaffModal}>
          <DialogContent className="max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900">Assign Staff Role</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Grant till checkout and inventory permissions to registered users.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div>
                <label className="font-bold text-slate-700">User UUID or Registered Email</label>
                <Input
                  value={userIdInput}
                  onChange={(e) => setUserIdInput(e.target.value)}
                  placeholder="Paste user ID or email"
                  className="mt-1 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Display Name / Cashier Label</label>
                <Input
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  placeholder="e.g. Sipho (Morning Shift)"
                  className="mt-1 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Assigned Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as typeof selectedRole)}
                  className="mt-1 w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs"
                >
                  <option value="cashier">Cashier (Till & Checkout only)</option>
                  <option value="manager">Manager (Till, Refunds & Inventory)</option>
                  <option value="stock_controller">Stock Controller (Inventory & Purchasing)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">4-Digit Quick Till PIN</label>
                <Input
                  type="password"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="••••"
                  className="mt-1 rounded-xl font-mono text-center text-lg tracking-widest"
                />
                <p className="text-[11px] text-slate-400 mt-1">Used to quickly switch cashiers at the till.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStaffModal(false)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveStaff}
                  disabled={savingStaff}
                  className="rounded-xl bg-amber-400 font-extrabold text-slate-950 hover:bg-amber-300 text-xs shadow-xs"
                >
                  {savingStaff ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Assignment'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </GlassBackground>
  );
}
