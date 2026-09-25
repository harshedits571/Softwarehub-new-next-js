"use client";

import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { firestore } from "../../../../utils/firebase";

interface PlanConfig {
  id: string;
  name: string;
  tagline: string;
  badge?: string;
  price: number;
  originalPrice: number;
  usdPrice: number;
  maxMachines: number;
  features: string[];
  enabled: boolean;
  popular?: boolean;
}

const DEFAULT_PRICING: Record<string, PlanConfig> = {
  starter: {
    id: "starter",
    name: "Starter Edition",
    tagline: "Essential private cloud for everyday phone-to-PC access",
    price: 499,
    originalPrice: 999,
    usdPrice: 9.99,
    maxMachines: 1,
    features: [
      "1 Windows PC License",
      "Unlimited Personal Storage",
      "Native Desktop File Explorer",
      "QuickDrop P2P File Sharing",
      "4-Digit Master PIN Lock",
      "Lifetime Free Updates",
    ],
    enabled: true,
  },
  pro: {
    id: "pro",
    name: "Pro Security Edition",
    tagline: "Powerhouse private cloud with remote screen control & 4K media",
    badge: "MOST POPULAR",
    popular: true,
    price: 999,
    originalPrice: 1999,
    usdPrice: 19.99,
    maxMachines: 2,
    features: [
      "2 Windows PC Licenses (Work + Home)",
      "4K Hardware-Accelerated Video Transcoder",
      "60 FPS Low-Latency Screen Mirroring",
      "Native Windows Audio Mixer (Per-App)",
      "Automated Cloudflare SSL Zero-Config Tunnel",
      "Telegram & Discord Security Bot Alerts",
      "Secret Emergency Word Access",
      "Priority VIP Customer Support",
    ],
    enabled: true,
  },
  family: {
    id: "family",
    name: "Family & Power Bundle",
    tagline: "Total private cloud freedom across multiple family computers",
    badge: "BEST VALUE",
    price: 1499,
    originalPrice: 2999,
    usdPrice: 29.99,
    maxMachines: 5,
    features: [
      "Up to 5 Windows PC Licenses",
      "Independent PIN & Access Folders for Each Member",
      "Full 4K Video Streaming & Screen Mirroring",
      "All Pro Features Included on All 5 PCs",
      "Priority Remote Setup Assistance",
      "Commercial Lifetime License",
    ],
    enabled: true,
  },
};

