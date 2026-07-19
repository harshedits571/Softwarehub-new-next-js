"use client";

import React, { useState } from "react";
import { LegalLayout } from "../../components/LegalLayout";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { auth, firestore } from "../../utils/firebase";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("General Inquiry");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"success" | "error" | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !message) {
      alert("Please fill in Name and Message fields.");
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.warn("Anon sign-in failed:", err);
        }
      }

      await addDoc(collection(firestore, "userMessages"), {
        name,
        email,
        subject,
        message,
        type: "Contact/Problem",
        timestamp: Timestamp.now(),
        status: "pending",
        userId: auth.currentUser ? auth.currentUser.uid : "guest",
      });

      setStatus("success");
      setName("");
      setEmail("");
      setSubject("General Inquiry");
      setMessage("");
    } catch (err) {
      console.error("Contact Form Error:", err);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LegalLayout
      title={
        <>
          Get in <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Touch</span>
        </>
      }
      subtitle="Have a question or feedback? We'd love to hear from you."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-dark-800/40 p-8 rounded-3xl border border-white/5 space-y-6 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-400">
                <i className="fa-solid fa-envelope text-xl"></i>
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Email Us</h3>
                <p className="text-gray-400 text-xs mt-0.5">harshedits57@gmail.com</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center text-purple-400">
                <i className="fa-brands fa-discord text-xl"></i>
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Discord</h3>
                <p className="text-gray-400 text-xs mt-0.5">Join our community</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-pink-600/20 rounded-xl flex items-center justify-center text-pink-400">
                <i className="fa-brands fa-instagram text-xl"></i>
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Instagram</h3>
                <p className="text-gray-400 text-xs mt-0.5">@harsh_edits_57</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-2">
          <div className="bg-dark-800/40 p-8 md:p-10 rounded-3xl border border-white/5 backdrop-blur-md">
            {status === "success" && (
              <p className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl mb-6 text-xs animate-pulse">
                Thank you for your message! We will get back to you soon.
              </p>
            )}
            {status === "error" && (
              <p className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-xs animate-pulse">
                Failed to send message. Please try again.
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-gray-400 text-xs font-semibold ml-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3.5 text-white text-xs outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-gray-400 text-xs font-semibold ml-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3.5 text-white text-xs outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-gray-400 text-xs font-semibold ml-1">Subject</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3.5 text-white text-xs outline-none focus:ring-1 focus:ring-brand-500 appearance-none cursor-pointer"
                >
                  <option>General Inquiry</option>
                  <option>Pro Access Issue</option>
                  <option>Resource Request</option>
                  <option>Bug Report</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-gray-400 text-xs font-semibold ml-1">Message</label>
                <textarea
                  rows={5}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we help you?"
                  className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3.5 text-white text-xs outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 text-xs disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </LegalLayout>
  );
}
