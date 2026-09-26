'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Loader2, Building2, AlertCircle } from 'lucide-react';
import { createBusinessProfile, type CreateBusinessState } from '@/app/actions/auth-actions';
import { BUSINESS_CATEGORIES } from '@/lib/categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const FIELD = 'mt-1 h-11 rounded-xl border-slate-200 bg-white';

export function CreateBusinessForm() {
  const [state, action, pending] = useActionState<CreateBusinessState, FormData>(createBusinessProfile, undefined);
  const errorRef = useRef<HTMLDivElement>(null);

  // The submit button is at the bottom and the message at the top: without
  // this, a failed save looked like the button did nothing.
  useEffect(() => {
    if (state?.error) {
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      errorRef.current?.focus();
    }
  }, [state]);

  return (
    <form action={action} className="mt-6 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
      {state?.error && (
        <div ref={errorRef} tabIndex={-1} role="alert" data-testid="form-error" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 outline-none">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {state.error}
        </div>
      )}

      <div>
        <Label htmlFor="companyName" className="text-sm font-semibold text-slate-800">Company name</Label>
        <Input id="companyName" name="companyName" required minLength={2} maxLength={255} autoComplete="organization" placeholder="Acme Electrical (Pty) Ltd" className={FIELD} />
      </div>

      <div>
        <Label htmlFor="industry" className="text-sm font-semibold text-slate-800">Business category</Label>
        <select
          id="industry"
          name="industry"
          required
          defaultValue=""
          className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="" disabled>Choose a category</option>
          {BUSINESS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="regNumber" className="text-sm font-semibold text-slate-800">CIPC registration number <span className="font-normal text-slate-500">(optional)</span></Label>
          <Input id="regNumber" name="regNumber" maxLength={60} placeholder="2020/123456/07" className={FIELD} />
        </div>
        <div>
          <Label htmlFor="vatNumber" className="text-sm font-semibold text-slate-800">VAT number <span className="font-normal text-slate-500">(optional)</span></Label>
          <Input id="vatNumber" name="vatNumber" maxLength={60} className={FIELD} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="phone" className="text-sm font-semibold text-slate-800">Phone</Label>
          <Input id="phone" name="phone" type="tel" maxLength={50} autoComplete="tel" placeholder="021 555 0100" className={FIELD} />
        </div>
        <div>
          <Label htmlFor="website" className="text-sm font-semibold text-slate-800">Website</Label>
          <Input id="website" name="website" maxLength={255} autoComplete="url" placeholder="acme.co.za" className={FIELD} />
        </div>
      </div>

      <div>
        <Label htmlFor="address" className="text-sm font-semibold text-slate-800">Business address</Label>
        <Input id="address" name="address" maxLength={500} autoComplete="street-address" placeholder="12 Long Street, Cape Town" className={FIELD} />
      </div>

      <div>
        <Label htmlFor="description" className="text-sm font-semibold text-slate-800">What you do</Label>
        <Textarea id="description" name="description" rows={4} maxLength={4000} placeholder="A short description customers will see on your profile." className="mt-1 rounded-xl border-slate-200 bg-white" />
      </div>

      <Button type="submit" disabled={pending} className="h-12 w-full gap-2 rounded-xl bg-amber-400 font-bold text-slate-900 hover:bg-amber-300">
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Building2 className="h-5 w-5" />}
        {pending ? 'Creating your profile…' : 'Create profile & choose a plan'}
      </Button>
    </form>
  );
}
