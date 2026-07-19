"use client";

import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { firestore } from "../../../utils/firebase";
import { User } from "firebase/auth";

interface VendorAnalyticsProps {
  currentUser: User | null;
  isSubAdmin: boolean;
}

interface TransactionData {
  id: string;
  customerName: string;
  customerEmail: string;
  itemTitle: string;
  amount: number;
  currency: string;
  timestamp: number;
  vendorId: string;
}

export default function VendorAnalytics({ currentUser, isSubAdmin }: VendorAnalyticsProps) {
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSales = async () => {
      setLoading(true);
      try {
        const txQuery = query(collection(firestore, "transactions"), orderBy("timestamp", "desc"));
        const txSnap = await getDocs(txQuery);
        const txList: TransactionData[] = [];

        txSnap.forEach((docSnap) => {
          const tx = docSnap.data();
          const vendorId = tx.vendorId || tx.ownerUid || tx.creatorUid || tx.uid;

          // If subadmin, only show their own sales
          if (isSubAdmin && currentUser && vendorId !== currentUser.uid) {
            return;
          }

          txList.push({
            id: docSnap.id,
            customerName: tx.userName || tx.name || "Unknown Customer",
            customerEmail: tx.email || "N/A",
            itemTitle: tx.itemTitle || tx.title || "Unknown Item",
            amount: parseFloat(tx.amount as string) || 0,
            currency: tx.currency || "INR",
            timestamp: tx.timestamp || Date.now(),
            vendorId: vendorId || "Unknown"
          });
        });

        setTransactions(txList);
      } catch (err) {
        console.error("Error loading vendor sales:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, [currentUser, isSubAdmin]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold">Loading sales analytics...</p>
      </div>
    );
  }

  // Calculate totals
  const totalRevenue = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const totalSales = transactions.length;

  return (
    <div className="space-y-6 animate-fade-in text-white">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Sales & Revenue <span className="text-amber-500">Analytics</span>
          </h2>
          <p className="text-gray-400 text-xs mt-1">Detailed breakdown of customer purchases</p>
        </div>
        
        {/* Quick Stats */}
        <div className="flex gap-4">
          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-center">
             <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Total Sales</div>
             <div className="text-xl font-black text-amber-500">{totalSales}</div>
          </div>
          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-center">
             <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Total Revenue</div>
             <div className="text-xl font-black text-emerald-400">₹{totalRevenue.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-[#111118]">
                {!isSubAdmin && <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Vendor ID</th>}
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Item Purchased</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.length > 0 ? (
                transactions.map((row) => (
                  <tr key={row.id} className="hover:bg-white/5 transition-all">
                    {!isSubAdmin && <td className="px-6 py-4 font-mono text-xs text-gray-600">{row.vendorId.substring(0,8)}...</td>}
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-white">{row.customerName}</div>
                      <div className="text-[10px] text-gray-500">{row.customerEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-indigo-300 max-w-[200px] truncate" title={row.itemTitle}>
                      {row.itemTitle}
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-emerald-400">
                      {row.currency === "USD" ? "$" : "₹"}{row.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-[11px] text-gray-400">
                      {new Date(row.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isSubAdmin ? 4 : 5} className="px-6 py-12 text-center text-gray-500 text-sm">
                    No customer purchases found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
