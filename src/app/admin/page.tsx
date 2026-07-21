"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [persona, setPersona] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    // Determine persona based on email. "architect" was removed — no
    // /admin/architect page exists and no real staff role maps to it, so
    // any account matching it 404'd instead of landing anywhere useful.
    let detectedPersona = "orchestrator"; // default
    const userEmail = user.email?.toLowerCase() || "";

    if (userEmail.includes("enforcer")) {
      detectedPersona = "enforcer";
    }

    setPersona(detectedPersona);
    // Redirect to persona-specific dashboard
    router.push(`/admin/${detectedPersona}`);
  }, [user, loading, router]);

  if (loading || !persona) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <Loader2 className="h-12 w-12 animate-spin text-yellow-500 mx-auto mb-4" />
          <p className="text-slate-200">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return null;
}
