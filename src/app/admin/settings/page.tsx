import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminCredentialManager } from "@/components/admin/admin-credential-manager";
import { AdminBackground, AdminPageHeader, glassInteractive } from "@/components/admin/ui";

export const metadata: Metadata = {
  title: "Admin Settings | VerifiedBizLink",
  description: "Manage your admin account settings and credentials",
};

export default function AdminSettingsPage() {
  return (
    <AdminBackground>
      <AdminPageHeader title="Admin Settings" subtitle="Manage your admin account credentials">
        <Link
          href="/admin"
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-yellow-500 hover:bg-white/5 ${glassInteractive}`}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Admin
        </Link>
      </AdminPageHeader>
      <div className="mx-auto max-w-2xl py-12 px-4 sm:px-6 lg:px-8">
        <AdminCredentialManager />
      </div>
    </AdminBackground>
  );
}
