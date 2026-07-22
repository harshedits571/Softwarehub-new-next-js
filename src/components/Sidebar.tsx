"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenProfile: () => void;
  allProducts?: any[];
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  onOpenProfile,
  allProducts = [],
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}) => {
  const { currentUser, userProfile, logout } = useAuth();
  const router = useRouter();

  const handleProductClick = (id: string) => {
    setSearchQuery("");
    setIsMobileMenuOpen?.(false);
    router.push("/products/" + id);
  };

  const searchResults = searchQuery.trim() === "" ? [] : allProducts.filter(p => 
    (p.Title || p.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5); // Limit to 5 suggestions

  const handleTabClick = (tab: string, e: React.MouseEvent) => {
    e.preventDefault();
    setActiveTab(tab);
    setSearchQuery("");
    setIsMobileMenuOpen?.(false);
    
    // Scroll to top of main view when changing tabs
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const menuItems = [
    { id: "home", label: "Home", icon: "fa-solid fa-house" },
    { id: "software", label: "Software", icon: "fa-solid fa-layer-group" },
    { id: "plugins", label: "Plugins", icon: "fa-solid fa-puzzle-piece" },
    { id: "scripts", label: "Scripts", icon: "fa-solid fa-terminal" },
    { id: "assets", label: "Assets", icon: "fa-solid fa-images" },
    { id: "courses", label: "Courses", icon: "fa-solid fa-graduation-cap" },
    { id: "utilities", label: "Utilities", icon: "fa-solid fa-sliders" },
    { id: "community", label: "Community", icon: "fa-solid fa-users" },
    { id: "request-resource", label: "Request File", icon: "fa-solid fa-paper-plane" },
  ];

  return (
    <>
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] lg:hidden"
          onClick={() => setIsMobileMenuOpen?.(false)}
        />
      )}
      <aside className={`sidebar custom-scrollbar ${isMobileMenuOpen ? "active" : ""} z-50`}>
      {/* Brand Logo */}
      <div className="mb-10">
        <h1
          onClick={() => {
            setActiveTab("home");
            setSearchQuery("");
          }}
          className="fluid-logo font-bold tracking-tighter text-white cursor-pointer select-none"
        >
          Harsh<span className="text-brand-500">Edits</span>
        </h1>
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1 mb-6">
          Resource Catalog
        </p>

        {/* Simple Search Box */}
        <div className="relative w-full mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full bg-[#111] border border-white/10 hover:border-white/20 focus:border-brand-500/50 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 outline-none transition-colors relative z-20"
          />
          
          {/* Suggestions Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#151515] border border-white/10 rounded-lg shadow-2xl z-50 max-h-64 overflow-y-auto custom-scrollbar">
              {searchResults.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleProductClick(p.id)}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 last:border-0"
                >
                  <img src={p.ThumbnailUrl || p.ImageURL || p.image || ""} alt="" className="w-8 h-8 object-cover rounded-md flex-shrink-0" />
                  <div className="truncate">
                    <p className="text-xs text-white font-bold truncate">{p.Title || p.title || "Resource"}</p>
                    <p className="text-[10px] text-gray-500">{p.Category || p.category || ""}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => handleTabClick(item.id, e)}
            className={`sidebar-link ${activeTab === item.id ? "active" : ""}`}
          >
            <i className={`${item.icon} text-sm`}></i>
            <span>{item.label}</span>
          </a>
        ))}
        <div className="h-px bg-white/5 my-4"></div>
        {userProfile?.role === "creator" && (
          <Link href="/creator" className="sidebar-link group text-brand-400 font-bold bg-brand-500/10 hover:bg-brand-500/20 rounded-xl mt-2 border border-brand-500/20 mb-2">
            <i className="fa-solid fa-wand-magic-sparkles text-sm group-hover:rotate-12 transition-transform"></i>
            <span>Creator Dashboard</span>
          </Link>
        )}
        <Link href="/creators" className="sidebar-link group">
          <i className="fa-solid fa-store text-yellow-500 text-sm group-hover:scale-110 transition-transform"></i>
          <span>Creators Marketplace</span>
        </Link>
        <Link href="/dashboard" className="sidebar-link group">
          <i className="fa-solid fa-bag-shopping text-emerald-400 text-sm group-hover:scale-110 transition-transform"></i>
          <span>My Purchases</span>
        </Link>
        <a
          href="#"
          onClick={(e) => handleTabClick("favorites", e)}
          className={`sidebar-link ${activeTab === "favorites" ? "active" : ""}`}
        >
          <i className="fa-solid fa-heart text-red-500 text-sm"></i>
          <span>My Favorites</span>
        </a>
      </nav>

      {/* User profile summary Footer */}
      <div className="mt-auto pt-6 border-t border-white/5">
        {currentUser ? (
          <>
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-3 hover:bg-white/5 rounded-2xl p-2 w-full transition-all border border-transparent hover:border-white/10"
              title="My Profile"
            >
              <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center font-bold text-white shadow-lg overflow-hidden flex-shrink-0">
                {userProfile?.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt="User Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="User Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>
                    {(currentUser?.displayName || userProfile?.username || "U")[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="text-left min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">
                  {currentUser?.displayName || userProfile?.username || "User"}
                </p>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">
                  My Profile
                </p>
              </div>
            </button>
            <button
              onClick={logout}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-colors"
            >
              <i className="fa-solid fa-right-from-bracket"></i> Log Out
            </button>
          </>
        ) : (
          <Link
            href="/auth"
            className="block w-full text-center py-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-colors animate-fade-in"
          >
            Log In / Join Hub
          </Link>
        )}
      </div>
     </aside>
   </>
  );
};
