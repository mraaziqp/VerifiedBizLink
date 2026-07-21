import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/">
          <Button variant="outline" className="mb-8">← Back</Button>
        </Link>
        <h1 className="text-4xl font-bold text-white mb-2">Refund Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Effective date: 8 July 2026</p>

        <div className="prose prose-invert max-w-none">
          <div className="space-y-6 text-gray-300">
            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">1. Overview</h2>
              <p>
                This policy explains how refunds, cancellations, and billing disputes are handled for
                VerifiedBizLink's paid subscription plans (Verified Business, Premium Business, and Enterprise
                Partner — see our <Link href="/pricing" className="text-cyan-400 hover:underline">Pricing</Link> page).
                It should be read together with our <Link href="/terms" className="text-cyan-400 hover:underline">Terms &amp; Conditions</Link>.
              </p>
              <p className="mt-3">The free Basic Listing tier is not billed and this policy does not apply to it.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">2. 7-Day Cooling-Off Period</h2>
              <p>
                In line with the cooling-off right for electronic transactions under South Africa's Electronic
                Communications and Transactions Act, if this is your <strong>first time subscribing</strong> to a
                paid tier, you may cancel within <strong>7 calendar days</strong> of your initial payment for a full
                refund, no questions asked — email <a href="mailto:info@verifiedbizlink.co.za" className="text-cyan-400 hover:underline">info@verifiedbizlink.co.za</a> from
                the email address on your account.
              </p>
              <p className="mt-3">
                The cooling-off right does not apply to a subscription you have already used the cooling-off period
                for previously (e.g. you cancelled once and are resubscribing), or where you have substantially used
                paid features in a way that goes beyond reasonably evaluating the service (for example, if your
                business has already received and benefited from a completed vetting review during that window).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">3. After the Cooling-Off Period</h2>
              <p>Once the 7-day cooling-off period has passed:</p>
              <ul className="list-disc list-inside space-y-2 mt-4">
                <li>Subscription fees already charged for the current billing month are <strong>non-refundable</strong>, including if you stop using the Platform partway through the month.</li>
                <li>You can cancel auto-renewal at any time from Settings → Billing, or by emailing us. Cancelling stops the <em>next</em> billing cycle — you keep paid features until the end of the period you've already paid for.</li>
                <li>We do not provide partial or pro-rated refunds for unused time in a billing period you cancel mid-cycle.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">4. Exceptions — When We Will Refund</h2>
              <p>Outside the cooling-off window, we will still refund a payment where:</p>
              <ul className="list-disc list-inside space-y-2 mt-4">
                <li>You were charged in error (e.g. duplicate charge, or billed after you had already cancelled)</li>
                <li>A technical fault on our side prevented you from accessing the paid features you were billed for, and we were unable to fix it within a reasonable time</li>
                <li>We are required to refund you under the Consumer Protection Act 68 of 2008 or other applicable South African law</li>
              </ul>
              <p className="mt-3">To request one of these refunds, contact us within 30 days of the charge with your account email and the date of the payment in question.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">5. Upgrades &amp; Downgrades</h2>
              <p>
                If you upgrade to a higher tier mid-cycle, the new tier's features apply immediately and the new
                price takes effect from your next billing date — we don't charge a pro-rated top-up for the
                remainder of the current cycle. If you downgrade, the change takes effect at your next renewal; you
                keep your current tier's features until then.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">6. How to Cancel or Request a Refund</h2>
              <ol className="list-decimal list-inside space-y-2">
                <li>Go to <strong>Settings → Billing</strong> and select "Cancel Subscription," or</li>
                <li>Email <a href="mailto:info@verifiedbizlink.co.za" className="text-cyan-400 hover:underline">info@verifiedbizlink.co.za</a> from your account's registered email address with your business name and the reason for the request.</li>
              </ol>
              <p className="mt-3">
                We aim to acknowledge refund requests within 2 business days and, where a refund is due, to process
                it within 10 business days. Refunds are returned to the original payment method via our payment
                processor (PayFast) and may take a few additional days to reflect,
                depending on your bank or card issuer.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">7. Failed Payments &amp; Chargebacks</h2>
              <p>
                If a scheduled payment fails, we may retry it and will notify you by email; continued failure may
                result in your account reverting to the free tier. If you initiate a chargeback or payment dispute
                with your bank instead of contacting us first, we reserve the right to suspend your account while the
                dispute is investigated, and to recover any resulting processor fees where permitted by law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">8. Changes to This Policy</h2>
              <p>
                We may update this Refund Policy from time to time; changes apply to payments made after the update
                takes effect. The "Effective date" above reflects the latest revision.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">9. Contact</h2>
              <p>Billing and refund questions: <a href="mailto:info@verifiedbizlink.co.za" className="text-cyan-400 hover:underline">info@verifiedbizlink.co.za</a></p>
            </section>

            <div className="mt-12 p-6 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <p className="text-sm">Last updated: 8 July 2026</p>
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
