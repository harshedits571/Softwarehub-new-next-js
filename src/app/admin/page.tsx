"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { auth as firebaseAuth } from "../../utils/firebase";
import { signOut } from "firebase/auth";

import dynamic from "next/dynamic";

// Lightweight immediate shell component
import AdminSidebar from "./components/AdminSidebar";

// Tab Loading Placeholder
const TabLoading = () => (
  <div className="flex items-center justify-center py-24">
    <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
  </div>
);

// Dynamically imported tabs (compiled on-demand on client only when selected, skipping server compile)
const DashboardStats = dynamic(() => import("./components/DashboardStats"), { ssr: false, loading: TabLoading });
const ProductManager = dynamic(() => import("./components/ProductManager"), { ssr: false, loading: TabLoading });
const RatingManager = dynamic(() => import("./components/RatingManager"), { ssr: false, loading: TabLoading });
const AuditLogs = dynamic(() => import("./components/AuditLogs"), { ssr: false, loading: TabLoading });
const GDriveSync = dynamic(() => import("./components/GDriveSync"), { ssr: false, loading: TabLoading });
const BrokenLinks = dynamic(() => import("./components/BrokenLinks"), { ssr: false, loading: TabLoading });
const UserMessages = dynamic(() => import("./components/UserMessages"), { ssr: false, loading: TabLoading });
const AnalyticsTab = dynamic(() => import("./components/AnalyticsTab"), { ssr: false, loading: TabLoading });
const VendorAnalytics = dynamic(() => import("./components/VendorAnalytics"), { ssr: false, loading: TabLoading });
const CreatorCRM = dynamic(() => import("./components/CreatorCRM"), { ssr: false, loading: TabLoading });
const SettingsConfig = dynamic(() => import("./components/SettingsConfig"), { ssr: false, loading: TabLoading });
const SubAdminManager = dynamic(() => import("./components/SubAdminManager"), { ssr: false, loading: TabLoading });
const BannerManager = dynamic(() => import("./components/BannerManager"), { ssr: false, loading: TabLoading });
const RevenueUsers = dynamic(() => import("./components/RevenueUsers"), { ssr: false, loading: TabLoading });
const ProductApprovals = dynamic(() => import("./components/ProductApprovals"), { ssr: false, loading: TabLoading });
const FirebaseTelemetry = dynamic(() => import("./components/FirebaseTelemetry"), { ssr: false, loading: TabLoading });
const PersonalStorageDashboard = dynamic(() => import("./components/personal-storage/PersonalStorageDashboard"), { ssr: false, loading: TabLoading });
import ScrollReveal from "../../components/ScrollReveal";

export default function AdminRoutePage() {
  const { currentUser, userProfile, loading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // State to pass prefilled GDrive synced details to ProductManager
  const [importedItem, setImportedItem] = useState<any | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      router.push("/auth");
      return;
    }

    const isAdmin = userProfile?.role === "admin" || userProfile?.role === "sub-admin";
    if (!isAdmin) {
      setAuthorized(false);
    } else {
      setAuthorized(true);
    }
  }, [currentUser, userProfile, loading, router]);

  // Spotlight mouse tracking effect for glass-cards
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

  const handleImportFile = (itemData: any) => {
    setImportedItem(itemData);
    setActiveTab(itemData.collection);
  };

  const clearImportedItem = () => {
    setImportedItem(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-white">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Verifying Permissions...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-white p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 text-2xl mb-6">
          <i className="fa-solid fa-shield-halved"></i>
        </div>
        <h2 className="text-2xl font-black mb-2 tracking-tight">Access Denied</h2>
        <p className="text-gray-400 text-xs max-w-sm leading-relaxed mb-6">
          You do not have the required administrative rights to view this dashboard. If you believe this is an error, please contact support.
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

  const isSuperAdmin = userProfile?.role === "admin";

  const renderActiveTabContent = () => {
    const catalogCategories = [
      "adobeSoftware",
      "plugins",
      "scripts",
      "assets",
      "utilities",
      "courses",
      "simplePluginsList",
    ];

    if (catalogCategories.includes(activeTab)) {
      return (
        <ProductManager
          category={activeTab}
          currentUser={currentUser}
          isSubAdmin={!isSuperAdmin}
          importedItem={importedItem}
          clearImportedItem={clearImportedItem}
        />
      );
    }

    switch (activeTab) {
      case "dashboard":
        return <DashboardStats setActiveTab={setActiveTab} isSuperAdmin={isSuperAdmin} />;
      case "personalStorage":
        return <PersonalStorageDashboard />;
      case "revenueDashboard":
        return <RevenueUsers />;
      case "productApprovals":
        return <ProductApprovals currentUser={currentUser} />;
      case "firebaseTelemetry":
        return <FirebaseTelemetry />;
      case "banners":
        return <BannerManager />;
      case "ratings":
        return <RatingManager />;
      case "auditLogs":
        return <AuditLogs />;
      case "userMessages":
        return <UserMessages />;
      case "brokenLinks":
        return <BrokenLinks />;
      case "analytics":
        return <AnalyticsTab />;
      case "vendorAnalytics":
        return <VendorAnalytics currentUser={currentUser} isSubAdmin={!isSuperAdmin} />;
      case "creatorCRM":
        return <CreatorCRM />;
      case "driveImport":
        return <GDriveSync onImportFile={handleImportFile} />;
      case "siteSettings":
        return (
          <div className="space-y-12">
            <SettingsConfig />
            <SubAdminManager />
          </div>
        );
      default:
        return (
          <div className="py-20 text-center text-gray-500">
            <h3 className="text-sm font-semibold">Under Construction</h3>
            <p className="text-xs text-gray-600 mt-1">This panel is currently being developed.</p>
          </div>
        );
    }
  };

  const TAB_TITLES: Record<string, string> = {
    dashboard: "Dashboard Overview",
    personalStorage: "Personal Storage Management",
    banners: "Highlights / Banners",
    adobeSoftware: "Adobe Software Items",
    plugins: "Plugins",
    scripts: "Scripts & Extensions",
    assets: "Creative Assets",
    utilities: "Utilities & Other Software",
    courses: "Video Courses",
    simplePluginsList: "100+ Plugins List",
    userMessages: "User Messages",
    brokenLinks: "Broken Link Reports",
    auditLogs: "Audit Trail Activity Log",
    creatorCRM: "Creator Analytics & CRM",
    revenueDashboard: "Revenue & User Directory",
    productApprovals: "Creator Submission Approvals",
    firebaseTelemetry: "Blaze Infrastructure Telemetry",
    imageAssets: "Site Image Assets",
    ratings: "Ratings & Feedback",
    siteSettings: "Branding & Site Config",
    analytics: "Detailed Traffic Analytics",
    vendorAnalytics: "Vendor Sales Performance Dashboard",
    driveImport: "Google Drive recursive importer",
  };

  return (
    <div className="flex bg-[#07070c] min-h-screen">
      {/* Sidebar navigation */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        userProfile={userProfile}
        onLogout={handleLogout}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Main dashboard content area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#09090f]/10 overflow-hidden max-h-screen">
        {/* Top Header Bar */}
        <header className="bg-[#0b0b10] border-b border-white/5 p-6 flex justify-between items-center z-20 shrink-0">
          <div className="flex items-center gap-4">
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
          </div>
        </header>

        {/* Scrollable content body */}
        <div className="flex-1 p-8 md:p-10 overflow-y-auto custom-scrollbar">
          <ScrollReveal key={activeTab}>
            {renderActiveTabContent()}
          </ScrollReveal>
        </div>
      </main>
    </div>
  );
}
