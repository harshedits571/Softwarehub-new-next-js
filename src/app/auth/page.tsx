"use client";

import React, { useState, useEffect } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, Timestamp } from "firebase/firestore";
import { auth, firestore } from "../../utils/firebase";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Sync with Firestore
      const userDocRef = doc(firestore, "users", user.uid);
      const snapshot = await getDoc(userDocRef);

      if (!snapshot.exists()) {
        // Create user profile
        await setDoc(userDocRef, {
          name: user.displayName || "Google User",
          email: user.email,
          role: "user",
          status: "active",
          isPaid: false,
          joinedAt: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
          createdAt: Timestamp.now(),
          lastLogin: Timestamp.now(),
        });
      } else {
        const data = snapshot.data();
        if (data.status === "banned" || data.isBanned) {
          await auth.signOut();
          setError("Your account is currently banned.");
          setLoading(false);
          return;
        }
        // Update last login
        await updateDoc(userDocRef, {
          lastLogin: Timestamp.now(),
        });
      }

      // Determine redirect URL
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get("redirect") || "/";

      router.push(redirectTo);
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setError(err.message || "Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-[#050505] overflow-hidden selection:bg-brand-500/30 selection:text-white">
      {/* Background Animated Elements */}
      <div className="absolute inset-0 z-0 bg-radial-gradient">
        <div className="absolute top-[10%] left-[20%] w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full blur-[10rem]"></div>
        <div className="absolute bottom-[10%] right-[20%] w-[30rem] h-[30rem] bg-purple-600/10 rounded-full blur-[10rem]"></div>
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo Header */}
        <div className="text-center mb-10">
          <div className="inline-block cursor-pointer">
            <h1
              className="text-5xl font-black tracking-tighter mb-2"
              style={{ textShadow: "0 0 30px rgba(168,85,247,0.3)" }}
            >
              <span>Softwhere</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                Hub
              </span>
            </h1>
          </div>
          <p className="text-gray-400 text-xs font-bold tracking-widest uppercase opacity-85 mt-2">
            Welcome to the Ultimate Editing Hub
          </p>
        </div>

        {/* Auth Card */}
        <div className="glass-card rounded-3xl p-8 relative overflow-hidden bg-[#0f0f15]/85 border border-white/5 shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-gray-400 text-xs">
              Sign in using Google for instant access to premium editing tools and resources.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl mb-6 text-xs flex items-center gap-3 animate-pulse">
              <i className="fas fa-exclamation-circle text-red-400 text-base"></i>
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign In button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-white tracking-wide border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className="w-5 h-5"
            />
            <span>{loading ? "Signing in..." : "Sign in with Google"}</span>
          </button>

          {/* Loading Indicator inside Card */}
          {loading && (
            <div className="absolute inset-0 bg-[#050505]/85 flex flex-col items-center justify-center z-50 rounded-3xl">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <i className="fas fa-bolt text-purple-500 text-xl animate-pulse"></i>
                </div>
              </div>
              <div className="text-white font-medium tracking-wide mt-4 animate-pulse text-sm">
                Processing...
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center mt-8">
          <p className="text-gray-600 text-xs">
            &copy; {new Date().getFullYear()} SoftwhereHub. All rights reserved.
          </p>
          <p className="text-[10px] text-gray-700 mt-2">
            Designed & Developed by{" "}
            <span className="text-gray-500 font-semibold">Harsh Edits</span>
          </p>
        </div>
      </div>
    </div>
  );
}
