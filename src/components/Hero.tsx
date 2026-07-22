"use client";

import React from "react";
import { useAuth } from "../context/AuthContext";

interface HeroProps {
  onExploreClick: () => void;
  onPremiumClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExploreClick, onPremiumClick }) => {
  const { userProfile } = useAuth();
  const isPremium = !!userProfile?.isPaid || !!userProfile?.purchased?.["PRO_BUNDLE"] || userProfile?.role === "admin" || userProfile?.role === "sub-admin" || userProfile?.role === "creator";

  return (
    <section className="py-12 md:py-32 mb-8 md:mb-16 relative overflow-hidden animate-fade-in-up flex flex-col items-center justify-center text-center border-b border-white/5 px-4">
      {/* Soft background glow mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 flex items-center justify-center">
        <div className="absolute w-[80%] max-w-3xl h-[60%] rounded-full bg-brand-500/10 blur-[120px] animate-pulse-slow"></div>
        <div className="absolute w-[60%] max-w-xl h-[40%] rounded-full bg-indigo-500/10 blur-[100px] animate-pulse-slow delay-1000 transform translate-x-1/4 translate-y-1/4"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center w-full">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-brand-500/10 to-emerald-500/5 border border-brand-500/20 text-brand-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6 md:mb-8 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
          <i className="fa-solid fa-wand-magic-sparkles text-[10px] animate-pulse"></i>
          Harsh Edits Ecosystem
        </div>
        <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-[90px] font-black tracking-normal text-white mb-6 leading-[1.1] md:leading-[1.05] drop-shadow-2xl">
          <span className="block text-white/90">The Ultimate</span>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-emerald-300 to-brand-500 pb-2 drop-shadow-lg">
            Editor's Toolkit.
          </span>
        </h1>
        <p className="text-sm md:text-lg text-gray-400 max-w-2xl leading-relaxed mb-8 md:mb-12 font-medium px-2">
          Curated high-quality plugins, extensions, course tutorials, and pre-configured
          application packages built to support modern professional video creators.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto px-4 sm:px-0">
          <button
            onClick={onExploreClick}
            className="w-full sm:w-auto px-6 py-3.5 md:px-8 md:py-4 bg-gradient-to-r from-brand-500 to-emerald-600 hover:from-brand-400 hover:to-emerald-500 text-white text-sm font-bold rounded-2xl shadow-lg shadow-brand-500/25 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
          >
            <i className="fa-solid fa-rocket"></i> Explore Resources
          </button>
          {!isPremium && (
            <button
              onClick={onPremiumClick}
              className="w-full sm:w-auto px-6 py-3.5 md:px-8 md:py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white text-sm font-bold rounded-2xl transition-all flex items-center justify-center gap-3 backdrop-blur-sm group"
            >
              <i className="fa-solid fa-crown text-brand-400 group-hover:animate-bounce"></i> Go Premium
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
