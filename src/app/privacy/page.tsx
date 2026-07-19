"use client";

import React from "react";
import { LegalLayout } from "../../components/LegalLayout";

export default function PrivacyPage() {
  return (
    <LegalLayout
      title={
        <>
          Privacy <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Policy</span>
        </>
      }
      subtitle="Last Updated: May 2026"
    >
      <div className="bg-dark-800/40 p-8 md:p-12 rounded-[2rem] border border-white/5 space-y-8 backdrop-blur-md text-sm md:text-base leading-relaxed text-gray-300">
        <p className="font-light">At Harsh Edits, we value your privacy and are committed to protecting your personal data.</p>

        <div>
          <h2 className="text-xl font-bold text-white mb-3">1. Information We Collect</h2>
          <p className="text-gray-400 text-sm">
            We collect information you provide directly to us, such as your name, email address, and profile
            information when you create an account or make a purchase.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-white mb-3">2. How We Use Your Information</h2>
          <p className="text-gray-400 text-sm">
            Your data is used to provide access to downloads, manage Pro memberships, and send important
            updates about the site and resources.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-white mb-3">3. Data Security</h2>
          <p className="text-gray-400 text-sm font-light">
            We implement a variety of security measures to maintain the safety of your personal information.
            Your sensitive data (like passwords or tokens) is encrypted.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-white mb-3">4. Cookies</h2>
          <p className="text-gray-400 text-sm">
            We use cookies to enhance your experience, remember your preferences, and analyze site traffic.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-white mb-3">5. Third-Party Services</h2>
          <p className="text-gray-400 text-sm">
            We use Firebase for authentication and database management, and Razorpay for payment processing.
            These services have their own privacy policies.
          </p>
        </div>
      </div>
    </LegalLayout>
  );
}
