"use client";

import React from "react";
import Link from "next/link";

interface CreatorSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: any;
  userProfile: any;
  onLogout: () => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

export default function CreatorSidebar({
  activeTab,
  setActiveTab,
  currentUser,
  userProfile,
  onLogout,
  isMobileMenuOpen = false,
  setIsMobileMenuOpen,
}: CreatorSidebarProps) {
  const details = userProfile?.creatorDetails || {};
  const displayName = details.displayName || userProfile?.username || "Creator";
  const avatar = details.avatarUrl || "";

  const menuItems = [
    { id: "dashboard", label: "Overview Stats", icon: "fa-solid fa-chart-pie" },
    { id: "listings", label: "My Asset Listings", icon: "fa-solid fa-box" },
    { id: "profile", label: "Store Profile Settings", icon: "fa-solid fa-store" },
    { id: "sales", label: "Sales & Payouts", icon: "fa-solid fa-receipt" },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && setIsMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-80 bg-[#09090e] border-r border-white/5 flex flex-col justify-between transform transition-transform duration-300 lg:translate-x-0 lg:static lg:shrink-0 p-6 shadow-[4px_0_24px_rgba(0,0,0,0.4)] ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="space-y-10 relative">
          {/* Mobile close button */}
          <button 
            className="absolute top-0 right-0 text-gray-400 hover:text-white lg:hidden"
            onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}
          >
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>

        {/* Brand/Logo */}
        <div>
          <Link href="/" className="font-bold tracking-tighter text-white text-2xl flex items-center gap-1 hover:scale-[1.02] transition-transform">
            Harsh<span className="text-indigo-500">Edits</span>
          </Link>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              CREATOR PANEL
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all relative overflow-hidden group ${
                activeTab === item.id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <i className={`${item.icon} text-sm`}></i>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Footer Profile Box */}
      <div className="pt-6 border-t border-white/5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-inner overflow-hidden shrink-0 border border-white/10">
            {avatar ? (
              <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span>{displayName[0].toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{displayName}</p>
            <p className="text-[9px] text-gray-500 truncate">{currentUser?.email || "Creator Account"}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href="/"
            className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold text-[10px] py-2 rounded-lg border border-white/10 transition-all text-center flex items-center justify-center gap-1.5"
          >
            <i className="fa-solid fa-house"></i> View Site
          </Link>
          <button
            onClick={onLogout}
            className="flex-1 bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-[10px] font-bold py-2 transition-all flex items-center justify-center gap-1.5 border border-red-500/20 active:scale-95"
          >
            <i className="fa-solid fa-right-from-bracket"></i> Log Out
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
