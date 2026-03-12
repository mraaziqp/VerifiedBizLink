"use client";

import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-gray-600 hover:text-gray-900 rounded-xl">
          <Link href="/"><ArrowLeft className="h-4 w-4" /> Back</Link>
        </Button>
        <div className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg">
            <ShieldCheck className="h-5 w-5 text-gray-900" />
          </div>
          <span className="font-bold text-gray-900">VerifiedBizLink</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        <div className="space-y-3 border-b pb-8">
          <h1 className="text-4xl font-extrabold text-gray-900">Terms & Conditions</h1>
          <p className="text-gray-500 font-medium">
            Last updated: {new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          <p className="text-gray-600 leading-relaxed">
            By creating an account or using VerifiedBizLink, you agree to these Terms & Conditions. Please read them carefully.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">1. Acceptance of Terms</h2>
          <p className="text-gray-600 leading-relaxed">
            These Terms & Conditions ("Terms") constitute a legally binding agreement between you ("User") and VerifiedBizLink (Pty) Ltd ("Company", "we", "us"). By accessing or using our platform, you confirm you have read, understood, and agree to be bound by these Terms and our Privacy Policy.
          </p>
          <p className="text-gray-600 leading-relaxed">
            If you do not agree to these Terms, you must not use the platform.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">2. Eligibility</h2>
          <ul className="space-y-2 text-gray-600">
            {[
              "You must be at least 18 years of age to use VerifiedBizLink.",
              "You must provide accurate, truthful, and current information during registration.",
              "A single individual or business may maintain only one account per role type.",
              "You are responsible for maintaining the security of your account credentials.",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">3. Account Types & Roles</h2>
          <div className="overflow-hidden rounded-2xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-bold text-gray-700">Role</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-700">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ["Customer (Free)", "Personal/consumer account. Access to network and basic features."],
                  ["Business", "Business entity account. Can submit for vetting, upload documents, and advertise."],
                  ["Shareholder", "Platform stakeholder with elevated administrative access. Invite code required."],
                  ["Admin / Banker / Lawyer", "Platform staff roles. Assigned internally by management."],
                ].map(([role, desc], i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-800">{role}</td>
                    <td className="px-4 py-3 text-gray-600">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">4. Acceptable Use</h2>
          <p className="text-gray-600">You agree NOT to:</p>
          <ul className="space-y-2 text-gray-600">
            {[
              "Provide false, inaccurate, or misleading business information or documentation.",
              "Impersonate another business, person, or entity.",
              "Use the platform to commit fraud, money laundering, or any illegal activity.",
              "Upload malicious content, viruses, or code that interferes with platform operations.",
              "Harvest user data, spam other users, or engage in unsolicited commercial outreach.",
              "Attempt to bypass security controls, authentication, or access restrictions.",
              "Share your account credentials with third parties.",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">5. Business Verification</h2>
          <p className="text-gray-600 leading-relaxed">
            Business vetting is a formal review process. By submitting for verification, you:
          </p>
          <ul className="space-y-2 text-gray-600">
            {[
              "Confirm all submitted documents are genuine, valid, and not fraudulently altered.",
              "Acknowledge our compliance officers may contact relevant authorities to verify information.",
              "Understand that submitting false documents may result in permanent account suspension and referral to law enforcement.",
              "Accept that verification decisions are at the sole discretion of VerifiedBizLink.",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">6. Advertising</h2>
          <p className="text-gray-600 leading-relaxed">
            Free Customer accounts may be shown advertisements from verified businesses on the platform. You may dismiss an ad, with the option potentially reappearing after a brief interval.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Business accounts may purchase advertising placements. All ads are subject to review and must comply with our Community Standards and applicable advertising laws. We reserve the right to reject or remove any ad without notice.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">7. Intellectual Property</h2>
          <p className="text-gray-600 leading-relaxed">
            The VerifiedBizLink platform, its design, trademarks, and proprietary features are owned by VerifiedBizLink (Pty) Ltd. Content you post remains yours, but you grant us a non-exclusive, royalty-free licence to display it on the platform for service delivery purposes.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">8. Account Suspension & Termination</h2>
          <p className="text-gray-600 leading-relaxed">
            We reserve the right to suspend or terminate any account that violates these Terms, submits fraudulent information, or engages in activity harmful to other users or the platform.
          </p>
          <p className="text-gray-600 leading-relaxed">
            You may delete your account at any time from your{" "}
            <Link href="/settings" className="text-primary font-bold hover:underline">Settings</Link>{" "}
            page. Your data will be permanently deleted within 30–90 days. You may cancel this request within 7 days.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">9. Limitation of Liability</h2>
          <p className="text-gray-600 leading-relaxed">
            VerifiedBizLink is provided "as is". We do not guarantee uninterrupted service and accept no liability for business decisions made based on verified status shown on the platform. Verification indicates compliance at the time of review — always conduct your own due diligence.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Our maximum liability for any claim shall not exceed the total fees paid by you in the 3 months preceding the claim.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">10. Governing Law</h2>
          <p className="text-gray-600 leading-relaxed">
            These Terms are governed by the laws of the Republic of South Africa. Any disputes shall be resolved in the courts of South Africa, and you consent to the exclusive jurisdiction of those courts.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">11. Changes to These Terms</h2>
          <p className="text-gray-600 leading-relaxed">
            We may update these Terms at any time. Material changes will be communicated 14 days in advance via email. Continued use of the platform after the effective date constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">12. Contact</h2>
          <div className="p-6 bg-gray-50 rounded-2xl border space-y-2">
            <p className="font-bold text-gray-900">VerifiedBizLink (Pty) Ltd</p>
            <p className="text-gray-600 text-sm">
              Legal enquiries:{" "}
              <Link href="mailto:legal@verifiedbizlink.co.za" className="text-primary font-bold hover:underline">
                legal@verifiedbizlink.co.za
              </Link>
            </p>
            <p className="text-gray-600 text-sm">Response time: Within 24 hours on business days.</p>
            <div className="pt-2">
              <Button asChild className="bg-primary text-gray-900 hover:bg-yellow-400 font-bold rounded-xl">
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </section>

        <div className="flex gap-4 pt-4 border-t">
          <Button asChild variant="outline" className="rounded-xl font-bold">
            <Link href="/privacy">View Privacy Policy</Link>
          </Button>
          <Button asChild className="bg-primary text-gray-900 font-bold rounded-xl hover:bg-yellow-400">
            <Link href="/signup">Create Account</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
