"use client";

import { useState, useEffect } from "react";
import { CreditCard, AlertCircle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface GatewayStatus {
  configured: boolean;
  merchantIdSet: boolean;
  merchantKeySet: boolean;
  passphraseSet: boolean;
  mode: "sandbox" | "production";
  url: string;
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700">{label}</span>
      {ok ? (
        <span className="flex items-center gap-1 text-green-700 text-sm font-semibold">
          <CheckCircle className="h-4 w-4" /> Set
        </span>
      ) : (
        <span className="flex items-center gap-1 text-red-700 text-sm font-semibold">
          <XCircle className="h-4 w-4" /> Missing
        </span>
      )}
    </div>
  );
}

export default function PaymentGatewayConfig() {
  const [status, setStatus] = useState<GatewayStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/payment-gateway")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setStatus(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-yellow-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-yellow-400" />
          Payment Gateway
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          PayFast is the gateway VerifiedBizLink actually charges through — subscriptions, ad boosts,
          and ad-credit top-ups all go through it.
        </p>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          These are set as environment variables on your hosting platform, not through a form here —
          credentials shouldn&apos;t be typed into a web UI and stored in the database. This panel is
          read-only status.
        </AlertDescription>
      </Alert>

      <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-xl border border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">PayFast</h3>
            <p className="text-sm text-gray-500 mt-1">Live payment processor</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className={status?.configured ? "bg-green-600" : "bg-red-600"}>
              {status?.configured ? (
                <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" /> Not Connected</>
              )}
            </Badge>
            <Badge variant="outline" className={status?.mode === "production" ? "border-red-500/40 text-red-700" : "border-yellow-500/40 text-yellow-700"}>
              {status?.mode === "production" ? "PRODUCTION — real charges" : "Sandbox"}
            </Badge>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          <StatusRow label="PAYFAST_MERCHANT_ID" ok={!!status?.merchantIdSet} />
          <StatusRow label="PAYFAST_MERCHANT_KEY" ok={!!status?.merchantKeySet} />
          <StatusRow label="PAYFAST_PASSPHRASE (recommended)" ok={!!status?.passphraseSet} />
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Endpoint: <code className="text-gray-500">{status?.url}</code>
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-xl border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">This powers:</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            Subscription upgrades (Settings → Billing)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            Ad boosts and ad-day credit top-ups (Ad Manager)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            Tier pricing and features — set in the Tiers tab above
          </li>
        </ul>
      </div>
    </div>
  );
}
