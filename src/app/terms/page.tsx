"use client";

import React from "react";
import { LegalLayout } from "../../components/LegalLayout";

export default function TermsPage() {
  return (
    <LegalLayout
      title={
        <>
          Terms of <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Service</span>
        </>
      }
      subtitle="Last Updated: May 2026"
    >
      <div className="bg-dark-800/40 p-8 md:p-12 rounded-[2rem] border border-white/5 space-y-8 backdrop-blur-md text-sm md:text-base leading-relaxed text-gray-300">
        <p className="font-light">
          Welcome to Harsh Edits. By accessing or using our website, you agree to comply with and be bound
          by the following terms and conditions of use.
        </p>

        <div>
          <h2 className="text-xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
          <p className="text-gray-400 text-sm">
            By using this site, you signify your agreement to these terms. If you do not agree, please do not
            use the site. We reserve the right to modify these terms at any time.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-white mb-3">2. Use of Resources</h2>
          <p className="text-gray-400 text-sm">
            The resources provided on Harsh Edits (Software, Plugins, Scripts, Assets) are for personal and
            professional use. You may not:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400 text-xs">
            <li>Redistribute or resell any items downloaded from this site.</li>
            <li>Claim ownership of any third-party software or assets.</li>
            <li>Use our resources for any illegal activities.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold text-white mb-3">3. Pro Access & Payments</h2>
          <p className="text-gray-400 text-sm font-light">
            Pro Access is a one-time payment for lifetime access to premium resources. Payments are processed
            via secure gateways. Refunds are generally not provided due to the digital nature of the
            products, except in cases of technical failure on our end.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-white mb-3">4. Limitation of Liability</h2>
          <p className="text-gray-400 text-sm">
            Harsh Edits is not responsible for any damage to your hardware or software resulting from the use
            of resources downloaded from this site. Use at your own risk.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-white mb-3">5. Account Security</h2>
          <p className="text-gray-400 text-sm">
            You are responsible for maintaining the confidentiality of your account information. Any
            unauthorized use of your account should be reported immediately.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-white mb-3">6. Licensing</h2>
          <p className="text-gray-400 text-sm">
            Unless otherwise stated, all resources on Harsh Edits are provided under a single-user license.
            You may use them in personal and commercial projects, but you cannot redistribute the raw files
            or include them in other resource packs for sale.
          </p>
        </div>
      </div>
    </LegalLayout>
  );
}
