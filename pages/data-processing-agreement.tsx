import React from "react";
import { useRouter } from "next/router";

export default function DataProcessingAgreementPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-900 text-white py-10 px-4 md:px-16 lg:px-32">
      {/* Title and Intro */}
      <h1 className="text-3xl md:text-4xl font-bold text-gold-500 mb-6">
        Data Processing Agreement (PBC Data Ownership & UAE PDPL Alignment)
      </h1>
      <p className="text-sm text-gray-400 mb-10">
        Effective Date: 07 January 2026
      </p>

      <p className="mb-6">
        This Data Processing Agreement (“Agreement” or “DPA”) is effective as of
        07 January 2026. This Agreement establishes the mandatory data
        protection, privacy, and security requirements governing the processing
        of Personal Data owned by Pakistan Business Council (PBC) in connection
        with PBC’s digital platforms, applications, systems, and operations.
      </p>

      {/* Section 1: Data Ownership */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          1. Data Ownership & Authority
        </h2>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>
            <strong>1.1</strong> Pakistan Business Council (PBC) is the sole
            Data Owner and Data Controller of all Personal Data processed under
            this Agreement.
          </li>
          <li>
            <strong>1.2</strong> All Processing activities are performed
            exclusively under PBC’s authority, instructions, and control.
          </li>
          <li>
            <strong>1.3</strong> No party processing PBC data shall:
            <ul className="list-disc list-inside ml-6 mt-1">
              <li>Claim ownership or intellectual property rights over the data</li>
              <li>Determine independent purposes or means of processing</li>
              <li>
                Use PBC data for analytics, profiling, benchmarking, training,
                or secondary purposes
              </li>
            </ul>
          </li>
          <li>
            <strong>1.4</strong> This DPA prevails over any conflicting privacy,
            security, or data-related terms.
          </li>
        </ul>
      </section>

      {/* Section 2: Legal Basis */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          2. Legal Basis & Definitions
        </h2>
        <p className="mb-2 text-gray-300">This Agreement is aligned with:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>
            UAE Federal Decree-Law No. 45 of 2021 (Personal Data Protection Law
            – PDPL)
          </li>
          <li>Executive Regulations and applicable UAE data protection guidance</li>
        </ul>
        <p className="mt-2 text-gray-300">
          Capitalized terms such as Personal Data, Sensitive Personal Data,
          Processing, Controller, Data Subject, and Personal Data Breach shall
          have the meanings assigned under PDPL.
        </p>
      </section>

      {/* Section 3: Scope */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          3. Scope of Processing
        </h2>
        <div className="space-y-3 text-gray-300">
          <p>
            <strong className="text-white">Nature of Processing:</strong>{" "}
            Collection, recording, storage, hosting, access, use, transmission,
            analysis, support, maintenance, backup, archival, and deletion —
            strictly for PBC-authorized purposes.
          </p>
          <p>
            <strong className="text-white">Purpose of Processing:</strong>{" "}
            Operation, management, delivery, support, and improvement of
            PBC-controlled platforms, applications, services, and internal
            systems.
          </p>
          <p>
            <strong className="text-white">Duration:</strong> Processing shall
            continue only for the period authorized by PBC, or as required by
            applicable law.
          </p>
        </div>
      </section>

      {/* Section 4: Categories */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          4. Categories of Data
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
          <div>
            <strong className="text-white block mb-1">Data Subjects:</strong>
            <ul className="list-disc list-inside">
              <li>PBC members</li>
              <li>Application users</li>
              <li>Employees and contractors</li>
              <li>Stakeholders and authorized users</li>
            </ul>
          </div>
          <div>
            <strong className="text-white block mb-1">Types of Personal Data:</strong>
            <ul className="list-disc list-inside">
              <li>Identifiers (name, email, phone number)</li>
              <li>Organizational affiliation and role</li>
              <li>Device, usage, and log data</li>
              <li>Support, communication, and interaction data</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 5: Processing Obligations */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          5. Processing Obligations
        </h2>
        <p className="mb-2 text-gray-300">All Processing of PBC data shall:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>Be performed only on documented instructions issued by PBC</li>
          <li>Be limited to the minimum data necessary</li>
          <li>Maintain strict confidentiality</li>
          <li>Prevent unauthorized access, disclosure, alteration, or loss</li>
          <li>Support PBC’s compliance with PDPL and applicable regulations</li>
          <li>Immediately escalate any data protection or security risks to PBC</li>
        </ul>
      </section>

      {/* Section 6: Security */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          6. Security Measures (PDPL Article 20)
        </h2>
        <p className="mb-2 text-gray-300">
          Appropriate technical and organizational measures shall be
          implemented, including:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>Role-based and least-privilege access controls</li>
          <li>Strong authentication mechanisms</li>
          <li>Data encryption in transit and at rest (where applicable)</li>
          <li>Secure infrastructure and hosting environments</li>
          <li>Logging, monitoring, and anomaly detection</li>
          <li>Regular vulnerability management and patching</li>
        </ul>
        <p className="mt-2 text-gray-300 italic">
          Security measures shall be proportionate to data sensitivity and risk.
        </p>
      </section>

      {/* Section 7: Sub-Processing */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          7. Sub-Processing & Delegation
        </h2>
        <p className="text-gray-300 mb-2">
          No Personal Data may be further delegated, accessed, or processed by
          any other entity <strong>without explicit written authorization from PBC</strong>.
        </p>
        <p className="text-gray-300">
          PBC retains full control over approval, oversight, scope, and
          termination of any delegated processing activities.
        </p>
      </section>

      {/* Section 8: Cross-Border */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          8. Cross-Border Data Transfers
        </h2>
        <p className="mb-2 text-gray-300">
          Where Personal Data is accessed or transferred outside the UAE:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>Such transfer shall occur only with written authorization from PBC</li>
          <li>Adequate protection measures under PDPL must be ensured</li>
          <li>
            Contractual, technical, and organizational safeguards must be
            applied
          </li>
          <li>PBC data sovereignty requirements shall prevail</li>
        </ul>
      </section>

      {/* Section 9: Data Subject Rights */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          9. Data Subject Rights
        </h2>
        <p className="mb-2 text-gray-300">
          Assistance shall be provided to PBC to enable compliance with Data
          Subject rights, including:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>Access and data portability</li>
          <li>Rectification or erasure</li>
          <li>Restriction or objection to processing</li>
          <li>Withdrawal of consent</li>
        </ul>
        <p className="mt-2 text-gray-300">
          All actions must align with PDPL timelines and instructions.
        </p>
      </section>

      {/* Section 10: Breach Management */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          10. Personal Data Breach Management
        </h2>
        <p className="mb-2 text-gray-300">
          In the event of a Personal Data Breach:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>
            PBC shall be notified immediately and no later than 24 hours
          </li>
          <li>
            Full details shall be provided, including nature, cause, impact,
            and remediation
          </li>
          <li>
            Full cooperation with investigations and regulatory requirements is
            mandatory
          </li>
        </ul>
      </section>

      {/* Section 11: Audit */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          11. Audit & Compliance
        </h2>
        <p className="text-gray-300">
          PBC reserves the right to request compliance evidence, conduct audits
          or assessments, and require corrective actions. Audit rights may be
          exercised directly or through appointed representatives.
        </p>
      </section>

      {/* Section 12: Retention */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          12. Data Retention, Return & Deletion
        </h2>
        <p className="mb-2 text-gray-300">
          Upon completion, termination, or instruction from PBC:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>All Personal Data shall be securely deleted or returned</li>
          <li>No copies, backups, or derivatives shall be retained</li>
          <li>Written confirmation of deletion shall be provided</li>
        </ul>
        <p className="mt-2 text-gray-300">
          Retention is permitted only where legally required.
        </p>
      </section>

      {/* Section 13: Confidentiality */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          13. Confidentiality
        </h2>
        <p className="text-gray-300">
          All Personal Data and related information constitute confidential
          assets of PBC and shall not be disclosed except as authorized by PBC
          or where legally required.
        </p>
      </section>

      {/* Section 14: Liability */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          14. Liability & Indemnification
        </h2>
        <p className="text-gray-300">
          Any unauthorized, unlawful, or negligent processing resulting in harm,
          regulatory action, or loss shall give rise to full liability and
          indemnification obligations in favor of PBC.
        </p>
      </section>

      {/* Section 15: Governing Law */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          15. Governing Law & Jurisdiction
        </h2>
        <p className="text-gray-300">
          This Agreement shall be governed by the laws of the United Arab
          Emirates. UAE courts shall have exclusive jurisdiction.
        </p>
      </section>

      {/* Section 16: Term */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          16. Term
        </h2>
        <p className="text-gray-300">
          This DPA remains effective until all PBC Personal Data has been
          permanently deleted or returned in accordance with this Agreement.
        </p>
      </section>

      {/* Section 17: Precedence */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          17. Order of Precedence
        </h2>
        <p className="mb-2 text-gray-300">In the event of conflict:</p>
        <ol className="list-decimal list-inside space-y-1 text-gray-300">
          <li>This DPA</li>
          <li>Any underlying agreement</li>
          <li>Any other documentation</li>
        </ol>
      </section>

       {/* Section 18: Contact */}
       <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold-500 mb-2">
          18. Contact
        </h2>
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
