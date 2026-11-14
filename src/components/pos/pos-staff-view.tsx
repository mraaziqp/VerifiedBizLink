'use client';

import { useState } from 'react';
import {
  Users, KeyRound, Award, CheckCircle2,
  Lock, Unlock, UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { zar } from '@/lib/pos/client';
import { cn } from '@/lib/utils';

export interface PosStaffMember {
  id: string;
  user_id?: string;
  name: string;
  email?: string;
  role: 'owner' | 'manager' | 'cashier';
  has_pin: boolean;
  failed_pin_attempts?: number;
  locked_until?: string | null;
  todaySalesCents?: number;
  todayTransactionsCount?: number;
}

interface PosStaffViewProps {
  staff: PosStaffMember[];
  onAssignPin: (staffId: string, pin: string) => Promise<void>;
  onUnlockStaff: (staffId: string) => Promise<void>;
  onAddStaff: (data: { name: string; email: string; role: string; pin?: string }) => Promise<void>;
}

export function PosStaffView({
  staff,
  onAssignPin,
  onUnlockStaff,
  onAddStaff,
}: PosStaffViewProps) {
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<PosStaffMember | null>(null);
  const [newPin, setNewPin] = useState('');
  const [submittingPin, setSubmittingPin] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<'cashier' | 'manager'>('cashier');
  const [addPin, setAddPin] = useState('');
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const handleOpenPinModal = (member: PosStaffMember) => {
    setSelectedStaff(member);
    setNewPin('');
    setPinModalOpen(true);
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || newPin.length !== 4) return;
    setSubmittingPin(true);
    try {
      await onAssignPin(selectedStaff.id, newPin);
      setPinModalOpen(false);
    } finally {
      setSubmittingPin(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName || !addEmail) return;
    setSubmittingAdd(true);
    try {
      await onAddStaff({
        name: addName,
        email: addEmail,
        role: addRole,
        pin: addPin || undefined,
      });
      setAddModalOpen(false);
      setAddName('');
      setAddEmail('');
      setAddPin('');
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Cashier Leaderboard ranked by revenue
  const leaderboard = [...staff].sort((a, b) => (b.todaySalesCents || 0) - (a.todaySalesCents || 0));

  return (
    <div className="space-y-5">
      {/* Upper Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Users className="h-4 w-4 text-purple-600" />
            Staff &amp; Till Access Security
          </h2>
          <p className="text-[11px] text-slate-500">
            Manage cashier 4-digit PINs, role-based discounts, and shift permissions
          </p>
        </div>

        <Button
          onClick={() => setAddModalOpen(true)}
          size="sm"
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs h-8 rounded-xl flex items-center gap-1"
        >
          <UserPlus className="h-3.5 w-3.5" /> + Add Cashier / Staff
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2/3: Staff Roster Table */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/80">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Authorized Personnel &amp; Till Lockout State
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase">
                  <th className="py-2.5 px-3.5">Name</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">4-Digit PIN</th>
                  <th className="py-2.5 px-3">Lockout State</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {staff.map((member) => {
                  const isLocked = Boolean(
                    member.locked_until && new Date(member.locked_until) > new Date()
                  );

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-sans font-semibold text-slate-900 dark:text-white">
                        {member.name}
                        {member.email && (
                          <span className="block text-[10px] text-slate-400 font-mono">{member.email}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] uppercase font-bold",
                            member.role === 'owner'
                              ? "bg-amber-100 text-amber-900 border-amber-300"
                              : member.role === 'manager'
                              ? "bg-blue-100 text-blue-900 border-blue-300"
                              : "bg-slate-100 text-slate-800 border-slate-300"
                          )}
                        >
                          {member.role}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        {member.has_pin ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <KeyRound className="h-3 w-3" /> Set (Active)
                          </span>
                        ) : (
                          <span className="text-slate-400">Not configured</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        {isLocked ? (
                          <Badge variant="destructive" className="text-[10px] font-bold flex items-center gap-1">
                            <Lock className="h-3 w-3" /> Locked Out (5 Failed PINs)
                          </Badge>
                        ) : member.failed_pin_attempts && member.failed_pin_attempts > 0 ? (
                          <span className="text-amber-600 font-bold text-[11px]">
                            {member.failed_pin_attempts} / 5 failed attempts
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Secure
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-sans">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenPinModal(member)}
                            className="h-7 px-2 text-[11px] font-bold"
                          >
                            Set PIN
                          </Button>
                          {isLocked && (
                            <Button
                              size="sm"
                              onClick={() => onUnlockStaff(member.id)}
                              className="h-7 px-2 text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950"
                            >
                              <Unlock className="h-3 w-3 mr-1" /> Unlock
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1/3: Cashier Leaderboard Today */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Award className="h-4 w-4 text-amber-500" />
                Shift Performance Leaderboard
              </h3>
              <p className="text-[11px] text-slate-500">Cashier contribution ranking today</p>
            </div>
          </div>

          <div className="space-y-2.5 font-mono">
            {leaderboard.map((cashier, idx) => (
              <div
                key={cashier.id}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 min-w-0 font-sans">
                  <span className={cn(
                    "h-5 w-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0",
                    idx === 0 ? "bg-amber-400 text-slate-950" : "bg-slate-200 dark:bg-slate-700 text-slate-700"
                  )}>
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white truncate max-w-[120px]">{cashier.name}</p>
                    <p className="text-[10px] font-mono text-slate-400">{cashier.todayTransactionsCount || 0} sales rung up</p>
                  </div>
                </div>
                <div className="text-right font-black text-slate-900 dark:text-white">
                  {zar(cashier.todaySalesCents || 0)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Set 4-Digit PIN Modal */}
      <Dialog open={pinModalOpen} onOpenChange={setPinModalOpen}>
        <DialogContent className="sm:max-w-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-purple-600" />
              Set Quick-Switch PIN: {selectedStaff?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Enter a secure 4-digit numeric passcode for rapid till switching.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePin} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-center block">4-Digit Numeric Passcode</Label>
              <Input
                type="password"
                maxLength={4}
                pattern="[0-9]{4}"
                placeholder="••••"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                className="text-center font-mono text-xl tracking-[0.5em] font-bold h-11"
                required
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setPinModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingPin || newPin.length !== 4}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
              >
                {submittingPin ? 'Saving...' : 'Save Passcode'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Staff Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-purple-600" />
              Register New Till Operator
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Add a cashier or shift supervisor with permissions to operate the digital till.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Full Name</Label>
              <Input
                placeholder="e.g. Sipho Zulu"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Email Address</Label>
              <Input
                type="email"
                placeholder="sipho@store.co.za"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Role &amp; Override Rights</Label>
              <select
                value={addRole}
                onChange={(e) => setAddRole(e.target.value as 'cashier' | 'manager')}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
              >
                <option value="cashier">Cashier (Standard till checkout, no discounts &gt; 10%)</option>
                <option value="manager">Manager (Can approve below-cost sales, voids, and cash ups)</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Optional Initial 4-Digit PIN</Label>
              <Input
                type="password"
                maxLength={4}
                placeholder="****"
                value={addPin}
                onChange={(e) => setAddPin(e.target.value.replace(/\D/g, ''))}
                className="text-center font-mono text-xs tracking-widest max-w-[120px]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setAddModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingAdd}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
              >
                {submittingAdd ? 'Adding...' : 'Create Staff Member'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
