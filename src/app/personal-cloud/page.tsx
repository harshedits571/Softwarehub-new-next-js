"use client";

import React, { useState } from "react";
import { Sidebar } from "../../components/Sidebar";
import { PersonalCloudView } from "../../components/PersonalCloudView";
import { CheckoutModal } from "../../components/CheckoutModal";
import { useAuth } from "../../context/AuthContext";
import { useCurrency } from "../../hooks/useCurrency";
import { useRouter } from "next/navigation";

interface Toast {
  id: string;
  msg: string;
  type: "success" | "error" | "info";
}

export default function PersonalCloudPage() {
  const { currentUser, userProfile } = useAuth();
  const pricing = useCurrency();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("personal-cloud");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState<{ id: string | null; title: string | null; amount: number } | null>(null);

  const showToast = (msg: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleTabChange = (tab: string) => {
    if (tab === "personal-cloud") {
      setActiveTab(tab);
    } else {
      router.push("/#" + tab);
    }
  };

  return (
    <div className="app-layout">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenProfile={() => router.push("/#profile")}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="main-viewport pt-4 lg:pt-8">
        {/* Top Controls Bar */}
        <div className="sticky top-0 lg:relative z-30 flex items-center justify-between gap-4 mb-8 lg:mb-12 py-4 lg:py-0 bg-[#07070a]/90 lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none border-b border-white/5 lg:border-none -mx-6 px-6 lg:mx-0 lg:px-0">
          <div className="flex items-center gap-2 lg:hidden">
            <button
              className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5 active:scale-95 transition-all"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-base font-black text-white tracking-normal select-none">
              Harsh<span className="text-brand-500">Edits</span>
            </span>
          </div>

          <button
            onClick={() => {
              setCheckoutItem({
                id: "personal-cloud-pro-lifetime",
                title: "Personal Cloud Pro - Lifetime License",
                amount: pricing.currency === "INR" ? 499 : 9.99,
              });
              setIsCheckoutOpen(true);
            }}
            className="premium-button font-bold px-6 py-2 rounded-xl transition-all shadow-lg text-xs relative overflow-hidden group ml-auto"
          >
            <span className="relative z-10 flex items-center gap-2">
              <i className="fa-solid fa-crown text-[10px]"></i>
              Get Pro Access
            </span>
          </button>
        </div>

        {/* Personal Cloud Component View */}
        <PersonalCloudView
          currency={pricing.currency}
          onBuyPro={(item) => {
            setCheckoutItem({
              id: item.id,
              title: item.title,
              amount: item.amount,
            });
            setIsCheckoutOpen(true);
          }}
          onToast={showToast}
        />
      </div>

      {/* Razorpay Checkout Modal */}
      {isCheckoutOpen && checkoutItem && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          itemId={checkoutItem.id}
          itemTitle={checkoutItem.title}
          amount={checkoutItem.amount}
          currency={pricing.currency}
          rzpKey={pricing.rzpKey}
          onSuccess={(paymentId) => {
            showToast("Payment Successful! Personal Cloud Pro Unlocked.", "success");
            setIsCheckoutOpen(false);
          }}
          onAlert={(msg, title, type) => {
            showToast(msg, type === "error" ? "error" : "info");
          }}
        />
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl border text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-slide-up ${
              t.type === "success"
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                : t.type === "error"
                ? "bg-red-500/20 border-red-500/40 text-red-300"
                : "bg-[#161626]/90 border-white/10 text-white"
            }`}
          >
            <i
              className={`fa-solid ${
                t.type === "success"
                  ? "fa-circle-check text-emerald-400"
                  : t.type === "error"
                  ? "fa-circle-xmark text-red-400"
                  : "fa-circle-info text-brand-400"
              }`}
            ></i>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
