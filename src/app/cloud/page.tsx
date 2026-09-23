"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, firestore } from "../../utils/firebase";
import { useAuth } from "../../context/AuthContext";

interface GatewayInfo {
  licenseKey: string;
  email: string;
  tunnelUrl: string | null;
  localUrl: string | null;
  machineName: string;
  status: "online" | "offline";
  lastHeartbeat: string | null;
  isLive: boolean;
}

function CloudGatewayContent() {
  const searchParams = useSearchParams();
  const paramKey = searchParams.get("key");
  const { currentUser, logout } = useAuth();

  // Inputs
  const [mounted, setMounted] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [authMode, setAuthMode] = useState<"account" | "key">("account");
  const [authLoading, setAuthLoading] = useState(false);

  // Active lookup state
  const [activeIdentifier, setActiveIdentifier] = useState<{ type: "key" | "email"; value: string } | null>(null);
  const [gateway, setGateway] = useState<GatewayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreenSession, setIsFullscreenSession] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Initial State: Check currentUser first, then URL param, then localStorage
  useEffect(() => {
    if (currentUser?.email) {
      setActiveIdentifier({ type: "email", value: currentUser.email.toLowerCase().trim() });
      return;
    }

    if (paramKey) {
      const cleanKey = paramKey.trim().toUpperCase();
      setActiveIdentifier({ type: "key", value: cleanKey });
      setKeyInput(cleanKey);
      setAuthMode("key");
      return;
    }

    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("softwarehubs_cloud_email");
      const savedKey = localStorage.getItem("softwarehubs_cloud_key");
      if (savedEmail) {
        setActiveIdentifier({ type: "email", value: savedEmail });
        setEmailInput(savedEmail);
      } else if (savedKey) {
        setActiveIdentifier({ type: "key", value: savedKey });
        setKeyInput(savedKey);
        setAuthMode("key");
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [currentUser, paramKey]);

  // 2. Fetch Gateway Status
  const fetchStatus = async (identifier: { type: "key" | "email"; value: string }, isSilent = false) => {
    if (!identifier || !identifier.value) return;
    if (!isSilent) setLoading(true);
    setError(null);

    try {
      const queryParam = identifier.type === "key" 
        ? `key=${encodeURIComponent(identifier.value)}` 
        : `email=${encodeURIComponent(identifier.value)}`;

      const res = await fetch(`/api/cloud/status?${queryParam}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to find your Personal Cloud server.");
      }

      setGateway(data.gateway);
      if (typeof window !== "undefined") {
        if (identifier.type === "email") {
          localStorage.setItem("softwarehubs_cloud_email", identifier.value);
        } else {
          localStorage.setItem("softwarehubs_cloud_key", identifier.value);
        }
      }
    } catch (err: any) {
      if (!isSilent) {
        setError(err.message || "Could not connect to your Personal Cloud.");
        setGateway(null);
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    if (activeIdentifier) {
      fetchStatus(activeIdentifier);
      const interval = setInterval(() => {
        fetchStatus(activeIdentifier, true);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [activeIdentifier]);

  // Handle Account Login
  const handleAccountLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !passwordInput) {
      setError("Please enter your email and password.");
      return;
    }

    setError(null);
    setAuthLoading(true);
    try {
      let matched = false;

      // 1. Check Firestore 'licenses' collection for the user's purchased/trial App Password
      try {
        const lQuery = query(collection(firestore, "licenses"), where("customerEmail", "==", cleanEmail));
        const lSnap = await getDocs(lQuery);
        lSnap.forEach((dSnap) => {
          const dData = dSnap.data();
          if (dData.appPassword === passwordInput || dData.password === passwordInput) {
            matched = true;
          }
        });
      } catch (e) {
        console.warn("Firestore license password check:", e);
      }

      // 2. Check Firestore 'users' collection if not matched yet
      if (!matched) {
        try {
          const uQuery = query(collection(firestore, "users"), where("email", "==", cleanEmail));
          const uSnap = await getDocs(uQuery);
          uSnap.forEach((dSnap) => {
            const dData = dSnap.data();
            if (
              dData.appPassword === passwordInput ||
              dData.personalCloud?.appPassword === passwordInput
            ) {
              matched = true;
            }
          });
        } catch (e) {
          console.warn("Firestore user profile password check:", e);
        }
      }

      // 3. Fallback check with Firebase Auth signInWithEmailAndPassword
      if (!matched) {
        try {
          await signInWithEmailAndPassword(auth, cleanEmail, passwordInput);
          matched = true;
        } catch (e) {
          // Ignore if not matched
        }
      }

      if (!matched) {
        throw new Error("Invalid password. Please enter the App Password you entered during checkout or trial activation.");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("softwarehubs_cloud_email", cleanEmail);
      }
      setActiveIdentifier({ type: "email", value: cleanEmail });
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please check your email and password.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Google Login
  const handleGoogleLogin = async () => {
    setError(null);
    setAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      if (cred.user.email) {
        setActiveIdentifier({ type: "email", value: cred.user.email.toLowerCase().trim() });
      }
    } catch (err: any) {
      setError(err.message || "Google sign in failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Manual Key Login
  const handleKeyConnect = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = keyInput.trim().toUpperCase();
    if (!clean) return;

    setActiveIdentifier({ type: "key", value: clean });
  };

  const handleDisconnect = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("softwarehubs_cloud_key");
      localStorage.removeItem("softwarehubs_cloud_email");
    }
    setActiveIdentifier(null);
    setGateway(null);
    setError(null);
    if (currentUser) {
      logout();
    }
  };

  if (!mounted) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 50% 10%, #172554 0%, #0a0d14 60%, #05070a 100%)",
        color: "#f8fafc",
        fontFamily: "'Outfit', -apple-system, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{ width: 32, height: 32, border: "3px solid rgba(56,189,248,0.2)", borderTopColor: "#38bdf8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div
      suppressHydrationWarning
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 50% 10%, #172554 0%, #0a0d14 60%, #05070a 100%)",
        color: "#f8fafc",
        fontFamily: "'Outfit', -apple-system, sans-serif",
        position: "relative",
        overflowX: "hidden"
      }}
    >
      {/* Top Navbar */}
      <header style={{
        height: 68,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 28px",
        background: "rgba(10, 13, 20, 0.75)",
        backdropFilter: "blur(14px)",
        position: "sticky",
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #0284c7, #2563eb)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 900,
              fontSize: "1.1rem"
            }}>
              S
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#fff", letterSpacing: "-0.5px" }}>
                SoftwareHubs
              </span>
              <span style={{
                fontSize: "0.7rem",
                color: "#38bdf8",
                background: "rgba(56,189,248,0.15)",
                padding: "2px 8px",
                borderRadius: 20,
                marginLeft: 8,
                fontWeight: 700
              }}>
                CLOUD GATEWAY
              </span>
            </div>
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {activeIdentifier && (
            <button
              onClick={handleDisconnect}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#94a3b8",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Sign Out
            </button>
          )}

          <Link
            href="/personal-cloud"
            style={{
              color: "#38bdf8",
              fontSize: "0.82rem",
              fontWeight: 600,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <span>Storefront</span> →
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 20px" }}>
        {isFullscreenSession && gateway?.tunnelUrl ? (
          <div style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "#0a0d14",
            display: "flex",
            flexDirection: "column"
          }}>
            <div style={{
              height: 48,
              background: "#0f172a",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 16px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.85rem", fontWeight: 700 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", display: "inline-block" }}></span>
                <span>Connected: {gateway.machineName}</span>
                <span style={{ fontSize: "0.72rem", color: "#64748b" }}>(via {gateway.tunnelUrl})</span>
              </div>
              <button
                onClick={() => setIsFullscreenSession(false)}
                style={{
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  cursor: "pointer"
                }}
              >
                ✕ Close Fullscreen
              </button>
            </div>
            <iframe
              src={gateway.tunnelUrl}
              style={{ flex: 1, border: "none", width: "100%", height: "100%" }}
              allow="camera; microphone; display-capture; fullscreen"
            />
          </div>
        ) : !activeIdentifier ? (
          /* Sign In Card */
          <div style={{
            maxWidth: 480,
            margin: "40px auto 0",
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            borderRadius: 24,
            padding: "36px 28px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(16px)"
          }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{
                width: 58,
                height: 58,
                borderRadius: 18,
                background: "linear-gradient(135deg, #0284c7, #2563eb)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.8rem",
                boxShadow: "0 10px 25px -5px rgba(2, 132, 199, 0.5)",
                marginBottom: 16
              }}>
                ☁️
              </div>
              <h1 style={{ fontSize: "1.65rem", fontWeight: 800, margin: "0 0 8px" }}>
                Connect to Your PC
              </h1>
              <p style={{ color: "#94a3b8", fontSize: "0.88rem", margin: 0, lineHeight: 1.5 }}>
                Sign in with your SoftwareHubs account to connect directly to your personal PC from anywhere in the world.
              </p>
            </div>

            {error && (
              <div style={{
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#fca5a5",
                borderRadius: 12,
                padding: "12px 14px",
                fontSize: "0.82rem",
                marginBottom: 20
              }}>
                ⚠️ {error}
              </div>
            )}

            {authMode === "account" ? (
              <div>
                <form onSubmit={handleAccountLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>
                      SoftwareHubs Email
                    </label>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="yourname@gmail.com"
                      required
                      style={{
                        width: "100%",
                        height: 48,
                        background: "rgba(2, 6, 23, 0.65)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 12,
                        padding: "0 16px",
                        color: "#fff",
                        fontSize: "0.92rem",
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>
                      Password
                    </label>
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{
                        width: "100%",
                        height: 48,
                        background: "rgba(2, 6, 23, 0.65)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 12,
                        padding: "0 16px",
                        color: "#fff",
                        fontSize: "0.92rem",
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    style={{
                      height: 50,
                      borderRadius: 12,
                      background: "linear-gradient(135deg, #0284c7, #2563eb)",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: "0.95rem",
                      border: "none",
                      cursor: "pointer",
                      boxShadow: "0 10px 24px -6px rgba(2, 132, 199, 0.5)",
                      marginTop: 4,
                      opacity: authLoading ? 0.7 : 1
                    }}
                  >
                    {authLoading ? "Signing In..." : "Sign In & Connect to My PC"}
                  </button>
                </form>

                <div style={{ textAlign: "center", margin: "18px 0 14px", position: "relative" }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", background: "rgba(15, 23, 42, 1)", padding: "0 10px", position: "relative", zIndex: 1 }}>
                    OR
                  </span>
                  <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.08)" }} />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={authLoading}
                  style={{
                    width: "100%",
                    height: 46,
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10
                  }}
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: 18, height: 18 }} />
                  <span>Sign In with Google</span>
                </button>

                <div style={{ textAlign: "center", marginTop: 22 }}>
                  <button
                    type="button"
                    onClick={() => { setAuthMode("key"); setError(null); }}
                    style={{ background: "none", border: "none", color: "#38bdf8", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline" }}
                  >
                    Or connect with a License Key →
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <form onSubmit={handleKeyConnect} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>
                      License Key
                    </label>
                    <input
                      type="text"
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      placeholder="PCLOUD-XXXX-XXXX-XXXX-XXXX"
                      required
                      style={{
                        width: "100%",
                        height: 48,
                        background: "rgba(2, 6, 23, 0.65)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 12,
                        padding: "0 16px",
                        color: "#38bdf8",
                        fontFamily: "monospace",
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    style={{
                      height: 50,
                      borderRadius: 12,
                      background: "linear-gradient(135deg, #0284c7, #2563eb)",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: "0.95rem",
                      border: "none",
                      cursor: "pointer",
                      boxShadow: "0 10px 24px -6px rgba(2, 132, 199, 0.5)"
                    }}
                  >
                    Connect with Key
                  </button>
                </form>

                <div style={{ textAlign: "center", marginTop: 22 }}>
                  <button
                    type="button"
                    onClick={() => { setAuthMode("account"); setError(null); }}
                    style={{ background: "none", border: "none", color: "#38bdf8", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline" }}
                  >
                    ← Sign in with Email & Password
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : loading ? (
          /* Loading State */
          <div style={{ textAlign: "center", padding: "100px 20px" }}>
            <div style={{
              width: 52,
              height: 52,
              border: "4px solid rgba(56, 189, 248, 0.2)",
              borderTopColor: "#38bdf8",
              borderRadius: "50%",
              margin: "0 auto 20px",
              animation: "spin 0.8s linear infinite"
            }} />
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 6px" }}>
              Contacting Your PC Server...
            </h2>
            <p style={{ color: "#64748b", fontSize: "0.85rem", margin: 0 }}>
              Connecting to SoftwareHubs secure gateway...
            </p>
          </div>
        ) : !gateway ? (
          /* Error State */
          <div style={{
            maxWidth: 520,
            margin: "40px auto 0",
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: 24,
            padding: "36px 28px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 700, margin: "0 0 8px", color: "#fca5a5" }}>
              No Active Personal Cloud Found
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "0.88rem", margin: "0 0 24px", lineHeight: 1.5 }}>
              {error || "Could not detect a registered Personal Cloud server for this account. Please make sure the Personal Cloud Pro app is installed and running on your computer."}
            </p>

            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={() => fetchStatus(activeIdentifier)}
                style={{
                  height: 44,
                  padding: "0 22px",
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #0284c7, #2563eb)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                🔄 Retry Connection
              </button>
              <button
                onClick={handleDisconnect}
                style={{
                  height: 44,
                  padding: "0 20px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#e2e8f0",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer"
                }}
              >
                Sign In With Another Account
              </button>
            </div>
          </div>
        ) : (
          /* Active Machine Connected Card */
          <div>
            <div style={{
              maxWidth: 540,
              margin: "0 auto",
              background: "rgba(15, 23, 42, 0.75)",
              border: gateway.isLive ? "1px solid rgba(52, 211, 153, 0.35)" : "1px solid rgba(245, 158, 11, 0.35)",
              borderRadius: 24,
              padding: "32px 24px",
              boxShadow: gateway.isLive ? "0 25px 60px -15px rgba(16,185,129,0.2)" : "0 25px 60px -15px rgba(245,158,11,0.2)"
            }}>
              {/* Status Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 14px",
                  borderRadius: 50,
                  background: gateway.isLive ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                  border: gateway.isLive ? "1px solid rgba(52, 211, 153, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)"
                }}>
                  <span style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: gateway.isLive ? "#34d399" : "#fbbf24",
                    boxShadow: gateway.isLive ? "0 0 10px #34d399" : "none"
                  }} />
                  <span style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: gateway.isLive ? "#34d399" : "#fbbf24",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    {gateway.isLive ? "PC Online & Connected" : "PC Offline / Inactive"}
                  </span>
                </div>

                <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                  Auto-syncs live
                </span>
              </div>

              {/* PC Info Card */}
              <div style={{
                background: "rgba(2, 6, 23, 0.65)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: "18px",
                marginBottom: 24
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #1e293b, #334155)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.4rem"
                  }}>
                    💻
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                      {gateway.machineName}
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "#94a3b8" }}>
                      Account: <span style={{ color: "#38bdf8", fontWeight: 600 }}>{gateway.email || activeIdentifier.value}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: "0.78rem" }}>
                  <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: 8 }}>
                    <div style={{ color: "#64748b", marginBottom: 2 }}>SECURITY</div>
                    <div style={{ color: "#e2e8f0", fontWeight: 600 }}>🔒 SSL Encrypted</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: 8 }}>
                    <div style={{ color: "#64748b", marginBottom: 2 }}>GATEWAY DOMAIN</div>
                    <div style={{ color: "#38bdf8", fontWeight: 600 }}>softwarehubs.in</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {gateway.isLive && gateway.tunnelUrl ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <a
                    href={gateway.tunnelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      height: 52,
                      borderRadius: 14,
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: "1rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      textDecoration: "none",
                      boxShadow: "0 12px 28px -6px rgba(16,185,129,0.5)",
                      cursor: "pointer"
                    }}
                  >
                    🚀 Open Personal Cloud Now
                  </a>

                  <button
                    onClick={() => setIsFullscreenSession(true)}
                    style={{
                      height: 44,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#e2e8f0",
                      fontWeight: 600,
                      fontSize: "0.88rem",
                      cursor: "pointer"
                    }}
                  >
                    🖥️ Open Fullscreen In-Browser
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{
                    padding: "16px",
                    borderRadius: 12,
                    background: "rgba(245, 158, 11, 0.1)",
                    border: "1px solid rgba(245, 158, 11, 0.25)",
                    color: "#fde68a",
                    fontSize: "0.85rem",
                    lineHeight: 1.5,
                    marginBottom: 16
                  }}>
                    ⚠️ <b>Your computer is offline.</b> Please ensure your PC is turned on and the <b>Personal Cloud Pro</b> app is running.
                  </div>

                  <button
                    onClick={() => fetchStatus(activeIdentifier)}
                    style={{
                      width: "100%",
                      height: 48,
                      borderRadius: 12,
                      background: "linear-gradient(135deg, #0284c7, #2563eb)",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "0.92rem",
                      border: "none",
                      cursor: "pointer"
                    }}
                  >
                    🔄 Check Server Status Again
                  </button>
                </div>
              )}
            </div>

            {/* Quick Tip Footer */}
            <footer style={{
              maxWidth: 540,
              margin: "28px auto 0",
              padding: "16px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              fontSize: "0.78rem",
              color: "#64748b",
              lineHeight: 1.5,
              textAlign: "center"
            }}>
              📱 <b>Mobile Tip:</b> Add this page to your phone's Home Screen (Safari/Chrome ➔ &quot;Add to Home Screen&quot;) for an instant native app experience!
            </footer>
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function CloudGatewayPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#0a0d14", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8", fontWeight: 700 }}>
        Loading SoftwareHubs Cloud Gateway...
      </div>
    }>
      <CloudGatewayContent />
    </Suspense>
  );
}