export default function PricingTab() {
  const [plans, setPlans] = useState<Record<string, PlanConfig>>(DEFAULT_PRICING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePlanKey, setActivePlanKey] = useState<string>("pro");
  const [newFeatureText, setNewFeatureText] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    setLoading(true);
    try {
      const docRef = doc(firestore, "config", "personal_cloud_pricing");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.plans) {
          setPlans(data.plans);
        }
      }
    } catch (err) {
      console.warn("Could not load pricing config, using defaults:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      const docRef = doc(firestore, "config", "personal_cloud_pricing");
      await setDoc(docRef, {
        plans,
        updatedAt: Timestamp.now(),
      }, { merge: true });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert("Failed to save pricing: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const updatePlanField = (key: string, field: keyof PlanConfig, value: any) => {
    setPlans((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const addFeature = (key: string) => {
    if (!newFeatureText.trim()) return;
    const currentList = plans[key]?.features || [];
    updatePlanField(key, "features", [...currentList, newFeatureText.trim()]);
    setNewFeatureText("");
  };

  const removeFeature = (key: string, idx: number) => {
    const currentList = plans[key]?.features || [];
    updatePlanField(key, "features", currentList.filter((_, i) => i !== idx));
  };

  const currentPlan = plans[activePlanKey] || plans["pro"];

  return (
    <div className="space-y-6">
      {/* Top Banner & Save Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f111a] border border-white/5 p-5 rounded-2xl">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <i className="fa-solid fa-tags text-cyan-400"></i>
            Personal Cloud Pricing Management
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Modify Starter, Pro, and Family tiers live without redeploying code. Changes reflect instantly on the storefront.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedSuccess && (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-bounce">
              <i className="fa-solid fa-check"></i> Changes Saved Live!
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-extrabold text-xs rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <i className="fa-solid fa-floppy-disk text-xs"></i>
            {saving ? "Publishing to Firestore..." : "Publish Pricing Changes"}
          </button>
        </div>
      </div>

      {/* Plan Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2 overflow-x-auto scrollbar-none flex-nowrap">
        {Object.keys(plans).map((key) => {
          const p = plans[key];
          const isSelected = activePlanKey === key;
          return (
            <button
              key={key}
              onClick={() => setActivePlanKey(key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                isSelected
                  ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  : "bg-white/5 hover:bg-white/10 text-gray-400"
              }`}
            >
              <span>{p.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isSelected ? "bg-black/30 text-black" : "bg-white/10 text-gray-400"}`}>
                ₹{p.price}
              </span>
              {!p.enabled && (
                <span className="text-[9px] bg-red-500/20 text-red-400 px-1 rounded">Hidden</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Editor & Live Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Editor Form (7 cols) */}
        <div className="lg:col-span-7 bg-[#0f111a] border border-white/5 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <h3 className="text-sm font-bold text-white">
              Editing: <span className="text-cyan-400">{currentPlan.name}</span>
            </h3>

            {/* Visibility Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-gray-400 font-semibold">Live on Website:</span>
              <input
                type="checkbox"
                checked={currentPlan.enabled}
                onChange={(e) => updatePlanField(activePlanKey, "enabled", e.target.checked)}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-gray-400 block mb-1">Plan Title</label>
              <input
                type="text"
                value={currentPlan.name}
                onChange={(e) => updatePlanField(activePlanKey, "name", e.target.value)}
                className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-400 block mb-1">Badge Tag</label>
              <input
                type="text"
                placeholder="e.g. MOST POPULAR"
                value={currentPlan.badge || ""}
                onChange={(e) => updatePlanField(activePlanKey, "badge", e.target.value)}
                className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-gray-400 block mb-1">Tagline</label>
            <input
              type="text"
              value={currentPlan.tagline}
              onChange={(e) => updatePlanField(activePlanKey, "tagline", e.target.value)}
              className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                Selling Price (₹ INR) *
              </label>
              <input
                type="number"
                value={currentPlan.price}
                onChange={(e) => updatePlanField(activePlanKey, "price", Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                Strike Price (₹ INR)
              </label>
              <input
                type="number"
                value={currentPlan.originalPrice}
                onChange={(e) => updatePlanField(activePlanKey, "originalPrice", Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-gray-400 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                USD Price ($ USD)
              </label>
              <input
                type="number"
                step="0.01"
                value={currentPlan.usdPrice || 9.99}
                onChange={(e) => updatePlanField(activePlanKey, "usdPrice", Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-emerald-300 font-bold focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                Allowed PC Slots
              </label>
              <input
                type="number"
                value={currentPlan.maxMachines}
                onChange={(e) => updatePlanField(activePlanKey, "maxMachines", Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-cyan-400 font-bold focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Features Editor */}
          <div>
            <label className="text-[11px] font-semibold text-gray-400 block mb-2 uppercase tracking-wider">
              Feature Bullet Points ({currentPlan.features?.length || 0})
            </label>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Add new feature bullet point..."
                value={newFeatureText}
                onChange={(e) => setNewFeatureText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature(activePlanKey))}
                className="flex-1 px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => addFeature(activePlanKey)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all"
              >
                Add
              </button>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {(currentPlan.features || []).map((feat, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs text-gray-300"
                >
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-check text-emerald-400 text-[10px]"></i>
                    {feat}
                  </span>
                  <button
                    onClick={() => removeFeature(activePlanKey, idx)}
                    className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                  >
                    <i className="fa-solid fa-xmark text-xs"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Storefront Preview (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <i className="fa-solid fa-eye text-cyan-400"></i>
            Live Storefront Card Preview
          </div>

          <div
            className={`flex-1 rounded-2xl p-6 flex flex-col justify-between border relative overflow-hidden transition-all ${
              currentPlan.popular
                ? "bg-gradient-to-b from-[#141b2d] to-[#0c0f18] border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.15)]"
                : "bg-[#0f111a] border-white/10"
            }`}
          >
            {currentPlan.badge && (
              <div className="absolute top-4 right-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-black text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {currentPlan.badge}
              </div>
            )}

            <div>
              <h4 className="text-lg font-black text-white">{currentPlan.name}</h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">{currentPlan.tagline}</p>

              <div className="mt-5 mb-6 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">₹{currentPlan.price}</span>
                {currentPlan.originalPrice && (
                  <span className="text-sm text-gray-500 line-through">₹{currentPlan.originalPrice}</span>
                )}
                <span className="text-xs text-emerald-400 font-bold ml-1">
                  {Math.round(((currentPlan.originalPrice - currentPlan.price) / currentPlan.originalPrice) * 100)}% OFF
                </span>
                <span className="text-[11px] text-gray-500 ml-auto font-mono">
                  {currentPlan.maxMachines} PC Slot{currentPlan.maxMachines > 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-2 border-t border-white/5 pt-4">
                {(currentPlan.features || []).map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-300">
                    <i className="fa-solid fa-circle-check text-cyan-400 text-xs mt-0.5"></i>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/5">
              <button
                type="button"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-extrabold text-xs shadow-lg uppercase tracking-wider"
              >
                Proceed to Checkout • ₹{currentPlan.price}
              </button>
              <p className="text-[10px] text-center text-gray-500 mt-2">
                Lifetime License • Instant Automated Hardware Key
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
