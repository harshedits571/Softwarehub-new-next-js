"use client";

import React from "react";
import { UserProfile } from "../../../context/AuthContext";
import { User } from "firebase/auth";

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User | null;
  userProfile: UserProfile | null;
  onLogout: () => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  currentUser,
  userProfile,
  onLogout,
  isMobileMenuOpen = false,
  setIsMobileMenuOpen,
}: AdminSidebarProps) {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "fa-solid fa-chart-line" },
    { id: "banners", label: "Banners", icon: "fa-solid fa-images" },
    { id: "adobeSoftware", label: "Adobe Software", icon: "fa-solid fa-compact-disc" },
    { id: "plugins", label: "Plugins", icon: "fa-solid fa-puzzle-piece" },
    { id: "scripts", label: "Scripts & Extensions", icon: "fa-solid fa-code" },
    { id: "assets", label: "Assets", icon: "fa-solid fa-photo-film" },
    { id: "utilities", label: "Utilities & Other Software", icon: "fa-solid fa-toolbox" },
    { id: "courses", label: "Courses", icon: "fa-solid fa-graduation-cap" },
    { id: "simplePluginsList", label: "100+ Plugins List", icon: "fa-solid fa-list-check" },
    { id: "userMessages", label: "User Messages", icon: "fa-solid fa-envelope" },
    { id: "brokenLinks", label: "Broken Links", icon: "fa-solid fa-triangle-exclamation" },
    { id: "auditLogs", label: "Activity Log", icon: "fa-solid fa-file-invoice" },
    { id: "revenueDashboard", label: "Revenue & Users", icon: "fa-solid fa-sack-dollar" },
    { id: "creatorCRM", label: "Creator CRM", icon: "fa-solid fa-users-viewfinder", style: { borderLeft: "2px solid #06b6d4", background: "rgba(6,182,212,0.05)" } },
    { id: "productApprovals", label: "Submission Approvals", icon: "fa-solid fa-square-check", style: { borderLeft: "2px solid #eab308", background: "rgba(234,179,8,0.05)" } },
    { id: "firebaseTelemetry", label: "Blaze Telemetry", icon: "fa-solid fa-gauge", style: { borderLeft: "2px solid #a855f7", background: "rgba(168,85,247,0.05)" } },
    { id: "imageAssets", label: "Image Assets", icon: "fa-solid fa-image" },
    { id: "ratings", label: "Ratings & Feedback", icon: "fa-solid fa-star" },
    { id: "siteSettings", label: "Settings", icon: "fa-solid fa-sliders" },
    {
      id: "analytics",
      label: "📊 Analytics",
      icon: "fa-solid fa-chart-simple",
      style: {
        borderLeft: "2px solid rgba(34,197,94,0.3)",
        background: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(16,185,129,0.08))",
      },
    },
    {
      id: "vendorAnalytics",
      label: "My Sales",
      icon: "fa-solid fa-dollar-sign text-amber-500",
      style: {
        borderLeft: "2px solid rgba(245,158,11,0.3)",
        background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.08))",
      },
    },
    {
      id: "driveImport",
      label: "☁️ Google Drive Import",
      icon: "fa-solid fa-cloud-arrow-down text-indigo-400",
      style: {
        borderLeft: "2px solid rgba(99,102,241,0.3)",
        background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(99,102,241,0.08))",
      },
    },
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
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0b0b10] border-r border-white/5 flex flex-col h-screen transform transition-transform duration-300 lg:translate-x-0 lg:static lg:shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.4)] ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 border-b border-white/5 relative">
          {/* Mobile close button */}
          <button 
            className="absolute top-6 right-4 text-gray-400 hover:text-white lg:hidden"
            onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}
          >
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
          
          <h1 className="text-xl font-black text-white tracking-wider uppercase">
            HARSH<span className="text-purple-500">ADMIN</span>
          </h1>
        </div>

      <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
              }}
              style={tab.style}
              className={`w-full text-left px-4 py-2.5 rounded-xl sidebar-link flex items-center gap-3 text-xs font-semibold ${
                isActive ? "active" : "text-gray-400 hover:text-white"
              }`}
            >
              <i className={`${tab.icon} text-sm w-5 text-center`}></i>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User profile & logout section */}
      <div className="p-4 border-t border-white/5 bg-black/20 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs uppercase">
            {userProfile?.username?.substring(0, 2) || currentUser?.email?.substring(0, 2) || "AD"}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white truncate">{userProfile?.username || "Admin"}</h4>
            <p className="text-[10px] text-gray-500 truncate">{currentUser?.email}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-right-from-bracket"></i>
          Log Out
        </button>
      </div>
    </aside>
    </>
  );
}
