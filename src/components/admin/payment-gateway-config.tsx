"use client";

import { useState, useEffect } from "react";
import { CreditCard, AlertCircle, CheckCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface PaymentConfig {
  stripe: {
    public_key: string;
    configured: boolean;
  };
  paypal: {
    client_id: string;
    configured: boolean;
  };
  fallback_gateway: string;
}

export default function PaymentGatewayConfig() {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showKeys, setShowKeys] = useState({
    stripe: false,
    paypal: false,
  });
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    stripe_key: "",
    paypal_client_id: "",
    fallback_gateway: "stripe",
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/payment-gateway");
      const data = await res.json();
      setConfig(data);
    } catch (error) {
      console.error("Failed to fetch config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/admin/payment-gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        await fetchConfig();
        setFormData({ stripe_key: "", paypal_client_id: "", fallback_gateway: "stripe" });
      }
    } catch (error) {
      console.error("Failed to save config:", error);
    } finally {
      setSaving(false);
    }
  };

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
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-yellow-400" />
          Payment Gateway Configuration
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Connect Stripe and PayPal for subscription payments
        </p>
      </div>

      <Alert className="bg-blue-900/30 border-blue-700">
        <AlertCircle className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-300">
          Payment gateways enable users to subscribe to paid tiers. Get your API keys from
          <a href="https://stripe.com" target="_blank" className="font-bold ml-1">Stripe</a> and
          <a href="https://paypal.com" target="_blank" className="font-bold ml-1">PayPal</a>.
        </AlertDescription>
      </Alert>

      {/* Gateway Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stripe */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-gray-700/50">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Stripe</h3>
              <p className="text-sm text-gray-400 mt-1">Primary payment processor</p>
            </div>
            <Badge
              variant={config?.stripe.configured ? "default" : "secondary"}
              className={config?.stripe.configured ? "bg-green-600" : ""}
            >
              {config?.stripe.configured ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </>
              ) : (
                "Not Connected"
              )}
            </Badge>
          </div>

          {config?.stripe.configured && (
            <div className="bg-gray-800/50 p-3 rounded mb-4 border border-gray-700">
              <p className="text-xs text-gray-400 mb-1">Public Key</p>
              <div className="flex items-center gap-2">
                <code className="text-sm text-gray-300 flex-1 break-all">
                  {showKeys.stripe
                    ? config.stripe.public_key
                    : config.stripe.public_key.slice(0, 10) + "..."}
                </code>
                <button
                  onClick={() =>
                    setShowKeys({ ...showKeys, stripe: !showKeys.stripe })
                  }
                  className="text-gray-500 hover:text-gray-300"
                >
                  {showKeys.stripe ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500 mb-4">
            Get your keys from{" "}
            <a
              href="https://dashboard.stripe.com/apikeys"
              target="_blank"
              className="text-yellow-400 hover:underline"
            >
              Stripe Dashboard
            </a>
          </p>
        </div>

        {/* PayPal */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-gray-700/50">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">PayPal</h3>
              <p className="text-sm text-gray-400 mt-1">Alternative payment processor</p>
            </div>
            <Badge
              variant={config?.paypal.configured ? "default" : "secondary"}
              className={config?.paypal.configured ? "bg-green-600" : ""}
            >
              {config?.paypal.configured ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </>
              ) : (
                "Not Connected"
              )}
            </Badge>
          </div>

          {config?.paypal.configured && (
            <div className="bg-gray-800/50 p-3 rounded mb-4 border border-gray-700">
              <p className="text-xs text-gray-400 mb-1">Client ID</p>
              <div className="flex items-center gap-2">
                <code className="text-sm text-gray-300 flex-1 break-all">
                  {showKeys.paypal
                    ? config.paypal.client_id
                    : config.paypal.client_id.slice(0, 10) + "..."}
                </code>
                <button
                  onClick={() =>
                    setShowKeys({ ...showKeys, paypal: !showKeys.paypal })
                  }
                  className="text-gray-500 hover:text-gray-300"
                >
                  {showKeys.paypal ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500 mb-4">
            Get your credentials from{" "}
            <a
              href="https://www.paypal.com/signin"
              target="_blank"
              className="text-yellow-400 hover:underline"
            >
              PayPal Developer
            </a>
          </p>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-gray-700/50">
        <h3 className="text-lg font-bold text-white mb-4">Update Configuration</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">
              Stripe Secret Key
            </label>
            <Input
              type="password"
              placeholder="sk_test_..."
              value={formData.stripe_key}
              onChange={(e) =>
                setFormData({ ...formData, stripe_key: e.target.value })
              }
              className="bg-gray-800 border-gray-700 text-white"
            />
            <p className="text-xs text-gray-500 mt-2">
              Your secret key is never displayed, only updated
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">
              PayPal Client ID
            </label>
            <Input
              type="password"
              placeholder="AXx..."
              value={formData.paypal_client_id}
              onChange={(e) =>
                setFormData({ ...formData, paypal_client_id: e.target.value })
              }
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">
              Primary Payment Gateway
            </label>
            <select
              value={formData.fallback_gateway}
              onChange={(e) =>
                setFormData({ ...formData, fallback_gateway: e.target.value })
              }
              className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-2"
            >
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
            </select>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-yellow-400 text-gray-900 hover:bg-yellow-300"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Update Configuration"
            )}
          </Button>
        </div>
      </div>

      {/* Features Requiring Payment Gateway */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-gray-700/50">
        <h3 className="text-lg font-bold text-white mb-4">Required for:</h3>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
            Collecting subscription payments
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
            Automatic billing cycles (monthly/yearly)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
            Paid tier access control
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
            Revenue tracking and reporting
          </li>
        </ul>
      </div>
    </div>
  );
}
