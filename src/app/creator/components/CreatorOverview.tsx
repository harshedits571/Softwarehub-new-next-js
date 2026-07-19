"use client";

import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { firestore } from "../../../utils/firebase";

interface CreatorOverviewProps {
  currentUser: any;
  setActiveTab: (tab: string) => void;
}

export default function CreatorOverview({ currentUser, setActiveTab }: CreatorOverviewProps) {
  const [stats, setStats] = useState<Record<string, number>>({
    approved: 0,
    pending: 0,
    rejected: 0,
    salesCount: 0,
    revenueINR: 0,
    revenueUSD: 0,
    downloadsCount: 0,
  });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [recentDownloads, setRecentDownloads] = useState<any[]>([]);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverviewData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Listings count
        const listingsQ = query(
          collection(firestore, "products"),
          where("ownerUid", "==", currentUser.uid)
        );
        const lSnap = await getDocs(listingsQ);
        let approved = 0;
        let pending = 0;
        let rejected = 0;
        lSnap.forEach((docSnap) => {
          const status = docSnap.data().status || "pending";
          if (status === "approved") approved++;
          else if (status === "pending") pending++;
          else if (status === "rejected") rejected++;
        });

        // 2. Fetch Sales Ledger stats
        const salesQ = query(
          collection(firestore, "transactions"),
          where("vendorId", "==", currentUser.uid)
        );
        const sSnap = await getDocs(salesQ);
        let salesCount = 0;
        let revenueINR = 0;
        let revenueUSD = 0;
        const salesList: any[] = [];
        
        sSnap.forEach((docSnap) => {
          const tx = docSnap.data();
          salesCount++;
          if (tx.currency === "USD") {
            revenueUSD += Number(tx.amount) || 0;
          } else {
            revenueINR += Number(tx.amount) || 0;
          }

          let ts = tx.timestamp;
          if (ts && typeof ts.toMillis === "function") ts = ts.toMillis();
          else if (ts && typeof ts === "object" && ts.seconds) ts = ts.seconds * 1000;
          else ts = Number(ts) || Date.now();

          salesList.push({
            id: docSnap.id,
            itemTitle: tx.itemTitle || "Untitled Asset",
            amount: Number(tx.amount) || 0,
            currency: tx.currency || "INR",
            timestamp: ts,
            userName: tx.userName || tx.name || "Customer",
          });
        });

        // Sort sales by date and select top 5
        const sortedSales = salesList.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
        setRecentSales(sortedSales);

        // 3. Fetch Recent Ratings
        const ratingsQ = query(
          collection(firestore, "productReviews"),
          where("ownerUid", "==", currentUser.uid)
        );
        const rSnap = await getDocs(ratingsQ);
        const reviewsList: any[] = [];
        rSnap.forEach((docSnap) => {
          const r = docSnap.data();
          let rts = r.timestamp;
          if (rts && typeof rts.toMillis === "function") rts = rts.toMillis();
          else if (rts && typeof rts === "object" && rts.seconds) rts = rts.seconds * 1000;
          else rts = Number(rts) || Date.now();
          
          reviewsList.push({
            id: docSnap.id,
            userName: r.userName || "Customer",
            rating: Number(r.rating) || 5,
            feedback: r.feedback || "",
            timestamp: rts,
            resourceId: r.resourceId,
          });
        });

        // Sort reviews by date and select top 5
        const sortedReviews = reviewsList.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
        setRecentReviews(sortedReviews);

        // 4. Fetch Download Logs
        const dlsQ = query(
          collection(firestore, "downloadLogs"),
          where("ownerUid", "==", currentUser.uid)
        );
        const dlsSnap = await getDocs(dlsQ);
        let downloadsCount = 0;
        const dlsList: any[] = [];
        
        dlsSnap.forEach((docSnap) => {
          const dl = docSnap.data();
          downloadsCount++;
          
          let ts = dl.timestamp;
          if (ts && typeof ts.toMillis === "function") ts = ts.toMillis();
          else if (ts && typeof ts === "object" && ts.seconds) ts = ts.seconds * 1000;
          else ts = Number(ts) || Date.now();

          dlsList.push({
            id: docSnap.id,
            itemTitle: dl.resourceTitle || "Untitled Asset",
            versionName: dl.versionName || "Latest",
            timestamp: ts,
            email: dl.email || "Anonymous",
          });
        });

        const sortedDownloads = dlsList.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
        setRecentDownloads(sortedDownloads);

        setStats({
          approved,
          pending,
          rejected,
          salesCount,
          revenueINR,
          revenueUSD,
          downloadsCount,
        });
      } catch (err) {
        console.error("Error loading overview stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-semibold">Generating storefront analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in text-white">
      {/* Vital stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between h-36">
          <div className="flex justify-between items-center text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Assets</span>
            <span>✅</span>
          </div>
          <div>
            <h4 className="text-2xl font-black text-white">{stats.approved}</h4>
            <p className="text-[10px] text-gray-500 mt-1">Live Storefront Listings</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between h-36">
          <div className="flex justify-between items-center text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Pending Review</span>
            <span>🕒</span>
          </div>
          <div>
            <h4 className="text-2xl font-black text-yellow-500">{stats.pending}</h4>
            <p className="text-[10px] text-gray-500 mt-1">Awaiting Approvals</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between h-36">
          <div className="flex justify-between items-center text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Completed Sales</span>
            <span>📈</span>
          </div>
          <div>
            <h4 className="text-2xl font-black text-emerald-400">{stats.salesCount}</h4>
            <p className="text-[10px] text-gray-500 mt-1">Lifetime Orders</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between h-36">
          <div className="flex justify-between items-center text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Downloads</span>
            <span>⬇️</span>
          </div>
          <div>
            <h4 className="text-2xl font-black text-cyan-400">{stats.downloadsCount}</h4>
            <p className="text-[10px] text-gray-500 mt-1">Product Acquisitions</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between h-36">
          <div className="flex justify-between items-center text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Gross Earnings</span>
            <span>💰</span>
          </div>
          <div>
            <h4 className="text-lg font-black text-indigo-400">₹{stats.revenueINR.toLocaleString()}</h4>
            <h4 className="text-lg font-black text-indigo-400">${stats.revenueUSD.toFixed(2)}</h4>
            <p className="text-[10px] text-gray-500 mt-1">Pre-commission splits</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="glass-card p-6 rounded-3xl space-y-4">
          <h3 className="text-sm font-bold text-gray-300">🕒 Recent Storefront Orders</h3>
          <div className="divide-y divide-white/5">
            {recentSales.length > 0 ? (
              recentSales.map((sale) => (
                <div key={sale.id} className="py-3 flex justify-between items-center group">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors truncate">{sale.itemTitle}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{sale.userName} • {new Date(sale.timestamp).toLocaleDateString()}</p>
                  </div>
                  <span className="text-xs font-black text-emerald-400 shrink-0">
                    {sale.currency === "USD" ? `$${sale.amount}` : `₹${sale.amount}`}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 py-10 text-center">No orders registered yet.</p>
            )}
          </div>
        </div>

        {/* Recent Downloads */}
        <div className="glass-card p-6 rounded-3xl space-y-4">
          <h3 className="text-sm font-bold text-gray-300">⬇️ Recent Storefront Downloads</h3>
          <div className="divide-y divide-white/5">
            {recentDownloads.length > 0 ? (
              recentDownloads.map((dl) => (
                <div key={dl.id} className="py-3 flex justify-between items-center group">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors truncate">{dl.itemTitle}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{dl.email} • {dl.versionName} • {new Date(dl.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 py-10 text-center">No downloads registered yet.</p>
            )}
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="glass-card p-6 rounded-3xl space-y-6">
          <h3 className="text-sm font-bold text-gray-300">⭐ Recent Customer Reviews</h3>
          
          <div className="divide-y divide-white/5">
            {recentReviews.length > 0 ? (
              recentReviews.map((review) => (
                <div key={review.id} className="py-3 flex flex-col gap-1 group">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">{review.userName}</p>
                    <div className="flex items-center text-yellow-500 text-xs">
                      {Array(review.rating).fill(0).map((_, i) => (
                        <i key={i} className="fa-solid fa-star"></i>
                      ))}
                      {Array(5 - review.rating).fill(0).map((_, i) => (
                        <i key={i} className="fa-regular fa-star opacity-30"></i>
                      ))}
                    </div>
                  </div>
                  {review.feedback ? (
                    <p className="text-xs text-gray-300 mt-1 italic leading-relaxed">"{review.feedback}"</p>
                  ) : (
                    <p className="text-[10px] text-gray-600 mt-1 italic">No written feedback provided.</p>
                  )}
                  <p className="text-[9px] text-gray-600 mt-1">{new Date(review.timestamp).toLocaleDateString()}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 py-10 text-center">No reviews received yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
