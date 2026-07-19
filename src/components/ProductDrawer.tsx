"use client";

import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { firestore } from "../utils/firebase";
import { useAuth } from "../context/AuthContext";

interface Version {
  Name: string;
  Link: string;
  Description?: string;
  price?: number | string;
}

export interface ResourceItem {
  id: string;
  Title: string;
  Description?: string;
  ImageURL?: string;
  price?: string | number;
  priceUSD?: string | number;
  isPro?: boolean;
  compatibleWith?: string[];
  Versions?: Version[];
  hasSubItems?: boolean;
  subItemsButtonText?: string;
  extraImages?: string[];
  presets?: string[];
  ownerUid?: string;
  isFlatCreatorProduct?: boolean;
  features?: { title: string; description: string; imageUrl: string }[];
}

interface ProductDrawerProps {
  isOpen: boolean;
  item: ResourceItem | null;
  collectionName: string | null;
  onClose: () => void;
  currency: "INR" | "USD";
  onDownload: (version: Version | null) => void;
  onShowSubItems: () => void;
  onToast: (msg: string, type: "success" | "error" | "info") => void;
}

export const ProductDrawer: React.FC<ProductDrawerProps> = ({
  isOpen,
  item,
  collectionName,
  onClose,
  currency,
  onDownload,
  onShowSubItems,
  onToast,
}) => {
  const { userProfile } = useAuth();
  const isCreatorProduct = item?.isFlatCreatorProduct || (item?.ownerUid && item?.ownerUid !== "platform");
  const [copied, setCopied] = useState(false);
  const [ratingSummary, setRatingSummary] = useState<{
    average?: number;
    count?: number;
    versions?: Record<string, { average: number; count: number }>;
  } | null>(null);

  useEffect(() => {
    if (!item) return;

    const ratingsCol = collection(firestore, "ratings");
    const q = query(ratingsCol, where("resourceId", "==", item.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        let total = 0;
        const count = snapshot.size;
        const versionsMap: Record<string, { total: number; count: number }> = {};
        
        snapshot.forEach((docSnap) => {
          const ratingData = docSnap.data();
          const stars = Number(ratingData.stars || ratingData.rating || 5);
          total += stars;

          // Track version-wise rating
          const rawVersion = ratingData.version || "Direct Download";
          const safeVName = rawVersion.replace(/[.#$\[\]]/g, "_");
          if (!versionsMap[safeVName]) {
            versionsMap[safeVName] = { total: 0, count: 0 };
          }
          versionsMap[safeVName].total += stars;
          versionsMap[safeVName].count += 1;
        });

        // Compute averages
        const versionsResult: Record<string, { average: number; count: number }> = {};
        for (const key in versionsMap) {
          versionsResult[key] = {
            average: versionsMap[key].total / versionsMap[key].count,
            count: versionsMap[key].count
          };
        }

        setRatingSummary({
          average: total / count,
          count: count,
          versions: versionsResult
        });
      } else {
        setRatingSummary(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [item]);

  if (!item || !isOpen) return null;

  const categoryMap: Record<string, string> = {
    adobeSoftware: "Adobe Software",
    plugins: "Plugins",
    scripts: "Scripts & Extensions",
    assets: "Asset Pack",
    courses: "Premium Course",
    utilities: "Utilities",
  };

  const displayCategory = collectionName ? categoryMap[collectionName] || collectionName : "Resource";

  const priceVal = parseFloat(item.price as string) || 0;
  const priceUSDVal = parseFloat(item.priceUSD as string) || 0;
  const activePrice = currency === "INR" ? priceVal : priceUSDVal;

  const handleCopyLink = () => {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set("item", item.id);
    url.searchParams.set("col", collectionName || "");

    navigator.clipboard
      .writeText(url.toString())
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Could not copy link:", err);
      });
  };

  const versions = item.Versions ? Object.values(item.Versions) : [];

  return (
    <>
      <div className="drawer-backdrop active" onClick={onClose}></div>
      <div id="item-detail-view" className="active" style={{ overflowY: "auto" }}>
        {/* Drawer Panel */}
        <div className="flex flex-col h-full bg-[#0b0b10] relative z-10 w-full overflow-hidden">
          {/* Header bar */}
          <div className="p-5 border-b border-white/5 flex justify-between items-center bg-dark-800/40 sticky top-0 z-50">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium uppercase tracking-widest"
            >
              <i className="fa-solid fa-arrow-left"></i> Back to Products
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-400 px-2.5 py-0.5 rounded border border-brand-500/20">
                {displayCategory}
              </span>
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border ${
                  item.isPro
                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                }`}
              >
                {item.isPro ? "ULTIMATE PRO" : "FREE RESOURCE"}
              </span>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-12">
            <div className="max-w-[1200px] mx-auto w-full">
              {/* Top Layout: Images & Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-16">
                {/* Left Side: Images */}
                <div className="flex flex-col gap-4">
                  <div className="aspect-video lg:aspect-[4/3] w-full rounded-3xl overflow-hidden border border-white/10 bg-dark-900 shadow-2xl relative group">
                    <img
                      src={item.ImageURL || "assets/SM.png"}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      alt={item.Title}
                    />
                  </div>
                  {/* Extra Images Gallery */}
                  {item.extraImages && item.extraImages.length > 0 && (
                    <div className="flex gap-4 overflow-x-auto pb-4 pt-2 custom-scrollbar snap-x">
                      {item.extraImages.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          className="w-24 md:w-32 aspect-video rounded-xl overflow-hidden border border-white/10 shrink-0 snap-start bg-dark-900"
                        >
                          <img src={imgUrl} className="w-full h-full object-cover" alt="" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Side: Details */}
                <div className="flex flex-col bg-black/80 backdrop-blur-xl p-8 lg:p-10 rounded-3xl border border-white/10 shadow-2xl h-max relative">
                  <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight tracking-tight">
                    {item.Title}
                  </h2>

                  {/* Rating Summary */}
                  {ratingSummary?.average && (
                    <div className="mb-6 flex items-center gap-2 px-3 py-1 bg-yellow-500/10 rounded-lg border border-yellow-500/20 w-fit">
                      <div className="flex text-yellow-500 gap-0.5">
                        {Array(5)
                          .fill(0)
                          .map((_, i) => (
                            <i
                              key={i}
                              className={`${
                                i < Math.round(ratingSummary.average || 0)
                                  ? "fa-solid"
                                  : "fa-regular"
                              } fa-star text-[10px]`}
                            ></i>
                          ))}
                      </div>
                      <span className="text-yellow-400 font-black text-[10px]">
                        {Number(ratingSummary.average).toFixed(1)}
                      </span>
                      <span className="text-gray-500 text-[10px]">
                        ({ratingSummary.count} reviews)
                      </span>
                    </div>
                  )}

                  {/* Dynamic Price */}
                  {isCreatorProduct && activePrice > 0 && (
                    <div className="mb-6">
                      <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30 rounded-xl px-5 py-3">
                        <span className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-lg">
                          <i className="fa-solid fa-gem text-[9px]"></i> PREMIUM
                        </span>
                        <span className="text-2xl font-black text-emerald-400">
                          {currency === "USD" ? `$${activePrice.toFixed(2)}` : `₹${activePrice}`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Description Details (Collapsible) */}
                  <details className="mb-6 border-b border-white/10 pb-6" open>
                    <summary className="font-bold text-white cursor-pointer outline-none text-lg">
                      Description
                    </summary>
                    <p className="text-sm md:text-base text-gray-300 leading-relaxed mt-4 whitespace-pre-wrap">
                      {item.Description || "Exclusive premium resource curated for high-quality editing workflows."}
                    </p>
                  </details>

                  {/* Preset List */}
                  {item.presets && item.presets.length > 0 && (
                    <div className="mb-6 border-b border-white/10 pb-6">
                      <details open>
                        <summary className="font-bold text-white cursor-pointer outline-none text-lg">
                          What's Included
                        </summary>
                        <ul className="space-y-3 text-gray-300 text-sm md:text-base mt-4 list-disc pl-5">
                          {item.presets.map((preset, idx) => (
                            <li key={idx}>{preset}</li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  )}

                  {/* Versions (Downloads) */}
                  <div className="mb-8">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
                      {versions.length > 0
                        ? `${versions.length} Version${versions.length > 1 ? "s" : ""} Available`
                        : "Downloads"}
                    </h3>

                    {versions.length > 0 ? (
                      <div className="grid grid-cols-1 gap-4">
                        {versions.map((version, index) => {
                          const safeVName = version.Name.replace(/[.#$\[\]]/g, "_");
                          const verRating = ratingSummary?.versions?.[safeVName];

                          return (
                            <div
                              key={index}
                              className="group/vcard relative p-1 rounded-[2rem] bg-gradient-to-br from-white/10 to-transparent hover:from-indigo-500/30 transition-all duration-500 shadow-xl overflow-hidden"
                            >
                              <div className="relative z-10 p-6 rounded-[1.9rem] bg-[#0A0A0F] h-full flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                  <div className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-widest border border-indigo-500/20">
                                    REV-{index + 1}
                                  </div>
                                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-500 group-hover/vcard:text-indigo-400 transition-colors">
                                    <i className="fa-solid fa-cloud-arrow-down text-xs"></i>
                                  </div>
                                </div>

                                <div className="mb-5">
                                  <h5 className="text-white font-black text-xl mb-1.5 leading-tight group-hover/vcard:text-indigo-200 transition-colors">
                                    {version.Name}
                                  </h5>
                                  <p className="text-gray-500 text-[11px] leading-relaxed">
                                    {version.Description || "Official High-Speed Cloud Mirror"}
                                  </p>

                                  {/* Version Rating */}
                                  <div className="mt-2">
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-500/10 rounded-md border border-yellow-500/20 w-fit">
                                      <i className="fa-solid fa-star text-[8px] text-yellow-400"></i>
                                      <span className="text-yellow-400 font-bold text-[9px]">
                                        {verRating?.average ? verRating.average.toFixed(1) : "0.0"}
                                      </span>
                                      <span className="text-gray-500 text-[9px]">
                                        ({verRating?.count || 0} reviews)
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <button
                                  onClick={() => onDownload(version)}
                                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-4 rounded-[1.2rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-3 transform group-hover/vcard:scale-[1.02] active:scale-95"
                                >
                                  <i className="fa-solid fa-bolt-lightning text-[10px]"></i>
                                  {((!version.price && !item?.price) || Number(version.price || item?.price || 0) === 0) 
                                    ? "Download for Free"
                                    : (item?.id && userProfile?.purchased?.[item.id]) || userProfile?.role === "admin" || userProfile?.role === "creator"
                                    ? "Download"
                                    : "Buy Now"}
                                </button>
                              </div>
                              <div className="absolute inset-0 bg-indigo-500/20 blur-2xl opacity-0 group-hover/vcard:opacity-100 transition-opacity pointer-events-none"></div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        <button
                          onClick={() => onDownload(null)}
                          className="w-full py-4 bg-white hover:bg-gray-200 text-black font-bold rounded-2xl flex justify-center items-center gap-3 transition-all duration-300 hover:scale-[1.02] active:scale-95 text-base shadow-[0_10px_30px_rgba(255,255,255,0.15)] uppercase tracking-widest"
                        >
                          <i className="fa-solid fa-download"></i>
                          {(!item?.price || Number(item?.price) === 0) 
                            ? "Download for Free"
                            : (item?.id && userProfile?.purchased?.[item.id]) || userProfile?.role === "admin" || userProfile?.role === "creator"
                            ? "Download"
                            : "Buy Now"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex flex-col gap-4">
                    {item.hasSubItems && (
                      <button
                        onClick={onShowSubItems}
                        className="w-full py-4 bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-400 hover:to-indigo-500 text-white font-bold rounded-2xl flex justify-center items-center gap-3 transition-all duration-300 hover:scale-[1.02] active:scale-95 text-base shadow-[0_10px_30px_rgba(168,85,247,0.25)] uppercase tracking-widest"
                      >
                        <i className="fa-solid fa-list-ul"></i>
                        <span>{item.subItemsButtonText || "View Included Resources"}</span>
                      </button>
                    )}

                    <button
                      onClick={handleCopyLink}
                      className="w-full py-3 bg-dark-800 border border-white/10 hover:border-white/30 text-gray-300 hover:text-white font-semibold rounded-xl flex justify-center items-center gap-3 transition-all duration-300"
                    >
                      <i className="fa-solid fa-link"></i>
                      <span>{copied ? "Link Copied!" : "Copy Direct Link"}</span>
                    </button>
                  </div>

                  {/* Highlights Footer */}
                  <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-white/10 text-center">
                    <div>
                      <div className="text-3xl mb-3">✉️</div>
                      <div className="text-sm font-bold text-white">Instant Delivery</div>
                      <div className="text-[10px] text-gray-500 mt-1">Automatic Link Access</div>
                    </div>
                    <div>
                      <div className="text-3xl mb-3">🔒</div>
                      <div className="text-sm font-bold text-white">Secure Encrypted</div>
                      <div className="text-[10px] text-gray-500 mt-1">Protected Downloads</div>
                    </div>
                    <div>
                      <div className="text-3xl mb-3">⭐</div>
                      <div className="text-sm font-bold text-white">Vetted Asset</div>
                      <div className="text-[10px] text-gray-500 mt-1">Checked for Malwares</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features Zig-Zag Layout (Long-Form) */}
              {item.features && item.features.length > 0 && (
                <div className="pt-24 pb-12 w-full max-w-[1200px] mx-auto border-t border-white/5 mt-8 space-y-32">
                  {item.features.map((feature, idx) => {
                    const isEven = idx % 2 === 0;
                    return (
                      <div
                        key={idx}
                        className={`grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24 items-center animate-in fade-in slide-in-from-bottom-10 duration-1000 ${
                          isEven ? "" : "md:[direction:rtl]"
                        }`}
                      >
                        <div className="relative aspect-video rounded-[2rem] overflow-hidden shadow-2xl bg-[#0a0a0a] border border-white/5 md:[direction:ltr]">
                          {feature.imageUrl ? (
                            <img src={feature.imageUrl} alt={feature.title} className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">No Showcase Image</div>
                          )}
                        </div>
                        <div className="flex flex-col gap-6 md:[direction:ltr]">
                          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">{feature.title}</h2>
                          <p className="text-base lg:text-lg text-gray-400 leading-relaxed">{feature.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
};
