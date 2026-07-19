"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, getDocs } from "firebase/firestore";
import { firestore } from "../../utils/firebase";
import { LegalLayout } from "../../components/LegalLayout";

interface Creator {
  uid: string;
  name?: string;
  email?: string;
  creatorDetails?: {
    bio?: string;
    displayName?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    supportEmail?: string;
  };
}

export default function CreatorsDirectory() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCreators = async () => {
      try {
        const q = query(
          collection(firestore, "users"),
          where("role", "==", "creator"),
          where("isCreatorApproved", "==", true)
        );
        const snap = await getDocs(q);
        const list: Creator[] = [];
        snap.forEach((docSnap) => {
          list.push({
            uid: docSnap.id,
            ...docSnap.data(),
          });
        });
        setCreators(list);
      } catch (err) {
        console.error("Failed to load creators:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCreators();
  }, []);

  return (
    <LegalLayout
      title={
        <>
          Creative <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-indigo-500">Storefronts</span>
        </>
      }
      subtitle="Discover and browse exclusive resources uploaded by certified community creators."
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="text-xs font-semibold">Loading certified creators...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {creators.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {creators.map((creator) => {
                const details = creator.creatorDetails || {};
                const displayName = details.displayName || creator.name || "Anonymous Creator";
                const bio = details.bio || "Certified SoftwhereHub marketplace merchant uploading premium editing assets.";
                const avatar = details.avatarUrl || "";

                return (
                  <div
                    key={creator.uid}
                    className="glass-card hover:border-indigo-500/30 p-6 rounded-3xl flex flex-col justify-between transition-all group relative overflow-hidden bg-[#0A0A0F]/80 backdrop-blur-md border border-white/5 shadow-xl"
                  >
                    {/* Background glow hover effect */}
                    <div className="absolute inset-0 bg-indigo-500/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -z-10"></div>
                    
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-16 h-16 rounded-2xl bg-indigo-500 flex items-center justify-center font-bold text-white shadow-lg overflow-hidden shrink-0 border border-white/10">
                        {avatar ? (
                          <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl">{displayName[0].toUpperCase()}</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="space-y-1 min-w-0">
                        <h3 className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors truncate">
                          {displayName}
                        </h3>
                        <p className="text-xs text-indigo-400 font-bold tracking-widest uppercase">Verified Creator</p>
                        <p className="text-xs text-gray-400 mt-2 line-clamp-3 leading-relaxed">
                          {bio}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/5 flex justify-end">
                      <Link
                        href={`/creator/${creator.uid}`}
                        className="bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-xl text-xs font-bold px-4 py-2.5 transition-all border border-indigo-500/20 active:scale-95 flex items-center gap-2"
                      >
                        Visit Storefront <i className="fa-solid fa-arrow-right text-[10px]"></i>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-500 glass-card border-dashed border-white/10 rounded-3xl bg-[#0f0f15]/50">
              <span className="text-4xl block mb-4">🎨</span>
              <h3 className="text-lg font-bold text-white mb-2">No creators active yet</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                We are currently reviewing applications. If you are a creator wanting to list your assets on our storefront, apply in your profile options.
              </p>
            </div>
          )}
        </div>
      )}
    </LegalLayout>
  );
}
