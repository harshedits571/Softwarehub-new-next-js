"use client";

import React from "react";
import { LegalLayout } from "../../components/LegalLayout";

export default function AboutPage() {
  return (
    <LegalLayout
      title={
        <>
          About <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Harsh Edits</span>
        </>
      }
      subtitle="Your premier destination for professional creative resources."
    >
      <div className="bg-dark-800/40 p-8 md:p-12 rounded-[2rem] border border-white/5 space-y-8 backdrop-blur-md">
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
          <p className="text-gray-300 leading-relaxed text-sm">
            Harsh Edits was founded with a single goal: to empower creators by providing high-quality,
            professional-grade tools and resources at an affordable price. We understand the challenges of
            finding verified, safe, and working plugins and software in the creative industry.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-4">What We Offer</h2>
          <p className="text-gray-300 leading-relaxed text-sm">
            Our platform serves as a curated hub where video editors, motion designers, and graphic artists can
            download premium extensions, presets, and overlays. We check every single upload to verify that it
            is free from malware, easy to install, and fully functional with modern creative suites.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Safe & Vetted Resources</h2>
          <p className="text-gray-300 leading-relaxed text-sm font-light">
            Every product listed on Harsh Edits is checked and maintained by our administrators. We aim to protect
            designers from dangerous packages and unverified links, ensuring a secure downloading workspace.
          </p>
        </div>
      </div>
    </LegalLayout>
  );
}
