"use client";

import { useCallback, useEffect, useState } from "react";
import { Crown, Loader2, Save, RefreshCw } from "lucide-react";
import { AdminCard } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface OwnerAccountRow {
  email: string;
  id: string | null;
  company_name: string | null;
  package_type: string | null;
  tier_grant_type: string | null;
}

/**
 * Owner accounts: emails whose businesses are on full Premium permanently —
 * never billed, never warned, never downgraded. Saving applies it at once,
 * and the hourly billing sweep re-applies it (so a business an owner creates
 * later gets Premium within the hour).
 */
export default function OwnerAccountsPanel({ canEdit }: { canEdit: boolean }) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [accounts, setAccounts] = useState<OwnerAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/owner-accounts").catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setText((data.emails || []).join("\n"));
      setAccounts(data.accounts || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/owner-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails: text }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      toast({ title: "Not saved", description: data.error, variant: "destructive" });
      return;
    }
    const parts = [
      data.granted?.length ? `${data.granted.length} business(es) moved to permanent Premium` : null,
      data.ownersWithoutBusiness?.length ? `${data.ownersWithoutBusiness.length} owner(s) have no business yet — they get Premium as soon as they create one` : null,
      data.payfastCancelFailures?.length ? `PayFast could not cancel for: ${data.payfastCancelFailures.join(", ")} — cancel by hand` : null,
    ].filter(Boolean);
    toast({ title: "Owner accounts saved", description: parts.join(". ") || "Everything was already up to date." });
    load();
  };

  const byEmail = new Map<string, OwnerAccountRow[]>();
  for (const a of accounts) byEmail.set(a.email, [...(byEmail.get(a.email) || []), a]);

  return (
    <AdminCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-black text-slate-900">
            <Crown className="h-5 w-5 text-amber-500" /> Owner accounts
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-slate-600">
            Every business owned by these emails is on full Premium for good — never charged, never warned, never moved to Free.
            Any PayFast subscription they have is cancelled. One email per line.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="owner-emails" className="text-xs font-bold text-slate-700">Owner emails</label>
            <textarea
              id="owner-emails"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!canEdit || saving}
              rows={7}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs"
              placeholder={"you@example.com\npartner@example.com"}
            />
            {canEdit ? (
              <Button onClick={save} disabled={saving} className="gap-1.5 bg-amber-400 font-bold text-slate-950 hover:bg-amber-300">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save &amp; apply
              </Button>
            ) : (
              <p className="text-xs text-slate-500">Only platform administrators can change this list.</p>
            )}
          </div>
          <div className="space-y-2 text-xs">
            <p className="font-bold text-slate-700">Applied to</p>
            {[...byEmail.entries()].length === 0 && <p className="text-slate-500">No owner accounts yet.</p>}
            {[...byEmail.entries()].map(([email, rows]) => (
              <div key={email} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="font-mono font-semibold text-slate-800">{email}</p>
                {rows.filter((r) => r.id).length === 0 ? (
                  <p className="text-slate-500">No business yet — gets Premium as soon as one is created.</p>
                ) : (
                  rows.filter((r) => r.id).map((r) => (
                    <p key={r.id} className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span>{r.company_name || "Unnamed business"}</span>
                      {r.tier_grant_type === "owner" ? (
                        <Badge className="border border-amber-300 bg-amber-50 text-amber-900">Premium · owner</Badge>
                      ) : (
                        <Badge className="border border-slate-200 bg-slate-100 text-slate-700">{r.package_type || "free"} — not applied yet</Badge>
                      )}
                    </p>
                  ))
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminCard>
  );
}
