'use client';

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { firestore } from "@/utils/firebase";
import { doc, updateDoc, setDoc } from "firebase/firestore";

interface GiftGrant {
  key: string;
  customerName: string;
  customerEmail: string;
  plan: string;
  maxMachines: number;
  giftNote?: string;
}

export function FreeGiftClaimModal() {
  const { currentUser } = useAuth();
  const [grant, setGrant] = useState<GiftGrant | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [claimedData, setClaimedData] = useState<{
    key: string;
    email: string;
    password?: string;
    plan: string;
  } | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [copiedKey, setCopiedKey] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check for unclaimed gift when user is logged in
  useEffect(() => {
    if (!currentUser?.email) {
      setGrant(null);
      setIsOpen(false);
      return;
    }

    let isMounted = true;
    const checkGift = async () => {
      try {
        const res = await fetch(`/api/license/gift-check?email=${encodeURIComponent(currentUser.email!)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.success && data.hasGift && data.grant) {
          setGrant(data.grant);
          setName(currentUser.displayName || data.grant.customerName || "");
          setIsOpen(true);
        }
      } catch (err) {
        console.warn("Error checking for gift grant:", err);
      }
    };

    checkGift();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.email]);

  if (!isOpen || !grant) return null;

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("Please enter your name.");
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg("Please create an App Password with at least 6 characters.");
      return;
    }

    if (!phone.trim()) {
      setErrorMsg("Please enter your contact phone number.");
      return;
    }

    setLoading(true);
    const nowIso = new Date().toISOString();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = currentUser?.email || grant.customerEmail;
    const cleanKey = grant.key;

    try {
      // 1. Try server-side API claim
      let apiSuccess = false;
      try {
        const res = await fetch("/api/license/gift-claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: cleanKey,
            email: cleanEmail,
            name: cleanName,
            password: password,
            phone: cleanPhone,
            uid: currentUser?.uid,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          apiSuccess = true;
        }
      } catch (apiErr) {
        console.warn("Server API gift-claim attempt warning, attempting client fallback:", apiErr);
      }

      // 2. Client SDK Write (Guaranteed with authenticated user session)
      if (!apiSuccess && currentUser?.uid) {
        const licensePayload = {
          claimStatus: "claimed",
          claimed: true,
          status: "active",
          claimedAt: nowIso,
          claimedByUid: currentUser.uid,
          customerName: cleanName,
          customerEmail: cleanEmail,
          appPassword: password,
          phone: cleanPhone,
        };

        const userUpdate = {
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          appPassword: password,
          personalCloud: {
            activated: true,
            licenseKey: cleanKey,
            plan: grant.plan || "pro",
            maxMachines: grant.maxMachines || 3,
            appPassword: password,
            claimedAt: nowIso,
            isGift: true,
          },
          updatedAt: nowIso,
        };

        try {
          await updateDoc(doc(firestore, "licenses", cleanKey), licensePayload);
        } catch (licErr) {
          console.warn("License doc client update note:", licErr);
        }
        await setDoc(doc(firestore, "users", currentUser.uid), userUpdate, { merge: true });
      }

      setClaimedData({
        key: cleanKey,
        email: cleanEmail || "",
        password: password,
        plan: grant.plan,
      });
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setGrant(null);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0e111a] border border-indigo-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(99,102,241,0.25)] text-white overflow-hidden">
        
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-indigo-500 to-purple-500"></div>

        {!claimedData ? (
          <div>
            {/* Top Badge */}
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                <span>🎁</span>
                <span>Complimentary Free Grant (₹0 Payment)</span>
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="text-gray-400 hover:text-white text-lg transition p-1"
                title="Dismiss"
              >
                ✕
              </button>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-black text-white mb-1.5 flex items-center gap-2">
              <span>Personal Cloud Access Unlocked!</span>
            </h2>
            <p className="text-xs text-gray-300 leading-relaxed mb-5">
              You have been gifted full lifetime access to <b>Personal Cloud {(grant.plan || "PRO").toUpperCase()}</b>! Complete your details below to activate your PC application credentials with zero payment.
            </p>

            {errorMsg && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl p-3 mb-4 flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleClaim} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Alex Smith"
                  className="w-full bg-[#07090e] border border-white/10 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition"
                />
              </div>

              {/* Email Address (Pre-locked to verified account) */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">SoftwareHubs Account Email</label>
                <div className="flex items-center justify-between w-full bg-[#07090e]/60 border border-white/10 rounded-xl px-4 py-3 text-gray-300 text-sm">
                  <span>{currentUser?.email}</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                    ✓ Verified
                  </span>
                </div>
              </div>

              {/* App Password for Desktop App */}
              <div className="bg-gradient-to-r from-indigo-950/40 to-purple-950/40 border border-indigo-500/30 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-extrabold text-indigo-300 flex items-center gap-1.5">
                    <span>🔑</span>
                    <span>Create App Password (For PC Login) *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-200 font-medium"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Set your PC app password (min. 6 characters)"
                  className="w-full bg-[#07090e] border border-indigo-500/40 focus:border-indigo-400 rounded-xl px-4 py-3 text-white text-sm outline-none transition"
                />
                <span className="text-[11px] text-indigo-200/70 mt-1.5 block leading-relaxed">
                  👉 <b>Important:</b> You will type this password into the <b>Personal Cloud Pro</b> app on your Windows PC to unlock your server!
                </span>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Phone Number (For WhatsApp / Support) *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="e.g. +91 9876543210"
                  className="w-full bg-[#07090e] border border-white/10 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-black text-sm py-4 rounded-xl transition shadow-[0_0_25px_rgba(99,102,241,0.35)] mt-3 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Claiming Complimentary License...</span>
                ) : (
                  <>
                    <span>Claim Free Lifetime Access (₹0)</span>
                    <i className="fa-solid fa-arrow-right text-xs"></i>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Success Screen */
          <div className="text-center py-2 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 text-2xl">
              ✓
            </div>
            <h2 className="text-2xl font-black text-white mb-1">
              Personal Cloud Pro Unlocked!
            </h2>
            <p className="text-xs text-gray-300 mb-6">
              Your free lifetime license has been permanently activated. You can now log into the desktop PC app!
            </p>

            <div className="bg-[#07090e] border border-white/10 rounded-2xl p-4 text-left space-y-2.5 text-xs mb-6">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-gray-400">Desktop Login Email:</span>
                <span className="font-mono font-bold text-white">{claimedData.email}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-gray-400">Desktop App Password:</span>
                <span className="font-mono font-bold text-indigo-400">{claimedData.password}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">License Key:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-emerald-400">{claimedData.key}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(claimedData.key);
                      setCopiedKey(true);
                      setTimeout(() => setCopiedKey(false), 2000);
                    }}
                    className="text-gray-400 hover:text-white text-[11px]"
                  >
                    {copiedKey ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href="/downloads/PersonalCloud-Pro-Setup.exe"
                download
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold text-sm py-3.5 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-download"></i>
                <span>Download Windows PC App (.exe)</span>
              </a>
              <button
                type="button"
                onClick={handleClose}
                className="w-full bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs py-3 rounded-xl transition"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
