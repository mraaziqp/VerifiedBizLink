import { Metadata } from "next";
import { AdminCredentialManager } from "@/components/admin/admin-credential-manager";

export const metadata: Metadata = {
  title: "Admin Settings | VerifiedBizLink",
  description: "Manage your admin account settings and credentials",
};

export default function AdminSettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <AdminCredentialManager />
    </div>
  );
}
