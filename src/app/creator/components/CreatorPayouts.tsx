"use client";

import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { firestore } from "../../../utils/firebase";

interface CreatorPayoutsProps {
  currentUser: any;
}

interface Transaction {
  id: string;
  itemTitle: string;
  amount: number;
  currency: string;
  timestamp: number;
  paymentId: string;
  email: string;
  userName?: string;
}

export default function CreatorPayouts({ currentUser }: CreatorPayoutsProps) {
  const [sales, setSales] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSales = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(firestore, "transactions"),
          where("vendorId", "==", currentUser.uid),
          orderBy("timestamp", "desc")
        );
        const snap = await getDocs(q);
        const list: Transaction[] = [];
        snap.forEach((docSnap) => {
          const val = docSnap.data();
          let ts = val.timestamp;
          if (ts && typeof ts.toMillis === "function") ts = ts.toMillis();
          else if (ts && typeof ts === "object" && ts.seconds) ts = ts.seconds * 1000;
          else ts = Number(ts) || Date.now();

          list.push({
            id: docSnap.id,
            itemTitle: val.itemTitle || "Untitled Asset",
            amount: Number(val.amount) || 0,
            currency: val.currency || "INR",
            timestamp: ts,
            paymentId: val.paymentId || "N/A",
            email: val.email || "N/A",
            userName: val.userName || val.name || "Customer",
          });
        });
        setSales(list);
      } catch (err) {
        console.error("Error loading creator sales ledger:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, []);

  const totalSalesCount = sales.length;
  
  // Calculate currencies gross
  const grossINR = sales.filter(s => s.currency === "INR").reduce((sum, s) => sum + s.amount, 0);
  const grossUSD = sales.filter(s => s.currency === "USD").reduce((sum, s) => sum + s.amount, 0);

  // Splits: 90% Creator, 10% Platform Commission
  const netCreatorINR = grossINR * 0.9;
  const netCreatorUSD = grossUSD * 0.9;

  return (
    <div className="space-y-8 text-white animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Sales & Payouts Ledger</h2>
        <p className="text-gray-400 text-xs mt-1">Review sales commissions splits (90% Payout / 10% Platform Fee)</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-white/5 bg-[#0f0f15]/50 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Gross Sales</span>
            <span className="text-xl">📈</span>
          </div>
          <div>
            <p className="text-2xl font-black text-white">{totalSalesCount} Sales</p>
            <p className="text-[10px] text-gray-500 mt-1">Total Purchases Processed</p>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-white/5 bg-[#0f0f15]/50 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Gross Earnings</span>
            <span className="text-xl text-emerald-400">₹</span>
          </div>
          <div>
            <p className="text-xl font-black text-emerald-400">₹{grossINR.toLocaleString()} <span className="text-xs text-gray-500">Gross</span></p>
            <p className="text-xl font-black text-emerald-400">${grossUSD.toFixed(2)} <span className="text-xs text-gray-500">Gross</span></p>
            <p className="text-[10px] text-gray-500 mt-1">Total Customer Payments</p>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-white/5 bg-[#0f0f15]/50 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 bottom-0 text-[6rem] opacity-[0.02] pointer-events-none select-none">👑</div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Your Net Payout (90%)</span>
            <span className="text-xl text-indigo-400">💰</span>
          </div>
          <div>
            <p className="text-xl font-black text-indigo-400">₹{netCreatorINR.toLocaleString()}</p>
            <p className="text-xl font-black text-indigo-400">${netCreatorUSD.toFixed(2)}</p>
            <p className="text-[10px] text-gray-500 mt-1">Net Earnings (Excluding 10% Fee)</p>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
        <h3 className="px-6 py-4 text-xs font-bold text-white border-b border-white/5 uppercase bg-white/5">Sales Record History</h3>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
            <p className="text-[10px] font-bold">Querying ledger records...</p>
          </div>
        ) : sales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 text-xs bg-white/5 font-bold uppercase">
                  <th className="px-6 py-4">Asset Details</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Transaction Details</th>
                  <th className="px-6 py-4">Net Earned (90%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                {sales.map((s) => {
                  const dateStr = new Date(s.timestamp).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  });
                  const timeStr = new Date(s.timestamp).toLocaleTimeString();
                  const creatorNet = s.amount * 0.9;

                  return (
                    <tr key={s.id} className="hover:bg-white/5 transition-all">
                      <td className="px-6 py-4">
                        <p className="font-bold text-white leading-tight">{s.itemTitle}</p>
                        <p className="text-[10px] text-gray-500 mt-1">TXID: {s.id}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-white leading-tight">{s.userName}</p>
                        <p className="text-[10px] text-gray-500 mt-1">{s.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[10px] text-gray-400 font-bold font-mono">ID: {s.paymentId}</p>
                        <p className="text-[9px] text-gray-500 mt-1">{dateStr} • {timeStr}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-black text-indigo-400 leading-tight">
                          {s.currency === "USD" ? `$${creatorNet.toFixed(2)}` : `₹${creatorNet}`}
                        </span>
                        <p className="text-[9px] text-gray-500 mt-1">Gross paid: {s.currency === "USD" ? `$${s.amount}` : `₹${s.amount}`}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500">
            <span className="text-3xl block mb-2">🧾</span>
            <p className="text-xs font-semibold">No sales have been processed for your listings yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
