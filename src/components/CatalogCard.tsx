"use client";

import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { firestore } from "../utils/firebase";

export interface ResourceItem {
  id: string;
  Title: string;
  Description?: string;
  ImageURL?: string;
  price?: string | number;
  priceUSD?: string | number;
  isPro?: boolean;
  compatibleWith?: string[];
  Versions?: Record<string, any>;
}

interface CatalogCardProps {
  item: ResourceItem;
  collectionName: string;
  currency: "INR" | "USD";
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onClick: () => void;
}

export const CatalogCard: React.FC<CatalogCardProps> = ({
  item,
  collectionName,
  currency,
  isFavorite,
  onToggleFavorite,
  onClick,
}) => {
  const [rating, setRating] = useState<string | null>(null);

  useEffect(() => {
    const ratingsCol = collection(firestore, "ratings");
    const q = query(ratingsCol, where("resourceId", "==", item.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        let total = 0;
        snapshot.forEach((docSnap) => {
          total += Number(docSnap.data().stars || docSnap.data().rating || 5);
        });
        setRating((total / snapshot.size).toFixed(1));
      } else {
        setRating(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [item.id]);

  const priceVal = parseFloat(item.price as string) || 0;
  const priceUSDVal = parseFloat(item.priceUSD as string) || 0;

  const displayPrice =
    currency === "USD"
      ? priceUSDVal > 0
        ? "$" + priceUSDVal.toFixed(2)
        : ""
      : priceVal > 0
      ? "₹" + priceVal
      : "";

  let proBadge = null;
  if (priceVal > 0 || priceUSDVal > 0) {
    proBadge = (
      <div className="absolute top-3 left-3 z-20 pointer-events-none">
        <span className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-lg flex items-center gap-1 border border-white/20">
          <i className="fa-solid fa-gem text-[8px]"></i> PREMIUM
        </span>
      </div>
    );
  } else if (item.isPro) {
    proBadge = (
      <div className="absolute top-3 left-3 z-20 pointer-events-none">
        <span className="bg-yellow-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg flex items-center gap-1">
          <i className="fa-solid fa-crown text-[8px]"></i> PRO
        </span>
      </div>
    );
  }

  const compApps: Record<string, { label: string; color: string }> = {
    afterEffects: { label: "Ae", color: "bg-[#00005b]/40 text-[#9999FF] border-[#9999FF]/30" },
    premierePro: { label: "Pr", color: "bg-[#000055]/40 text-[#32aaff] border-[#32aaff]/30" },
    photoshop: { label: "Ps", color: "bg-[#001e36]/40 text-[#31a8ff] border-[#31a8ff]/30" },
    illustrator: { label: "Ai", color: "bg-[#330000]/40 text-[#ff9a00] border-[#ff9a00]/30" },
    davinciResolve: { label: "Dr", color: "bg-red-500/10 text-red-400 border-red-500/30" },
    all: { label: "All", color: "bg-white/10 text-white border-white/20" },
  };

  const versionsCount = item.Versions ? Object.keys(item.Versions).length : 0;

  return (
    <div className="reveal premium-card p-4 flex flex-col gap-2" onClick={onClick}>
      {/* Thumbnail Area */}
      <div className="relative aspect-video rounded-xl overflow-hidden mb-2">
        <img
          src={item.ImageURL || "assets/SM.png"}
          alt={item.Title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
        />
        
        {/* Badges on Top Left & Right */}
        <div className="absolute top-2 left-2 flex gap-1 z-10">
          {proBadge}
        </div>
        <div className="absolute top-2 right-2 z-10">
          <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm border border-white/30">
            {
              {
                adobeSoftware: "Adobe Software",
                plugins: "Premium Plugins",
                scripts: "Scripts & Extensions",
                assets: "VFX Assets",
                utilities: "Utilities",
                courses: "Courses",
                creator_product: "Community Creations",
              }[collectionName] || collectionName
            }
          </span>
        </div>

        {/* Favorite Heart on Bottom Right of Image */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(e);
          }}
          className={`absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            isFavorite 
              ? "bg-red-500/20 text-red-500 border border-red-500/30 backdrop-blur-md" 
              : "bg-black/40 text-white/70 border border-white/20 backdrop-blur-md hover:bg-black/60 hover:text-white"
          }`}
        >
          <i className="fa-solid fa-heart text-[11px]"></i>
        </button>
      </div>

      {/* Content Area */}
      <div className="px-1 pb-1 flex flex-col flex-1">
        <h4 className="text-base font-bold text-white mb-2 line-clamp-2 leading-tight">
          {item.Title}
        </h4>
        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-4 min-h-[36px]">
          {item.Description || "Boost your workflow with this premium asset."}
        </p>

        {/* Footer (Price & CTA) */}
        <div className="flex items-center justify-between mt-auto pt-2">
          <div className="flex items-center gap-1.5">
            {/* If there's an original price, show strikethrough. For now, just show active price */}
            {(priceVal > 0 || priceUSDVal > 0) ? (
              <>
                {/* Mock strikethrough price for design fidelity if needed, or just actual price */}
                <span className="text-[10px] text-gray-500 line-through">
                  {currency === "USD" ? `$${(priceUSDVal * 1.5).toFixed(2)}` : `₹${Math.round(priceVal * 1.5)}`}
                </span>
                <span className="text-sm font-black text-white">
                  {displayPrice}
                </span>
              </>
            ) : (
              <span className="text-sm font-black text-white">Free</span>
            )}
          </div>

          <button 
            className="bg-white text-black font-bold text-[10px] px-4 py-1.5 rounded-full hover:bg-gray-200 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};
