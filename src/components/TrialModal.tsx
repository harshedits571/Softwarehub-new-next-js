'use client';

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { auth, firestore } from "../utils/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, Timestamp } from "firebase/firestore";

interface TrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUpgrade?: () => void;
  onAlert: (msg: string, title?: string, type?: "success" | "error" | "info") => void;
}

export const TrialModal: React.FC<TrialModalProps> = ({
  isOpen,
  onClose,
  onOpenUpgrade,
  onAlert,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [activatedTrial, setActivatedTrial] = useState<{
    key: string;
    email: string;
    password?: string;
    trialEndDate: string;
  } | null>(null);

  useEffect(() => {
    if (currentUser) {
      if (!name) setName(currentUser.displayName || "");
      if (!email) setEmail(currentUser.email || "");
    }
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const pCloud = (userProfile as any)?.personalCloud;
  const hasActivePro = pCloud?.plan && pCloud?.plan !== "trial" && pCloud?.activated;
  const alreadyClaimedTrial = (userProfile as any)?.trialClaimed || pCloud?.trialClaimed;

  const handleActivateTrial = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = (email || currentUser?.email || "").trim().toLowerCase();
    if (!cleanEmail) {
      onAlert("Please enter a valid email address.", "Email Required", "error");
      return;
    }

    if (!name.trim()) {
      onAlert("Please enter your full name.", "Name Required", "error");
      return;
    }

    if (!password || password.length < 6) {
      onAlert("Please create an App Password with at least 6 characters. You will need this to sign into the Windows PC application.", "Password Required", "error");
      return;
    }

    if (!phone.trim()) {
      onAlert("Please enter your phone number.", "Phone Required", "error");
      return;
    }

    setLoading(true);
    let authenticatedUser = currentUser;

    try {
      // 1. Account Creation if not already logged in
      if (!authenticatedUser) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          authenticatedUser = cred.user;
          if (name.trim()) {
            await updateProfile(authenticatedUser, { displayName: name.trim() });
          }
        } catch (authErr: any) {
          if (authErr.code === "auth/email-already-in-use") {
            try {
              const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
              authenticatedUser = cred.user;
            } catch (signInErr: any) {
              setLoading(false);
              onAlert("An account with this email already exists. Please sign in or check your password.", "Account Exists", "error");
              return;
            }
          } else {
            setLoading(false);
            onAlert(authErr.message || "Failed to create account.", "Sign Up Error", "error");
            return;
          }
        }
      }

      if (!authenticatedUser?.uid) {
        setLoading(false);
        onAlert("Authentication required to claim trial.", "Error", "error");
        return;
      }

      // 2. Generate trial license key & dates
      const now = new Date();
      const trialStartDate = now.toISOString();
      const trialEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const licenseKey = `PCLOUD-TRIAL-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const licensePayload = {
        id: licenseKey,
        key: licenseKey,
        customerName: name.trim(),
        customerEmail: cleanEmail,
        plan: "trial",
        status: "active",
        isTrial: true,
        trialDays: 30,
        trialStartDate,
        trialEndDate,
        maxMachines: 1,
        activatedMachines: 0,
        devices: [],
        appPassword: password,
        phone: phone.trim(),
        claimed: true,
        claimedAt: trialStartDate,
        claimedByUid: authenticatedUser.uid,
        createdAt: trialStartDate,
      };

      // 3. Write license document to Firestore
      await setDoc(doc(firestore, "licenses", licenseKey), licensePayload);

      // 4. Update user profile in Firestore
      await setDoc(doc(firestore, "users", authenticatedUser.uid), {
        name: name.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        appPassword: password,
        trialClaimed: true,
        personalCloud: {
          activated: true,
          isTrial: true,
          plan: "trial",
          trialClaimed: true,
          trialStartDate,
          trialEndDate,
          licenseKey: licenseKey,
          maxMachines: 1,
          appPassword: password,
          activatedAt: trialStartDate,
        },
        updatedAt: Timestamp.now(),
      }, { merge: true });

      // 5. Try server route as backup if available
      try {
        await fetch("/api/license/trial-claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            email: cleanEmail,
            password: password,
            phone: phone.trim(),
            uid: authenticatedUser.uid,
          }),
        });
      } catch (apiErr) {
        // Non-blocking since client write succeeded
      }

      setActivatedTrial({
        key: licenseKey,
        email: cleanEmail,
        password: password,
        trialEndDate: trialEndDate,
      });
      onAlert("30-Day Free Trial activated! Welcome to Personal Cloud.", "Trial Started", "success");
    } catch (err: any) {
      console.error("Trial activation error:", err);
      onAlert(err.message || "An unexpected error occurred.", "Activation Error", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0e111a] border border-blue-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(59,130,246,0.25)] text-white overflow-hidden">
        
        {/* Glowing Top Strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400"></div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-white transition p-1 text-lg"
        >
          ✕
        </button>

        {hasActivePro ? (
          /* Already Has Pro License */
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 text-2xl">
              👑
            </div>
            <h2 className="text-2xl font-black text-white mb-2">You Have Lifetime Pro Access!</h2>
            <p className="text-xs text-gray-300 mb-6 leading-relaxed">
              Your account already possesses an active lifetime license. You do not need a trial!
            </p>
            <div className="flex flex-col gap-3">
              <a
                href="/downloads/PersonalCloud-Pro-Setup.exe"
                download
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm py-3.5 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-download"></i>
                <span>Download Windows PC App (.exe)</span>
              </a>
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs py-3 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        ) : alreadyClaimedTrial && !activatedTrial ? (
          /* Already Claimed Trial */
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-2xl">
              ⏱️
            </div>
            <h2 className="text-2xl font-black text-white mb-2">30-Day Free Trial Already Claimed</h2>
            <p className="text-xs text-gray-300 mb-6 leading-relaxed">
              You have already claimed your 30-day free trial on this account. Each user can claim the free trial once. Upgrade to Lifetime Pro to unlock permanent unlimited access across all your devices!
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenUpgrade) onOpenUpgrade();
                }}
                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-black text-sm py-3.5 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-crown text-yellow-300"></i>
                <span>Upgrade to Lifetime Pro Access</span>
              </button>
              <a
                href="/downloads/PersonalCloud-Pro-Setup.exe"
                download
                className="w-full bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-download"></i>
                <span>Re-Download Windows PC App (.exe)</span>
              </a>
            </div>
          </div>
        ) : !activatedTrial ? (
          /* Trial Form */
          <div>
            <div className="mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-300 border border-blue-500/30">
                <span>⏱️</span>
                <span>30-Day Full Pro Free Trial (₹0 Payment)</span>
              </span>
            </div>

            <h2 className="text-2xl font-black text-white mb-1.5">Start Your 30-Day Free Trial</h2>
            <p className="text-xs text-gray-300 leading-relaxed mb-5">
              Experience the full power of Personal Cloud Pro on your Windows PC for 30 days without paying anything. No credit card required!
            </p>

            <form onSubmit={handleActivateTrial} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Harsh Kumar"
                  className="w-full bg-[#07090e] border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={Boolean(currentUser?.email)}
                  placeholder="yourname@gmail.com"
                  className="w-full bg-[#07090e] border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition disabled:opacity-75"
                />
                <span className="text-[11px] text-gray-500 mt-1 block">
                  This email will be your login ID in the Windows app.
                </span>
              </div>

              {/* App Password */}
              <div className="bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-500/30 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-extrabold text-blue-300 flex items-center gap-1.5">
                    <span>🔑</span>
                    <span>Create App Password (For PC Login) *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-blue-400 hover:text-blue-200 font-medium"
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
                  placeholder="Set password for your PC app (min. 6 chars)"
                  className="w-full bg-[#07090e] border border-blue-500/40 focus:border-blue-400 rounded-xl px-4 py-3 text-white text-sm outline-none transition"
                />
                <span className="text-[11px] text-blue-200/70 mt-1.5 block leading-relaxed">
                  👉 <b>Important:</b> You will type this email and password into the <b>Personal Cloud Pro</b> app on your Windows PC to unlock your 30-day trial!
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Phone Number (For Updates & Support) *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="+91 98765 43210"
                  className="w-full bg-[#07090e] border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:opacity-95 text-white font-black text-sm py-4 rounded-xl transition shadow-[0_0_25px_rgba(59,130,246,0.35)] mt-3 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Activating 30-Day Free Trial...</span>
                ) : (
                  <>
                    <span>Start 30-Day Free Trial (₹0)</span>
                    <i className="fa-solid fa-arrow-right text-xs"></i>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Trial Activated Success Screen */
          <div className="text-center py-2 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 text-2xl">
              ✓
            </div>
            <h2 className="text-2xl font-black text-white mb-1">
              30-Day Free Trial Activated!
            </h2>
            <p className="text-xs text-gray-300 mb-6">
              Your 30-day trial is live! Valid until <b>{new Date(activatedTrial.trialEndDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</b>. Download the PC app below to get started.
            </p>

            <div className="bg-[#07090e] border border-white/10 rounded-2xl p-4 text-left space-y-2.5 text-xs mb-6">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-gray-400">Desktop Login Email:</span>
                <span className="font-mono font-bold text-white">{activatedTrial.email}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-gray-400">Desktop App Password:</span>
                <span className="font-mono font-bold text-blue-400">{activatedTrial.password}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Trial License Key:</span>
                <span className="font-mono font-bold text-emerald-400">{activatedTrial.key}</span>
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
                onClick={onClose}
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
};
