import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/">
          <Button variant="outline" className="mb-8">← Back</Button>
        </Link>
        <h1 className="text-4xl font-bold text-white mb-2">Terms & Conditions</h1>
        <p className="text-sm text-gray-500 mb-8">Effective date: 8 July 2026</p>

        <div className="prose prose-invert max-w-none">
          <div className="space-y-6 text-gray-300">
            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">1. Who We Are & Acceptance of Terms</h2>
              <p>
                VerifiedBizLink ("VerifiedBizLink," "we," "us," or "our") operates verifiedbizlink.co.za and the
                associated mobile/web application (the "Platform"), a business verification and professional
                networking service operating in South Africa. By creating an account, browsing business profiles,
                or otherwise using the Platform, you ("you" or "User") agree to be bound by these Terms &amp;
                Conditions ("Terms"). If you do not agree, please do not use the Platform.
              </p>
              <p className="mt-3">
                If you are creating a business account, you confirm that you are authorised to act on behalf of that
                business and to bind it to these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">2. What VerifiedBizLink Does</h2>
              <p>The Platform allows registered businesses to:</p>
              <ul className="list-disc list-inside space-y-2 mt-4">
                <li>Create a public business profile and submit supporting documents (e.g. CIPC registration, SARS tax status) for review by our vetting team</li>
                <li>Display a Trust Score and, where verification is approved, a Verified badge</li>
                <li>Publish posts and updates, connect with other users, and exchange direct messages</li>
                <li>Receive and respond to customer reviews and ratings</li>
                <li>Subscribe to a paid plan for additional visibility, analytics, and features (see Section 5)</li>
              </ul>
              <p className="mt-3">
                <strong>Verification is not a guarantee.</strong> Our vetting team checks submitted documents against
                available public records (such as CIPC and SARS status indicators) at the time of review. A Verified
                badge or Trust Score reflects the outcome of that review — it is not a warranty, certification, or
                endorsement by VerifiedBizLink of a business's quality, solvency, legality, or ongoing compliance, and
                we do not continuously re-verify businesses after approval unless a re-review is triggered.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">3. Eligibility & Accounts</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>You must be at least 18 years old to create an account.</li>
                <li>Information you provide (personal or business) must be accurate, current, and not misleading. You must promptly update it if it changes.</li>
                <li>You are responsible for keeping your login credentials confidential and for all activity under your account. Tell us immediately at <a href="mailto:info@verifiedbizlink.co.za" className="text-cyan-400 hover:underline">info@verifiedbizlink.co.za</a> if you suspect unauthorised access.</li>
                <li>We may suspend or terminate accounts that provide false verification documents, impersonate a business or person, or are created for a business the registrant is not authorised to represent.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">4. Documents, Vetting & the Trust Score</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Documents you upload for vetting (e.g. registration certificates, tax clearance, ID, proof of address) are stored securely and are only accessible to you and authorised VerifiedBizLink staff performing the review.</li>
                <li>By submitting a document, you confirm it is genuine, unaltered, and belongs to the business or person you represent.</li>
                <li>Vetting outcomes (approved, rejected, or a requested re-submission) and any Trust Score are determined at VerifiedBizLink's reasonable discretion based on our internal review process. We are not a credit bureau, legal advisor, or regulator, and a Trust Score is not financial, credit, or legal advice.</li>
                <li>We may revoke a Verified badge or adjust a Trust Score at any time if we discover submitted information was false, a document expired, or a business's status changes.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">5. Subscriptions, Billing & Auto-Renewal</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>The Platform offers a free tier and paid subscription tiers (currently billed monthly in South African Rand), described on our <Link href="/pricing" className="text-cyan-400 hover:underline">Pricing</Link> page. Features and prices may change; where a change materially affects an active subscription, we will give reasonable notice before it takes effect at your next renewal.</li>
                <li>Paid subscriptions automatically renew each billing cycle until you cancel. Payments are processed by third-party payment providers (including PayFast, and where enabled, Stripe or PayPal) — we do not store your full card details.</li>
                <li>You can cancel auto-renewal at any time from your account settings. Cancelling stops future billing; it does not automatically refund the current billing period — see our <Link href="/refund-policy" className="text-cyan-400 hover:underline">Refund Policy</Link> for how refunds and cooling-off cancellations work.</li>
                <li>If a payment fails, we may retry it, downgrade your account to the free tier, or suspend paid features until payment succeeds.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">6. Messaging & Connections</h2>
              <p>The Platform lets Users send direct messages and connection requests to other Users, including business-to-business messaging. When using messaging, you agree not to:</p>
              <ul className="list-disc list-inside space-y-2 mt-4">
                <li>Send unsolicited bulk messages, spam, chain messages, or unrelated advertising to Users who have not engaged with you</li>
                <li>Harass, threaten, defraud, or send unlawful, deceptive, or sexually explicit content to another User</li>
                <li>Use messaging to phish for payment details, login credentials, or to run financial scams</li>
              </ul>
              <p className="mt-3">
                We may review reported messages to enforce these Terms, and may suspend messaging privileges or an
                account for violations. We are not responsible for the content of messages exchanged between Users
                and do not screen messages before delivery.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">7. Reviews & User Content</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Reviews must reflect a genuine experience with the business being reviewed. Fake, incentivised (without disclosure), or retaliatory reviews are prohibited and may be removed.</li>
                <li>You retain ownership of content you post (posts, reviews, profile information, uploaded images), but grant VerifiedBizLink a non-exclusive, royalty-free, worldwide licence to host, display, reproduce, and distribute that content as necessary to operate and promote the Platform.</li>
                <li>You must have the rights to any content you upload (images, logos, documents) and it must not infringe a third party's intellectual property or contain unlawful material.</li>
                <li>We may remove content, reviews, or listings that violate these Terms, applicable law, or that we reasonably believe are harmful, fraudulent, or defamatory.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">8. Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul className="list-disc list-inside space-y-2 mt-4">
                <li>Scrape, crawl, or systematically extract data from the Platform without our prior written consent</li>
                <li>Attempt to bypass, disable, or interfere with security features, rate limits, or access controls</li>
                <li>Upload malicious code, or use the Platform to attack or gain unauthorised access to any system</li>
                <li>Use the Platform for any unlawful purpose, or in a way that infringes the rights of others</li>
                <li>Create multiple accounts to evade a suspension, manipulate Trust Scores, or inflate reviews/connections</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">9. Disclaimers</h2>
              <p>
                The Platform, including all business profiles, Trust Scores, verification badges, and vetting
                outcomes, is provided "as is" and "as available." To the maximum extent permitted by law, we disclaim
                all warranties, express or implied, including merchantability, fitness for a particular purpose, and
                non-infringement. We do not guarantee that the Platform will be uninterrupted, error-free, or that
                any business listed is trustworthy, solvent, or will perform any transaction satisfactorily —
                verification reflects document review only, not a guarantee of future conduct.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">10. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, VerifiedBizLink shall not be liable for any indirect,
                incidental, special, consequential, or punitive damages, or any loss of profits, revenue, data, or
                goodwill, arising from your use of the Platform, any transaction or dispute between Users, or reliance
                on a Trust Score or Verified badge. Nothing in these Terms limits liability that cannot lawfully be
                limited under South African law, including the Consumer Protection Act 68 of 2008 where it applies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">11. Suspension & Termination</h2>
              <p>
                We may suspend or terminate your account, with or without notice, if we reasonably believe you have
                breached these Terms, provided false information, misused the Platform, or if required by law. You may
                close your account at any time from Settings; some information may be retained where we have a legal
                or legitimate business reason to do so (see our <Link href="/privacy" className="text-cyan-400 hover:underline">Privacy Policy</Link>).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">12. Changes to These Terms</h2>
              <p>
                We may update these Terms from time to time. Material changes will be flagged on the Platform or by
                email before they take effect. Continuing to use the Platform after an update takes effect means you
                accept the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">13. Governing Law & Disputes</h2>
              <p>
                These Terms are governed by the laws of the Republic of South Africa. Any dispute arising from these
                Terms or your use of the Platform is subject to the exclusive jurisdiction of the South African
                courts, without prejudice to any right you have to refer a consumer dispute to the National Consumer
                Commission or another applicable ombud or regulator.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">14. Contact</h2>
              <p>Questions about these Terms can be sent to <a href="mailto:info@verifiedbizlink.co.za" className="text-cyan-400 hover:underline">info@verifiedbizlink.co.za</a>.</p>
            </section>

            <div className="mt-12 p-6 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <p className="text-sm">Last updated: 8 July 2026</p>
              <p className="text-sm mt-2">For questions, contact: info@verifiedbizlink.co.za</p>
              <p className="text-xs text-gray-500 mt-3">
                This document is a general template intended to reflect how VerifiedBizLink actually operates. It is
                not a substitute for advice from a South African attorney, and we recommend legal review before
                relying on it in a dispute.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
