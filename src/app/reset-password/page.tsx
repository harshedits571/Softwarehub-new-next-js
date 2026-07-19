"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { applyActionCode, verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { auth } from "../../utils/firebase";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const actionCode = searchParams.get("oobCode");

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"verifying" | "verified" | "resetForm" | "success" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPasswordVal, setConfirmPasswordVal] = useState("");

  useEffect(() => {
    if (!actionCode) {
      setStatus("error");
      setErrorMsg("Invalid or missing action code.");
      return;
    }

    if (mode === "verifyEmail") {
      setLoading(true);
      applyActionCode(auth, actionCode)
        .then(() => {
          setStatus("verified");
          setTimeout(() => {
            router.push("/auth");
          }, 3000);
        })
        .catch((err) => {
          console.error("Verification error:", err);
          setStatus("error");
          setErrorMsg("This link is invalid or has already been used. Please request a new verification link.");
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (mode === "resetPassword") {
      setStatus("resetForm");
    } else {
      setStatus("error");
      setErrorMsg("Unsupported authentication mode.");
    }
  }, [mode, actionCode, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPasswordVal) {
      setStatus("error");
      setErrorMsg("Passwords do not match!");
      return;
    }

    setLoading(true);
    try {
      if (actionCode) {
        await verifyPasswordResetCode(auth, actionCode);
        await confirmPasswordReset(auth, actionCode, newPassword);
        setStatus("success");
        setTimeout(() => {
          router.push("/auth");
        }, 3000);
      }
    } catch (err: any) {
      console.error("Password reset confirmation error:", err);
      setStatus("error");
      setErrorMsg(err.message || "Failed to update password. Link may be expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] relative z-10">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
          Softwhere<span className="text-brand-500">Hub</span>
        </h1>
        <p className="text-gray-500 text-xs tracking-wider uppercase font-semibold">
          {mode === "verifyEmail" ? "Account Verification" : "Password Recovery"}
        </p>
      </div>

      <div className="glass-card rounded-3xl p-8 bg-[#0f0f15]/80 border border-white/5 shadow-2xl relative overflow-hidden">
        {status === "verifying" && (
          <div className="text-center py-6">
            <div className="w-12 h-12 border-4 border-indigo-500/25 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-lg font-bold text-white mb-1">Verifying Email...</h2>
            <p className="text-xs text-gray-500">Checking verification code.</p>
          </div>
        )}

        {status === "verified" && (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 text-xl">
              <i className="fas fa-check-circle"></i>
            </div>
            <h2 className="text-lg font-bold text-white">Email Verified!</h2>
            <p className="text-xs text-gray-400">
              Your email has been successfully verified! Redirecting to login...
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 text-xl">
              <i className="fas fa-check-circle"></i>
            </div>
            <h2 className="text-lg font-bold text-white">Password Updated!</h2>
            <p className="text-xs text-gray-400">
              Your password was changed successfully! Redirecting to login...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500 text-xl">
              <i className="fas fa-times-circle"></i>
            </div>
            <h2 className="text-lg font-bold text-white">Operation Failed</h2>
            <p className="text-xs text-red-300 leading-relaxed px-4">{errorMsg}</p>
            <button
              onClick={() => {
                setStatus(mode === "resetPassword" ? "resetForm" : "error");
                setErrorMsg("");
              }}
              className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors pt-2 block mx-auto"
            >
              Try Again
            </button>
          </div>
        )}

        {status === "resetForm" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Create New Password</h2>
              <p className="text-xs text-gray-500">Enter a secure password for your account.</p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 ml-1">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-dark-900 border border-white/10 focus:border-indigo-500 rounded-xl p-3 text-white placeholder-gray-600 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 ml-1">
                Confirm Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPasswordVal}
                onChange={(e) => setConfirmPasswordVal(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-dark-900 border border-white/10 focus:border-indigo-500 rounded-xl p-3 text-white placeholder-gray-600 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all text-xs flex justify-center items-center gap-2"
            >
              {loading ? "Processing..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-[#050505] overflow-hidden selection:bg-brand-500/30 selection:text-white">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[20%] left-[20%] w-96 h-96 bg-indigo-600/10 rounded-full blur-[8rem]"></div>
        <div className="absolute bottom-[20%] right-[20%] w-96 h-96 bg-purple-600/10 rounded-full blur-[8rem]"></div>
      </div>
      <Suspense fallback={<div className="text-center text-white py-12">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
