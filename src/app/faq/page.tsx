"use client";

import React, { useState } from "react";
import { LegalLayout } from "../../components/LegalLayout";
import Link from "next/link";

interface FaqItem {
  q: string;
  a: string;
}

export default function FaqPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  const generalFaqs: FaqItem[] = [
    {
      q: "How do I download resources?",
      a: "Simply browse through the sections, find the item you need, and click on it. You will see detailed information and a download button. You need to be logged in to access downloads.",
    },
    {
      q: "What is Pro Access?",
      a: "Pro Access is a lifetime membership that gives you unlimited access to all premium software, plugins, scripts, and assets. One-time payment, lifetime updates!",
    },
    {
      q: "Is it safe to download?",
      a: "Yes! All resources shared on Harsh Edits are verified by our team and used personally by Harsh Edits for creative projects.",
    },
  ];

  const accountFaqs: FaqItem[] = [
    {
      q: "Why do I need to log in?",
      a: "Logging in helps us track your downloads and manage your Pro Access. It also allows you to save your favorite resources for quick access later.",
    },
    {
      q: "What payment methods are accepted?",
      a: "We accept all major UPI apps (GPay, PhonePe, Paytm), Credit/Debit cards, and Net Banking through our secure Razorpay gateway.",
    },
  ];

  return (
    <LegalLayout
      title={
        <>
          Help <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">& FAQ</span>
        </>
      }
      subtitle="Everything you need to know about Harsh Edits."
    >
      <div className="space-y-12">
        {/* General section */}
        <div>
          <h2 className="text-xl font-bold text-white mb-6 px-4 border-l-4 border-indigo-600">
            General Questions
          </h2>
          <div className="space-y-4">
            {generalFaqs.map((faq, i) => {
              const idx = i;
              const isOpen = openIdx === idx;
              return (
                <div
                  key={idx}
                  className="faq-item"
                  onClick={() => toggle(idx)}
                >
                  <div className="faq-question">
                    <span className="text-white font-semibold text-sm">{faq.q}</span>
                    <i
                      className={`fa-solid fa-chevron-down text-gray-500 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    ></i>
                  </div>
                  {isOpen && (
                    <div className="faq-answer px-4 pb-4">
                      <p className="text-gray-400 text-xs leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Account section */}
        <div>
          <h2 className="text-xl font-bold text-white mb-6 px-4 border-l-4 border-purple-600">
            Account & Payment
          </h2>
          <div className="space-y-4">
            {accountFaqs.map((faq, i) => {
              const idx = i + generalFaqs.length;
              const isOpen = openIdx === idx;
              return (
                <div
                  key={idx}
                  className="faq-item"
                  onClick={() => toggle(idx)}
                >
                  <div className="faq-question">
                    <span className="text-white font-semibold text-sm">{faq.q}</span>
                    <i
                      className={`fa-solid fa-chevron-down text-gray-500 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    ></i>
                  </div>
                  {isOpen && (
                    <div className="faq-answer px-4 pb-4">
                      <p className="text-gray-400 text-xs leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Still have questions */}
        <div className="bg-dark-800/40 border border-white/5 text-center p-8 md:p-12 rounded-[2rem] backdrop-blur-md">
          <h2 className="text-2xl font-bold text-white mb-2">Still have questions?</h2>
          <p className="text-gray-400 text-xs mb-6">
            Can't find what you're looking for? Reach out to our support team.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/contact"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs px-8 py-3 rounded-full shadow-lg transition-all"
            >
              Contact Support
            </Link>
            <a
              href="https://discord.gg/harshedits"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-indigo-600/10 border border-indigo-600/30 hover:bg-indigo-600/20 text-white font-bold text-xs px-8 py-3 rounded-full transition-all"
            >
              Join Discord
            </a>
          </div>
        </div>
      </div>
    </LegalLayout>
  );
}
