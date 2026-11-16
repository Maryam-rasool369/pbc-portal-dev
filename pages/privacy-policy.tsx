import React from "react";
import { useRouter } from "next/router";

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-900 text-white py-10 px-4 md:px-16 lg:px-32">
      {/* Title and Intro */}
      <h1 className="text-3xl md:text-4xl font-bold text-gold-500 mb-6">
        Pakistan Business Council Mobile Application (UAE PDPL–Aligned Version)
      </h1>
      <p className="text-sm text-gray-400 mb-10">
        Effective Date: 15 January 2026 | Last Updated: 7 January 2026
      </p>

      <p className="mb-6">
        Pakistan Business Council (“PBC”, “we”, “us”, or “our”) is committed to
        protecting personal data in accordance with the UAE Personal Data
        Protection Law (PDPL) and applicable international privacy standards.
      </p>
      <p className="mb-8">
        This Privacy Policy explains how personal data is collected, processed,
        stored, shared, and protected when you use the Pakistan Business Council
        mobile application (“App”) available on Google Play Store and Apple App
        Store.
      </p>

      {/* Section 1: Definitions */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          1. Definitions (PDPL-Aligned)
        </h2>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>
            <strong className="text-white">Personal Data:</strong> Any data
            relating to an identified or identifiable natural person.
          </li>
          <li>
            <strong className="text-white">Data Subject:</strong> The individual
            whose personal data is processed.
          </li>
          <li>
            <strong className="text-white">Processing:</strong> Any operation
            performed on personal data, including collection, storage, use,
            disclosure, or deletion.
          </li>
          <li>
            <strong className="text-white">Controller:</strong> Pakistan
            Business Council.
          </li>
        </ul>
      </section>

      {/* Section 2: Lawful Basis */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          2. Lawful Basis for Processing (PDPL – Article 4)
        </h2>
        <p className="mb-2">
          We process personal data only on one or more of the following lawful
          bases:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>Your explicit consent.</li>
          <li>Performance of a contract or membership relationship.</li>
          <li>Compliance with legal or regulatory obligations.</li>
          <li>
            Protection of legitimate interests of PBC, provided such interests
            do not override your rights.
          </li>
        </ul>
        <p className="mt-2 text-sm italic">
          Consent may be withdrawn at any time.
        </p>
      </section>

      {/* Section 3: Data Collected */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          3. Personal Data We Collect
        </h2>

        <h3 className="text-lg font-medium text-white mt-4 mb-2">
          3.1 Data Provided Directly by You
        </h3>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>Name</li>
          <li>Email address</li>
          <li>Phone number</li>
          <li>Organization / employer</li>
          <li>Job title or business role</li>
          <li>Membership credentials (if applicable)</li>
        </ul>

        <h3 className="text-lg font-medium text-white mt-4 mb-2">
          3.2 Automatically Collected Data
        </h3>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>Device type, operating system, app version</li>
          <li>IP address and approximate geographic location</li>
          <li>App usage logs and interaction data</li>
          <li>Crash and diagnostic data</li>
        </ul>

        <h3 className="text-lg font-medium text-white mt-4 mb-2">
          3.3 Communications
        </h3>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>Support requests</li>
          <li>Feedback</li>
          <li>Emails or messages sent through the App</li>
        </ul>
      </section>

      {/* Section 4: Purpose */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          4. Purpose of Data Processing
        </h2>
        <p className="mb-2">
          Your personal data is processed for the following purposes:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>Providing access to App features and services</li>
          <li>Managing memberships and user accounts</li>
          <li>Sending announcements, events, and publications</li>
          <li>Improving App performance and security</li>
          <li>Responding to inquiries and support requests</li>
          <li>Meeting legal, regulatory, and audit obligations</li>
        </ul>
        <p className="mt-2 text-gray-300">
          Data is not processed for purposes incompatible with those stated
          above.
        </p>
      </section>

      {/* Section 5: Minimization */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          5. Data Minimization & Accuracy
        </h2>
        <p className="text-gray-300">
          We collect only data that is necessary for the stated purposes and
          take reasonable steps to ensure personal data is accurate and up to
          date, in accordance with PDPL principles.
        </p>
      </section>

      {/* Section 6: Push Notifications */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          6. Push Notifications
        </h2>
        <p className="mb-2">The App may send notifications related to:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>Events and announcements</li>
          <li>Membership updates</li>
          <li>Policy changes</li>
        </ul>
        <p className="mt-2 text-gray-300">
          You may disable notifications through your device settings at any
          time.
        </p>
      </section>

      {/* Section 7: Data Sharing */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          7. Data Sharing & Disclosure
        </h2>
        <p className="mb-2 font-bold text-white">
          Personal data is never sold or rented.
        </p>
        <p className="mb-2">Data may be shared only with:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>
            Authorized service providers (hosting, analytics, communication
            tools)
          </li>
          <li>
            Regulatory or law enforcement authorities when legally required
          </li>
          <li>
            Parties where disclosure is necessary to protect rights, security,
            or compliance
          </li>
        </ul>
        <p className="mt-2 text-gray-300">
          All third parties are bound by confidentiality and data protection
          obligations.
        </p>
      </section>

      {/* Section 8: Cross-Border */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          8. Cross-Border Data Transfers (PDPL – Article 22)
        </h2>
        <p className="mb-2">
          Personal data may be transferred outside the UAE where:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>Adequate data protection safeguards are in place</li>
          <li>The transfer is necessary to provide App services</li>
          <li>Contractual and technical protections are implemented</li>
        </ul>
        <p className="mt-2 text-gray-300">
          We ensure cross-border transfers comply with PDPL requirements.
        </p>
      </section>

      {/* Section 9: Retention */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          9. Data Retention
        </h2>
        <p className="mb-2">Personal data is retained:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>Only for as long as necessary to fulfill stated purposes</li>
          <li>
            In accordance with legal, regulatory, and contractual obligations
          </li>
        </ul>
        <p className="mt-2 text-gray-300">
          Data is securely deleted or anonymized once retention is no longer
          required.
        </p>
      </section>

      {/* Section 10: Security */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          10. Data Security (PDPL – Article 20)
        </h2>
        <p className="mb-2">
          We implement appropriate technical and organizational measures,
          including:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>Secure servers and access controls</li>
          <li>Data encryption where applicable</li>
          <li>Restricted access on a need-to-know basis</li>
        </ul>
        <p className="mt-2 text-gray-300">
          While we take reasonable measures, no system can guarantee absolute
          security.
        </p>
      </section>

      {/* Section 11: Data Subject Rights */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          11. Data Subject Rights (PDPL – Articles 13–18)
        </h2>
        <p className="mb-2">You have the right to:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>Access your personal data</li>
          <li>Request correction or updating of data</li>
          <li>Request deletion or erasure (subject to legal requirements)</li>
          <li>Restrict or object to processing</li>
          <li>Withdraw consent at any time</li>
          <li>Request information about data transfers</li>
        </ul>
        <p className="mt-2 text-gray-300">
          Requests may be submitted via the contact details below.
        </p>
      </section>

      {/* Section 12: Children */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          12. Children’s Data
        </h2>
        <p className="text-gray-300">
          The App is <strong className="text-white">not intended for individuals under 18 years of age</strong>. We
          do not knowingly process children’s personal data.
        </p>
      </section>

      {/* Section 13: Third-Party Links */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          13. Third-Party Links
        </h2>
        <p className="text-gray-300">
          The App may contain links to external websites or platforms. We are
          not responsible for their data protection practices and encourage
          reviewing their privacy policies separately.
        </p>
      </section>

      {/* Section 14: Disclaimer */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          14. App Store & Platform Disclaimer
        </h2>
        <p className="text-gray-300">
          This App is operated by Pakistan Business Council. Apple Inc. and
          Google LLC bear no responsibility for data handling, privacy
          practices, or support related to this App.
        </p>
      </section>

      {/* Section 15: Changes */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          15. Changes to This Privacy Policy
        </h2>
        <p className="text-gray-300">
          We may update this Privacy Policy periodically. Updates will be
          reflected by revising the “Last Updated” date. Continued use of the
          App constitutes acceptance of the revised policy.
        </p>
      </section>

      {/* Section 16: Contact */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          16. Contact & Data Protection Requests
        </h2>
        <p className="mb-4 text-gray-300">
          For privacy-related inquiries or to exercise your PDPL rights,
          contact:
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

      {/* Navigation Button */}
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
