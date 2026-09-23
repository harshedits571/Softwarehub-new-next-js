"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

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

  const [inputKey, setInputKey] = useState("");
  const [activeKey, setActiveKey] = useState("");
  const [gateway, setGateway] = useState<GatewayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreenSession, setIsFullscreenSession] = useState(false);

  // Initialize key from URL or localStorage
  useEffect(() => {
    let keyToUse = paramKey || "";
    if (!keyToUse && typeof window !== "undefined") {
      keyToUse = localStorage.getItem("softwarehubs_cloud_key") || "";
    }

    if (keyToUse) {
      setActiveKey(keyToUse);
      setInputKey(keyToUse);
      if (typeof window !== "undefined") {
        localStorage.setItem("softwarehubs_cloud_key", keyToUse);
      }
    } else {
      setLoading(false);
    }
  }, [paramKey]);

  // Fetch Gateway Status
  const fetchStatus = async (key: string, isSilent = false) => {
    if (!key) return;
    if (!isSilent) setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/cloud/status?key=${encodeURIComponent(key)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to find your Personal Cloud server.");
      }

      setGateway(data.gateway);
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
    if (activeKey) {
      fetchStatus(activeKey);
      // Auto-poll every 10 seconds for real-time heartbeat
      const interval = setInterval(() => {
        fetchStatus(activeKey, true);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [activeKey]);

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputKey.trim().toUpperCase();
    if (!clean) return;

    setActiveKey(clean);
    if (typeof window !== "undefined") {
      localStorage.setItem("softwarehubs_cloud_key", clean);
    }
    fetchStatus(clean);
  };

  const handleDisconnect = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("softwarehubs_cloud_key");
    }
    setActiveKey("");
    setGateway(null);
    setInputKey("");
    setError(null);
  };

  if (isFullscreenSession && gateway?.tunnelUrl) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#0a0d14", display: "flex", flexDirection: "column" }}>
        <div style={{
          height: 48,
          background: "#0f172a",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.1rem" }}>☁️</span>
            <span style={{ color: "#38bdf8", fontWeight: 700, fontSize: "0.9rem" }}>SoftwareHubs Gateway</span>
            <span style={{ color: "#64748b", fontSize: "0.8rem" }}>• {gateway.machineName}</span>
          </div>
          <button
            onClick={() => setIsFullscreenSession(false)}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff",
              padding: "4px 12px",
              borderRadius: 6,
              fontSize: "0.8rem",
              cursor: "pointer"
            }}
          >
            ✕ Exit Fullscreen
          </button>
        </div>
        <iframe
          src={gateway.tunnelUrl}
          style={{ width: "100%", height: "calc(100vh - 48px)", border: "none" }}
          allow="fullscreen; clipboard-read; clipboard-write;"
          title="Personal Cloud Session"
        />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 10%, #0d1e38 0%, #080c14 60%, #05070a 100%)",
      color: "#f8fafc",
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: "24px 16px"
    }}>
      {/* Brand Header */}
      <header style={{
        maxWidth: 720,
        margin: "0 auto 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: "linear-gradient(135deg, #0284c7, #2563eb)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.2rem",
            boxShadow: "0 0 20px rgba(37,99,235,0.4)"
          }}>
            ☁️
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#fff", letterSpacing: "-0.5px" }}>
              Software<span style={{ color: "#38bdf8" }}>Hubs</span>
            </div>
            <div style={{ fontSize: "0.68rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>
              Personal Cloud Gateway
            </div>
          </div>
        </Link>

        {activeKey && (
          <button
            onClick={handleDisconnect}
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              color: "#f87171",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              padding: "6px 14px",
              borderRadius: 8,
              fontSize: "0.78rem",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            Disconnect PC
          </button>
        )}
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: 540, margin: "0 auto" }}>
        {/* Step 1: Connect Card if no key is entered */}
        {!activeKey && !loading && (
          <div style={{
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 20,
            padding: "36px 28px",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
            textAlign: "center"
          }}>
            <div style={{
              width: 64,
              height: 64,
              margin: "0 auto 18px",
              borderRadius: "50%",
              background: "rgba(56, 189, 248, 0.1)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.8rem"
            }}>
              💻
            </div>

            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 8, letterSpacing: "-0.5px" }}>
              Connect to Your PC
            </h1>
            <p style={{ fontSize: "0.88rem", color: "#94a3b8", marginBottom: 28, lineHeight: 1.5 }}>
              Access your home or office computer securely from anywhere through your official SoftwareHubs gateway.
            </p>

            <form onSubmit={handleConnect} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input
                type="text"
                placeholder="Enter License Key (e.g. PCLOUD-XXXX-...)"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                style={{
                  width: "100%",
                  height: 48,
                  padding: "0 16px",
                  borderRadius: 12,
                  background: "rgba(2, 6, 23, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#fff",
                  fontSize: "0.92rem",
                  fontFamily: "monospace",
                  letterSpacing: "0.5px",
                  outline: "none"
                }}
              />

              <button
                type="submit"
                style={{
                  height: 48,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #0284c7, #2563eb)",
                  border: "none",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  boxShadow: "0 10px 25px -5px rgba(37,99,235,0.5)"
                }}
              >
                Connect to My PC 🚀
              </button>
            </form>

            <div style={{ marginTop: 24, fontSize: "0.78rem", color: "#64748b" }}>
              💡 Your license key is found inside Personal Cloud Pro on your PC.
            </div>
          </div>
        )}

        {/* Step 2: Loading State */}
        {loading && (
          <div style={{
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 20,
            padding: "48px 24px",
            textAlign: "center"
          }}>
            <div style={{
              width: 48,
              height: 48,
              border: "3px solid rgba(56, 189, 248, 0.2)",
              borderTopColor: "#38bdf8",
              borderRadius: "50%",
              margin: "0 auto 20px",
              animation: "spin 0.8s linear infinite"
            }} />
            <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 6 }}>
              Locating Your Personal Cloud...
            </div>
            <div style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
              Establishing encrypted handshake via SoftwareHubs Edge
            </div>
          </div>
        )}

        {/* Step 3: Error State */}
        {!loading && error && activeKey && (
          <div style={{
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: 20,
            padding: "36px 24px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#f87171", marginBottom: 10 }}>
              Connection Not Found
            </h2>
            <p style={{ fontSize: "0.86rem", color: "#cbd5e1", marginBottom: 24, lineHeight: 1.5 }}>
              {error}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={() => fetchStatus(activeKey)}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer"
                }}
              >
                🔄 Retry
              </button>
              <button
                onClick={handleDisconnect}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "#cbd5e1",
                  border: "1px solid rgba(255,255,255,0.15)",
                  padding: "10px 20px",
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer"
                }}
              >
                Change License Key
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Live Connected Card */}
        {!loading && gateway && (
          <div>
            <div style={{
              background: "rgba(15, 23, 42, 0.8)",
              backdropFilter: "blur(20px)",
              border: gateway.isLive ? "1px solid rgba(52, 211, 153, 0.35)" : "1px solid rgba(245, 158, 11, 0.35)",
              borderRadius: 24,
              padding: "32px 24px",
              boxShadow: gateway.isLive ? "0 25px 60px -15px rgba(16,185,129,0.2)" : "0 25px 60px -15px rgba(245,158,11,0.2)"
            }}>
              {/* Status Pill Header */}
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

              {/* PC Information Card */}
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
                      License: <span style={{ fontFamily: "monospace", color: "#38bdf8" }}>{gateway.licenseKey}</span>
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
                    onClick={() => fetchStatus(activeKey)}
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
              📱 <b>Mobile Tip:</b> Add this page to your phone&apos;s Home Screen (Safari/Chrome ➔ &quot;Add to Home Screen&quot;) for an instant native app experience!
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
