'use client';

import { useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or repetitive content' },
  { value: 'inappropriate', label: 'Inappropriate or offensive' },
  { value: 'misleading', label: 'Misleading or false information' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'scam', label: 'Scam or fraud' },
  { value: 'other', label: 'Other' },
];

interface ReportDialogProps {
  targetType: 'post' | 'business' | 'comment';
  targetId: string;
  triggerLabel?: string;
  children?: React.ReactNode;
}

export function ReportDialog({ targetType, targetId, triggerLabel, children }: ReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!reason) {
      toast({ title: 'Select a reason', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, reason, details: details.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Report submitted', description: 'Thank you. Our team will review this.' });
        setOpen(false);
        setReason('');
        setDetails('');
      } else {
        toast({ title: 'Could not submit report', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Failed to submit', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-500 gap-1.5">
            <Flag className="h-3.5 w-3.5" /> {triggerLabel || 'Report'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report {targetType}</DialogTitle>
          <DialogDescription>
            Help us keep VerifiedBizLink safe. Select a reason for your report.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Reason</Label>
            <div className="space-y-2">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                    reason === r.value
                      ? 'border-yellow-400 bg-yellow-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-yellow-500"
                  />
                  <span className="text-sm text-gray-700">{r.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Additional details <span className="font-normal text-gray-400">(optional)</span></Label>
            <textarea
              className="w-full rounded-xl border border-gray-200 p-3 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Provide any additional context..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={1000}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !reason}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
