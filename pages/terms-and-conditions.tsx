import React from "react";
import { useRouter } from "next/router";

export default function TermsAndConditionsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-900 text-white py-10 px-4 md:px-16 lg:px-32">
      {/* Title and Intro */}
      <h1 className="text-3xl md:text-4xl font-bold text-gold-500 mb-6">
        Terms & Conditions
      </h1>
      <p className="text-sm text-gray-400 mb-10">
        Last updated: 07 January 2026
      </p>

      <p className="mb-6">
        These Terms & Conditions (“Terms”) govern your access to and use of the
        Pakistan Business Council mobile application (“App”), available on
        Google Play Store and Apple App Store.
      </p>
      <p className="mb-6">
        By downloading, accessing, or using this App, you agree to be bound by
        these Terms. If you do not agree, please do not use the App.
      </p>

      {/* Section 1: Definitions */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          1. Definitions
        </h2>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>
            <strong className="text-white">“App”</strong> refers to the Pakistan Business Council mobile application.
          </li>
          <li>
            <strong className="text-white">“We”, “Us”, “Our”</strong> refers to Pakistan Business Council.
          </li>
          <li>
            <strong className="text-white">“User”, “You”</strong> refers to any individual or entity using the App.
          </li>
          <li>
            <strong className="text-white">“Content”</strong> includes text, data, images, documents, directories, notifications, and other materials available through the App.
          </li>
        </ul>
      </section>

      {/* Section 2: Purpose */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          2. Purpose of the App
        </h2>
        <p className="text-gray-300">
          The App is designed to provide business-related information, updates,
          networking resources, announcements, events, publications, and
          services relevant to members and stakeholders of Pakistan Business
          Council.
        </p>
      </section>

      {/* Section 3: Eligibility */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          3. Eligibility
        </h2>
        <p className="text-gray-300">
          You must be at least <strong className="text-white">18 years old</strong> or have legal capacity under applicable laws to use this App. By using the App, you confirm that you meet this requirement.
        </p>
      </section>

      {/* Section 4: User Accounts */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          4. User Accounts
        </h2>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>Some features may require registration or login.</li>
          <li>
            You are responsible for maintaining the confidentiality of your
            login credentials.
          </li>
          <li>
            You agree to provide accurate, current, and complete information.
          </li>
          <li>
            We reserve the right to suspend or terminate accounts that provide
            false or misleading information.
          </li>
        </ul>
      </section>

      {/* Section 5: Acceptable Use */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          5. Acceptable Use
        </h2>
        <p className="mb-2 text-gray-300">You agree <span className="font-bold text-white">not to</span>:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>Use the App for unlawful, fraudulent, or harmful purposes</li>
          <li>Upload or distribute malicious software or harmful code</li>
          <li>Interfere with the App’s security or functionality</li>
          <li>
            Use the App to send spam, unsolicited communications, or misleading
            information
          </li>
          <li>
            Copy, scrape, or commercially exploit App content without written
            permission
          </li>
        </ul>
      </section>

      {/* Section 6: Intellectual Property */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          6. Intellectual Property Rights
        </h2>
        <p className="text-gray-300">
          All content, trademarks, logos, designs, and materials within the App
          are the intellectual property of Pakistan Business Council or its
          licensors and are protected by applicable laws. You may not reproduce,
          modify, distribute, or create derivative works without prior written
          consent.
        </p>
      </section>

      {/* Section 7: Third-Party Links */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          7. Third-Party Services & Links
        </h2>
        <p className="text-gray-300">
          The App may contain links to third-party websites, services, or
          platforms. We do not control and are not responsible for their
          content, policies, or practices. Accessing third-party services is at
          your own risk.
        </p>
      </section>

      {/* Section 8: Disclaimer */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          8. Disclaimer
        </h2>
        <p className="text-gray-300">
          The App and its content are provided “as is” and “as available.” We do
          not guarantee accuracy, completeness, or reliability of information.
          Business, legal, or financial decisions made based on App content are
          solely your responsibility.
        </p>
      </section>

      {/* Section 9: Limitation of Liability */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          9. Limitation of Liability
        </h2>
        <p className="mb-2 text-gray-300">
          To the maximum extent permitted by law, Pakistan Business Council
          shall not be liable for any indirect, incidental, consequential, or
          special damages arising from:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>Use or inability to use the App</li>
          <li>Errors or omissions in content</li>
          <li>Unauthorized access to user data</li>
          <li>Technical failures or service interruptions</li>
        </ul>
      </section>

      {/* Section 10: Privacy */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          10. Privacy
        </h2>
        <p className="text-gray-300">
          Your use of the App is also governed by our Privacy Policy, which
          explains how we collect, use, and protect personal data. Please review
          it carefully.
        </p>
      </section>

      {/* Section 11: App Store Compliance */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          11. App Store Compliance
        </h2>
        <p className="text-gray-300">
          This App is independently operated by Pakistan Business Council. Google
          Play Store and Apple App Store are not responsible for the App or its
          content. Any claims, issues, or support requests must be directed to
          Pakistan Business Council, not Apple or Google.
        </p>
      </section>

      {/* Section 12: Termination */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          12. Termination
        </h2>
        <p className="text-gray-300">
          We reserve the right to suspend or terminate access to the App at any
          time, without notice, if these Terms are violated or if required by
          law.
        </p>
      </section>

      {/* Section 13: Updates */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          13. Updates & Modifications
        </h2>
        <p className="text-gray-300">
          We may revise these Terms from time to time. Continued use of the App
          after updates constitutes acceptance of the revised Terms. The “Last
          updated” date will reflect changes.
        </p>
      </section>

      {/* Section 14: Governing Law */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          14. Governing Law
        </h2>
        <p className="text-gray-300">
          These Terms shall be governed by and interpreted in accordance with
          the laws of <strong className="text-white">UAE</strong>, unless otherwise required by applicable
          international regulations.
        </p>
      </section>

      {/* Section 15: Contact */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          15. Contact Information
        </h2>
        <p className="mb-4 text-gray-300">
          For questions, support, or legal inquiries, please contact:
        </p>
        <div className="bg-gray-800 p-4 rounded-md">
           <p className="font-bold text-white">Pakistan Business Council</p>
           <p className="mt-2 text-gray-300">
            📧 <span className="text-gold-500">Email:</span> info@pbcdubai.ae
          </p>
          <p className="text-gray-300">
            🌐 <span className="text-gold-500">Website:</span> https://pbcdubai.ae/
          </p>
          <p className="text-gray-300">
            📍 <span className="text-gold-500">Address:</span> Cambridge Business Center Silicon Oasis, Dubai, United Arab Emirates.
          </p>
        </div>
      </section>

      <div className="mt-16">
        <button
          onClick={() => router.push("/")}
          className="bg-gold-500 text-black font-semibold px-6 py-2 rounded hover:bg-gold-400 transition"
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
}
