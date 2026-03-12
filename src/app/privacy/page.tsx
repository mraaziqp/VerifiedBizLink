"use client";

import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicyPage() {
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
          <h1 className="text-4xl font-extrabold text-gray-900">Privacy Policy</h1>
          <p className="text-gray-500 font-medium">
            Last updated: {new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800 font-medium">
            This Privacy Policy complies with the <strong>Protection of Personal Information Act (POPIA / POPI Act), Act 4 of 2013</strong>, as enforced by the Information Regulator of South Africa.
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">1. Who We Are</h2>
          <p className="text-gray-600 leading-relaxed">
            VerifiedBizLink (Pty) Ltd ("we", "us", or "our") operates the VerifiedBizLink platform — an online professional network that facilitates verified business connections, compliance vetting, and trusted trade relationships in South Africa and beyond.
          </p>
          <p className="text-gray-600 leading-relaxed">
            We act as the <strong>Responsible Party</strong> under POPIA. For any data privacy queries, contact us at{" "}
            <Link href="mailto:privacy@verifiedbizlink.co.za" className="text-primary font-bold hover:underline">
              privacy@verifiedbizlink.co.za
            </Link>
            .
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">2. What Personal Information We Collect</h2>
          <p className="text-gray-600 leading-relaxed">
            In line with our commitment to minimal data collection, we only collect what is strictly necessary to provide our services:
          </p>
          <div className="overflow-hidden rounded-2xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-bold text-gray-700">Category</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-700">Data We Collect</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-700">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ["Identity", "Full name, email address", "Account creation, authentication"],
                  ["Contact", "Contact address (location)", "Verification & compliance"],
                  ["Business", "Business name, company registration number", "Business vetting & verification"],
                  ["Authentication", "Hashed password (bcrypt)", "Account security — never stored in plain text"],
                  ["Optional profile", "Headline, bio, phone number, avatar URL", "Professional profile display"],
                ].map(([cat, data, purpose], i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-800">{cat}</td>
                    <td className="px-4 py-3 text-gray-600">{data}</td>
                    <td className="px-4 py-3 text-gray-600">{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 font-medium">
            We do <strong>not</strong> collect sensitive personal information such as race, religion, health data, biometric data, criminal records, or financial account numbers.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">3. Why We Collect Your Information (Purpose)</h2>
          <div className="space-y-3">
            {[
              { title: "Account Registration & Authentication", desc: "Your email, name, and password are required to create and secure your account on VerifiedBizLink." },
              { title: "Business Vetting & Verification", desc: "Company name, registration number, and supporting documents are required to verify and score your business for the trust network." },
              { title: "Compliance & Legal Obligations", desc: "We maintain audit logs and user activity records as required by applicable South African legislation." },
              { title: "Platform Functionality", desc: "Contact address, phone number, and profile information help other verified businesses find and connect with you." },
              { title: "Security Monitoring", desc: "Activity logs help us detect and prevent unauthorised access, fraud, or platform abuse." },
            ].map((item, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-xl border">
                <p className="font-bold text-gray-900 text-sm">{item.title}</p>
                <p className="text-gray-600 text-sm mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">4. Legal Basis for Processing (POPIA Section 11)</h2>
          <p className="text-gray-600 leading-relaxed">
            We process your personal information on the following lawful grounds:
          </p>
          <ul className="space-y-2 text-gray-600">
            {[
              "Consent — you voluntarily provide your information when registering.",
              "Contractual necessity — processing is required to fulfil our platform services.",
              "Legal obligation — compliance with South African law (Companies Act, POPIA, FIC Act).",
              "Legitimate interest — platform security, fraud prevention, and platform improvement.",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">5. How We Protect Your Data</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: "Encryption at Rest", desc: "All database fields are stored in encrypted Neon PostgreSQL clusters." },
              { title: "Encrypted Passwords", desc: "Passwords are hashed using bcrypt (cost factor 12) and never stored in plain text." },
              { title: "HTTPS / TLS", desc: "All data in transit is encrypted via TLS 1.3. Insecure connections are rejected." },
              { title: "HttpOnly Cookies", desc: "Session tokens are stored in HttpOnly, Secure, SameSite cookies — inaccessible to JavaScript." },
              { title: "Role-Based Access Control", desc: "Data is accessible only to authorised roles. Admin actions are logged and audited." },
              { title: "Minimal Data Retention", desc: "We collect only what is necessary and delete inactive data within 90 days of account closure." },
            ].map((item, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-xl border">
                <p className="font-bold text-gray-900 text-sm">{item.title}</p>
                <p className="text-gray-600 text-sm mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">6. Data Breach Notification Procedure</h2>
          <p className="text-gray-600 leading-relaxed">
            In the event of a data breach that poses a risk to the rights and freedoms of data subjects, we will:
          </p>
          <ul className="space-y-2 text-gray-600">
            {[
              "Notify affected users via email within 72 hours of becoming aware of the breach.",
              "Notify the Information Regulator of South Africa within 72 hours as required by POPIA Section 22.",
              "Include in the notification: the nature of the breach, categories of data affected, likely consequences, and measures taken.",
              "Provide a dedicated support contact for breach-related queries.",
              "Maintain a breach register documenting all incidents, investigations, and remediation steps.",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">7. Your Rights Under POPIA</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: "Right to Access", desc: "Request a copy of all personal information we hold about you." },
              { title: "Right to Correction", desc: "Request correction of incomplete or inaccurate data." },
              { title: "Right to Deletion", desc: "Request deletion of your account and all associated data within 30–90 days." },
              { title: "Right to Object", desc: "Object to the processing of your personal information for certain purposes." },
              { title: "Right to Portability", desc: "Request your data in a structured, machine-readable format." },
              { title: "Right to Lodge a Complaint", desc: "Lodge a complaint with the Information Regulator at www.inforegulator.org.za." },
            ].map((item, i) => (
              <div key={i} className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="font-bold text-blue-900 text-sm">{item.title}</p>
                <p className="text-blue-700 text-sm mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-gray-600 text-sm">
            To exercise these rights, visit your{" "}
            <Link href="/settings" className="text-primary font-bold hover:underline">Account Settings</Link>{" "}
            or contact us at{" "}
            <Link href="mailto:privacy@verifiedbizlink.co.za" className="text-primary font-bold hover:underline">
              privacy@verifiedbizlink.co.za
            </Link>
            .
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">8. Account Deletion & Data Retention</h2>
          <p className="text-gray-600 leading-relaxed">
            You may request deletion of your account at any time from your{" "}
            <Link href="/settings" className="text-primary font-bold hover:underline">Settings</Link> page.
          </p>
          <ul className="space-y-2 text-gray-600">
            {[
              "A deletion request is processed within 30–90 days.",
              "You may cancel the deletion request within 7 days of submitting it.",
              "All personal data, posts, connections, and documents will be permanently deleted.",
              "Audit logs tied to regulatory obligations may be retained for up to 5 years as required by law.",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">9. Cookies & Tracking</h2>
          <p className="text-gray-600 leading-relaxed">
            We use a single session cookie (<code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">vbl_session</code>) for authentication. This is a strictly necessary cookie and does not track browsing behaviour. We do not use advertising trackers, analytics pixels, or third-party cookies.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">10. Third-Party Sharing</h2>
          <p className="text-gray-600 leading-relaxed">
            We do not sell, trade, or rent your personal information to third parties. Your data may be shared only with:
          </p>
          <ul className="space-y-2 text-gray-600">
            {[
              "Our cloud infrastructure provider (Neon / AWS) — for secure data storage. Data is encrypted at rest.",
              "Authorised platform staff (admin, banker, lawyer roles) — for business vetting only.",
              "Law enforcement — only when required by valid legal process.",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">11. Children's Privacy</h2>
          <p className="text-gray-600 leading-relaxed">
            VerifiedBizLink is intended for individuals aged 18 and older. We do not knowingly collect personal information from minors. If you believe a minor has created an account, contact us immediately at{" "}
            <Link href="mailto:privacy@verifiedbizlink.co.za" className="text-primary font-bold hover:underline">
              privacy@verifiedbizlink.co.za
            </Link>
            .
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">12. Contact the Information Officer</h2>
          <div className="p-6 bg-gray-50 rounded-2xl border space-y-3">
            <p className="font-bold text-gray-900">VerifiedBizLink (Pty) Ltd</p>
            <p className="text-gray-600 text-sm">Information Officer: [Name to be designated]</p>
            <p className="text-gray-600 text-sm">
              Email:{" "}
              <Link href="mailto:privacy@verifiedbizlink.co.za" className="text-primary font-bold hover:underline">
                privacy@verifiedbizlink.co.za
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

        <section className="space-y-4 border-t pt-8">
          <h2 className="text-2xl font-bold text-gray-900">13. Changes to This Policy</h2>
          <p className="text-gray-600 leading-relaxed">
            We may update this Privacy Policy from time to time. Significant changes will be communicated via email and a prominent notice on the platform. Continued use of the platform after changes constitutes acceptance.
          </p>
        </section>

        <div className="flex gap-4 pt-4 border-t">
          <Button asChild variant="outline" className="rounded-xl font-bold">
            <Link href="/terms">View Terms & Conditions</Link>
          </Button>
          <Button asChild className="bg-primary text-gray-900 font-bold rounded-xl hover:bg-yellow-400">
            <Link href="/contact">Contact Us</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
