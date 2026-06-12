'use client'

import React from 'react'

export default function TermsAndConditionsPage() {
  return (
    <div className="w-full max-w-7xl mx-auto py-10 px-4 sm:px-6">
      <div className="bg-white border-2 border-ezen-outline-variant rounded-3xl p-8 sm:p-12 shadow-[6px_6px_0_0_rgba(87,52,79,0.1)] text-ezen-on-surface">
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-ezen-primary mb-2">
          Terms & Conditions
        </h1>
        <p className="text-xs text-ezen-outline mb-8 uppercase tracking-wider font-semibold">
          Last Updated: March 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-ezen-on-surface-variant font-sans">
          
          <p>
            Please read these terms carefully before using the Ezen AI platform.
          </p>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-ezen-primary font-heading">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using the Ezen AI platform ("Service") available at <a href="https://ezen.ai" className="text-ezen-primary underline">ezen.ai</a>, you agree to be bound by these Terms & Conditions ("Terms"). If you do not agree to these Terms, you may not access or use the Service. These Terms constitute a legally binding agreement between you ("User," "you," or "your") and Ezen AI ("Company," "we," "us," or "our"), a company headquartered in Salem, Tamil Nadu, India.
            </p>
            <p>
              By creating an account, accessing the dashboard, or using any of our APIs, you acknowledge that you have read, understood, and agree to be bound by these Terms, as well as our Privacy Policy and Refund Policy, which are incorporated herein by reference.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-ezen-primary font-heading">
              2. Description of Services
            </h2>
            <p>
              Ezen AI provides a cloud-based AI-powered email processing & automation assistant that enables businesses to manage and respond to customer emails efficiently. Our services include:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>AI Email Classification</strong> — Automatic analysis of incoming emails to determine intent, priority, and sentiment.
              </li>
              <li>
                <strong>AI Auto-Reply & Draft Generation</strong> — Smart drafts and context-aware responses powered by advanced Large Language Models.
              </li>
              <li>
                <strong>Smart Email Queue & Sending</strong> — Email client integrations for automated queuing and outbound delivery verification.
              </li>
              <li>
                <strong>Inbox Integrations</strong> — Secure OAuth connection with platforms like Google Workspace and Microsoft 365.
              </li>
            </ul>
            <p>
              We reserve the right to modify, suspend, or discontinue any part of the Service at any time with reasonable prior notice.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-ezen-primary font-heading">
              3. Account Registration
            </h2>
            <p>
              To use the Service, you must create an account by providing accurate, current, and complete information. You are responsible for:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Maintaining the confidentiality of your account credentials.</li>
              <li>All activities that occur under your account.</li>
              <li>Promptly notifying us of any unauthorized use of your account.</li>
              <li>Ensuring that your account information remains accurate and up to date.</li>
            </ul>
            <p>
              You must be at least 18 years of age and have the legal authority to enter into these Terms. If you are using the Service on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms.
            </p>
            <p>
              We reserve the right to suspend or terminate accounts that violate these Terms or that have been inactive for an extended period.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-ezen-primary font-heading">
              4. Usage Policies
            </h2>
            <p>
              You agree to use the Service in compliance with all applicable laws and regulations, including but not limited to telecommunications regulations, anti-spam laws, and data protection legislation. You shall not:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Send unsolicited emails (spam) or emails without proper consent from recipients.</li>
              <li>Use the Service for any illegal, fraudulent, or harmful purpose.</li>
              <li>Transmit content that is defamatory, obscene, threatening, or violates intellectual property rights.</li>
              <li>Attempt to gain unauthorized access to the Service, other accounts, or related systems.</li>
              <li>Interfere with or disrupt the integrity or performance of the Service.</li>
              <li>Resell, sublicense, or redistribute the Service without prior written consent.</li>
              <li>Use the Service to send emails in violation of provider guidelines (such as Gmail or Outlook program policies).</li>
              <li>Exceed rate limits or use automated tools to abuse the platform.</li>
            </ul>
            <p>
              Violation of these usage policies may result in immediate suspension or termination of your account without refund.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-ezen-primary font-heading">
              5. Payment Terms
            </h2>
            <p>
              All pricing is denominated in Indian Rupees (INR) unless otherwise specified. Payment terms are as follows:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Subscription Plans</strong> — Billed monthly or annually in advance. Your subscription will automatically renew at the end of each billing cycle unless cancelled prior to renewal.
              </li>
              <li>
                <strong>Messaging & Processing Credits</strong> — Prepaid credits for email processing and generation are purchased in advance and deducted per-run or per-message according to the published rates.
              </li>
              <li>
                <strong>Taxes</strong> — All prices are exclusive of applicable taxes, including GST. Taxes will be added to your invoice as required by Indian tax law.
              </li>
              <li>
                <strong>Late Payments</strong> — Overdue invoices may incur a late fee of 1.5% per month. We reserve the right to suspend access to the Service for non-payment.
              </li>
            </ul>
            <p>
              For information about refunds, please refer to our <a href="/refund-policy" className="text-ezen-primary underline">Refund Policy</a>.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-ezen-primary font-heading">
              6. Intellectual Property
            </h2>
            <p>
              All intellectual property rights in the Service, including but not limited to software, APIs, templates, models, documentation, trademarks, logos, and design elements, are owned by Ezen AI or its licensors. These Terms do not grant you any rights to use our trademarks, trade names, or branding without prior written consent.
            </p>
            <p>
              You retain ownership of all content you transmit through the Service. By using the Service, you grant Ezen AI a limited, non-exclusive license to process your content solely for the purpose of delivering the Service.
            </p>
            <p>
              Any feedback, suggestions, or ideas you provide regarding the Service may be used by Ezen AI without any obligation to compensate you.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-ezen-primary font-heading">
              7. Data Protection
            </h2>
            <p>
              We are committed to protecting your data and the data of your customers. Our data handling practices are governed by our <a href="/privacy-policy" className="text-ezen-primary underline">Privacy Policy</a>, which details how we collect, use, store, and share personal data.
            </p>
            <p>
              Key commitments:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>We process personal data only as necessary to provide the Service.</li>
              <li>We implement industry-standard security measures to protect data.</li>
              <li>We do not sell personal data to third parties.</li>
              <li>We comply with applicable data protection regulations, including the Information Technology Act, 2000 (India) and GDPR where applicable.</li>
            </ul>
            <p>
              You are responsible for ensuring that you have obtained all necessary consents and permissions to share data with us and to send communications to your end users through the Service.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-ezen-primary font-heading">
              8. Service Availability
            </h2>
            <p>
              Ezen AI strives to maintain a 99.9% uptime Service Level Agreement (SLA) for its platform APIs and dashboard.
            </p>
            <p>
              The uptime SLA does not cover:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Scheduled maintenance (with at least 24 hours advance notice).</li>
              <li>Force majeure events, including natural disasters, war, or government action.</li>
              <li>Failures caused by third-party services, including OpenAI, Google Cloud, Microsoft Azure, or telecom/internet providers.</li>
              <li>Issues resulting from your misuse of the Service or non-compliance with documentation.</li>
            </ul>
            <p>
              In the event of downtime exceeding the SLA commitment, eligible customers on paid plans may request service credits in accordance with our SLA policy. Service credits are the sole and exclusive remedy for any downtime or performance issues.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-ezen-primary font-heading">
              9. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable law:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Ezen AI shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, business opportunities, or goodwill.</li>
              <li>Our total aggregate liability for any claims arising from or related to the Service shall not exceed the total amount paid by you to Ezen AI in the twelve (12) months preceding the event giving rise to the claim.</li>
              <li>We are not liable for the content of emails processed, generated, or sent through our platform by users.</li>
              <li>We are not responsible for the actions, policies, or technical issues of third-party services integrated with our platform, including Google, Microsoft, OpenAI, or host providers.</li>
            </ul>
          </section>

          {/* Section 10 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-ezen-primary font-heading">
              10. Termination
            </h2>
            <p>
              Either party may terminate these Terms:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You may cancel your account at any time through the dashboard or by contacting <a href="mailto:support@ezen.ai" className="text-ezen-primary underline">support@ezen.ai</a>. Cancellation takes effect at the end of the current billing period.</li>
              <li>We may suspend or terminate your account immediately if you breach these Terms, engage in prohibited activities, or fail to pay outstanding invoices.</li>
              <li>We may terminate the Service or your account with 30 days written notice for any reason.</li>
            </ul>
            <p>
              Upon termination, your access to the Service will be revoked. Any unused prepaid credits will be handled in accordance with our Refund Policy. We will retain your data for 30 days, after which it will be permanently deleted unless required by law.
            </p>
          </section>

          {/* Section 11 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-ezen-primary font-heading">
              11. Governing Law & Dispute Resolution
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India, without regard to conflict of law principles.
            </p>
            <p>
              Any disputes arising out of or relating to these Terms or the Service shall first be attempted to be resolved through good-faith negotiation. If the dispute cannot be resolved within 30 days, it shall be submitted to binding arbitration under the Arbitration and Conciliation Act, 1996, with the seat of arbitration in Salem, Tamil Nadu, India.
            </p>
            <p>
              The courts of Salem, Tamil Nadu, India shall have exclusive jurisdiction over any matters not subject to arbitration.
            </p>
          </section>

          {/* Section 12 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-ezen-primary font-heading">
              12. Modifications to Terms
            </h2>
            <p>
              We reserve the right to modify these Terms at any time. When we make material changes, we will update the "Last Updated" date at the top of this page and provide at least 15 days notice before material changes take effect. Your continued use of the Service after the effective date constitutes acceptance of the updated Terms.
            </p>
          </section>

          {/* Section 13 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-ezen-primary font-heading">
              13. Contact Information
            </h2>
            <p>
              If you have any questions about these Terms & Conditions, please contact us:
            </p>
            <ul className="space-y-1">
              <li>• <strong>Email:</strong> <a href="mailto:support@ezen.ai" className="text-ezen-primary underline">support@ezen.ai</a></li>
              <li>• <strong>Website:</strong> <a href="https://ezen.ai" className="text-ezen-primary underline">https://ezen.ai</a></li>
              <li>• <strong>Address:</strong> Ezen AI, Salem, Tamil Nadu, India</li>
            </ul>
            <p className="text-xs text-ezen-outline mt-2">
              For legal inquiries, please include "Legal" in your email subject line for prioritized handling.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
