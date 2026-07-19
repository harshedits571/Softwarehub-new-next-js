"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth as firebaseAuth } from "../../utils/firebase";
import { useAuth } from "../../context/AuthContext";

// Components
import CreatorSidebar from "./components/CreatorSidebar";
import CreatorOverview from "./components/CreatorOverview";
import CreatorProductManager from "./components/CreatorProductManager";
import CreatorProfile from "./components/CreatorProfile";
import CreatorPayouts from "./components/CreatorPayouts";

export default function CreatorDashboardCoordinator() {
  const { currentUser, userProfile, loading } = useAuth();
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      router.push("/auth");
      return;
    }

    const isCreator = userProfile?.role === "creator" || userProfile?.role === "admin";
    const isApproved = userProfile?.isCreatorApproved === true || userProfile?.role === "admin";

    if (!isCreator || !isApproved) {
      setAuthorized(false);
    } else {
      setAuthorized(true);
    }
  }, [currentUser, userProfile, loading, router]);

  // Spotlight mouse tracking effect for premium UI
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const card = target?.closest(".glass-card, .sidebar-link") as HTMLElement | null;
      if (card) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty("--mouse-x", `${x}px`);
        card.style.setProperty("--mouse-y", `${y}px`);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(firebaseAuth);
      router.push("/auth");
    } catch (err) {
      console.error("Signout failed:", err);
    }
  };

  const handleRefresh = () => {
    setRefreshCount((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-white">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Verifying Credentials...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-white p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 text-2xl mb-6">
          <i className="fa-solid fa-lock"></i>
        </div>
        <h2 className="text-2xl font-black mb-2 tracking-tight">Access Locked</h2>
        <p className="text-gray-400 text-xs max-w-sm leading-relaxed mb-6">
          Your profile must have the role "creator" and be approved by administrators to access the dashboard.
          If you recently applied, check back soon or contact support.
        </p>
        <button
          onClick={() => router.push("/")}
          className="bg-white/5 hover:bg-white/10 text-white font-bold text-xs px-6 py-2.5 rounded-full border border-white/10 transition-all"
        >
          Return to Hub
        </button>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <CreatorOverview currentUser={currentUser} setActiveTab={setActiveTab} />;
      case "listings":
        return <CreatorProductManager currentUser={currentUser} />;
      case "profile":
        return <CreatorProfile currentUser={currentUser} userProfile={userProfile} onRefresh={handleRefresh} />;
      case "sales":
        return <CreatorPayouts currentUser={currentUser} />;
      default:
        return (
          <div className="py-20 text-center text-gray-500">
            <h3 className="text-sm font-semibold">Under Construction</h3>
          </div>
        );
    }
  };

  const TAB_TITLES: Record<string, string> = {
    dashboard: "Storefront Overview Stats",
    listings: "Asset Submissions Directory",
    profile: "Creator Storefront Branding Settings",
    sales: "Sales Commission Splits Ledger",
  };

  return (
    <div className="flex bg-[#07070c] min-h-screen">
      <CreatorSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        userProfile={userProfile}
        onLogout={handleLogout}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-[#09090f]/10 overflow-hidden max-h-screen">
        <header className="bg-[#0b0b10] border-b border-white/5 p-6 z-20 shrink-0 flex items-center gap-4">
          <button 
            className="text-gray-400 hover:text-white lg:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h2 className="text-xl font-black text-white tracking-tight">
            {TAB_TITLES[activeTab] || activeTab}
          </h2>
        </header>

        <div className="flex-1 p-8 md:p-10 overflow-y-auto custom-scrollbar">
          <div key={activeTab} className="animate-fade-in">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}
