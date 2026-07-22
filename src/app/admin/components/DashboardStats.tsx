"use client";

import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { firestore } from "../../../utils/firebase";

interface DashboardStatsProps {
  setActiveTab: (tab: string) => void;
  isSuperAdmin: boolean;
}

export default function DashboardStats({ setActiveTab, isSuperAdmin }: DashboardStatsProps) {
  const [stats, setStats] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    const loadStats = async () => {
      try {
        const statsData: Record<string, any> = {
          adobeSoftware: 0,
          plugins: 0,
          scripts: 0,
          assets: 0,
          utilities: 0,
          courses: 0,
          simplePluginsList: 0,
          banners: 0,
          unreadMessages: 0,
          totalMessages: 0,
          brokenLinks: 0,
          totalRevenue: 0,
          recentTxCount: 0,
          recentLogs: [],
          totalUsers: 0,
          paidUsers: 0,
        };

        // 1. Fetch products count grouped by category
        const productsSnap = await getDocs(collection(firestore, "products"));
        productsSnap.forEach((docSnap) => {
          const cat = docSnap.data().Category || "plugins";
          if (statsData[cat] !== undefined) {
            statsData[cat]++;
          }
        });

        // 2. Fetch banners
        const bannersSnap = await getDocs(collection(firestore, "banners"));
        statsData.banners = bannersSnap.size;

        // 3. Fetch user messages
        const msgsSnap = await getDocs(collection(firestore, "userMessages"));
        statsData.totalMessages = msgsSnap.size;
        let unread = 0;
        msgsSnap.forEach((docSnap) => {
          if (docSnap.data().status === "pending") {
            unread++;
          }
        });
        statsData.unreadMessages = unread;

        // 4. Fetch broken link reports
        const reportsSnap = await getDocs(collection(firestore, "brokenLinkReports"));
        let activeReports = 0;
        reportsSnap.forEach((docSnap) => {
          if (docSnap.data().status !== "fixed") {
            activeReports++;
          }
        });
        statsData.brokenLinks = activeReports;

        // 5. Fetch transactions
        const txSnap = await getDocs(collection(firestore, "transactions"));
        statsData.recentTxCount = txSnap.size;
        let revenue = 0;
        txSnap.forEach((docSnap) => {
          revenue += Number(docSnap.data().amount) || 0;
        });
        statsData.totalRevenue = revenue;

        // 6. Fetch users
        const usersSnap = await getDocs(collection(firestore, "users"));
        statsData.totalUsers = usersSnap.size;
        let paid = 0;
        usersSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.isPaid === true || data.purchased?.["PRO_BUNDLE"] === true) {
            paid++;
          }
        });
        statsData.paidUsers = paid;

        // 7. Fetch audit logs (recent 5)
        const logsQuery = query(collection(firestore, "auditLogs"), orderBy("timestamp", "desc"), limit(5));
        const logsSnap = await getDocs(logsQuery);
        const recentLogs: any[] = [];
        logsSnap.forEach((docSnap) => {
          const data = docSnap.data();
          let ts = data.timestamp;
          if (ts && typeof ts.toMillis === "function") ts = ts.toMillis();
          recentLogs.push({
            action: data.action || data.type || "Activity",
            adminEmail: data.adminEmail || data.user || "N/A",
            itemName: data.itemName || data.detail || "",
            timestamp: ts || Date.now(),
          });
        });
        statsData.recentLogs = recentLogs;

        setStats(statsData);
      } catch (err) {
        console.error("Error loading dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold">Initializing real-time stats...</p>
      </div>
    );
  }

  const contentCollections = [
    { name: "adobeSoftware", label: "Adobe Software", icon: "🎨", color: "from-purple-600 to-pink-600" },
    { name: "plugins", label: "Plugins", icon: "🔌", color: "from-blue-600 to-cyan-600" },
    { name: "scripts", label: "Scripts", icon: "📜", color: "from-green-600 to-emerald-600" },
    { name: "assets", label: "Assets", icon: "📦", color: "from-orange-600 to-amber-600" },
    { name: "utilities", label: "Utilities", icon: "🛠️", color: "from-indigo-600 to-violet-600" },
    { name: "simplePluginsList", label: "100+ Plugins", icon: "📋", color: "from-teal-600 to-cyan-600" },
  ];

  return (
    <div className="space-y-10 animate-fade-in text-white">
      {/* Vital Statistics Row */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <span className="text-indigo-400">⚡</span> Vital Statistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {isSuperAdmin && (
            <div className="glass-card p-6 flex flex-col justify-between group h-44 relative cursor-pointer">
              <div className="absolute -right-4 -bottom-4 text-[5rem] opacity-[0.02] group-hover:opacity-[0.06] group-hover:scale-110 premium-transition duration-500 pointer-events-none select-none">👥</div>
              <div className="flex flex-col h-full justify-between relative z-10 w-full">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 rounded-lg bg-white/5 text-2xl shadow-inner">👥</div>
                  <div className="text-xs text-gray-500 group-hover:text-indigo-400 transition-colors flex items-center gap-1">
                    View <svg className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                  </div>
                </div>
                <div>
                  <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Registered Users</h4>
                  <p className="text-3xl font-black bg-gradient-to-r from-amber-450 to-orange-500 bg-clip-text text-transparent mt-1">{stats.totalUsers || 0}</p>
                  <p className="text-[10px] text-gray-500 mt-1">Active Accounts</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setActiveTab("userMessages")}
            className="glass-card p-6 flex flex-col justify-between group h-44 relative text-left w-full cursor-pointer"
          >
            <div className="absolute -right-4 -bottom-4 text-[5rem] opacity-[0.02] group-hover:opacity-[0.06] group-hover:scale-110 premium-transition duration-500 pointer-events-none select-none">💬</div>
            <div className="flex flex-col h-full justify-between relative z-10 w-full">
              <div className="flex justify-between items-start mb-2">
                <div className="p-2 rounded-lg bg-white/5 text-2xl shadow-inner">💬</div>
                <div className="text-xs text-gray-500 group-hover:text-indigo-400 transition-colors flex items-center gap-1">
                  View <svg className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                </div>
              </div>
              <div>
                <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Unread Messages</h4>
                <p className="text-3xl font-black bg-gradient-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent mt-1">{stats.unreadMessages || 0}</p>
                <p className="text-[10px] text-gray-500 mt-1">{stats.totalMessages || 0} Total Conversations</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("brokenLinks")}
            className="glass-card p-6 flex flex-col justify-between group h-44 relative text-left w-full cursor-pointer"
          >
            <div className="absolute -right-4 -bottom-4 text-[5rem] opacity-[0.02] group-hover:opacity-[0.06] group-hover:scale-110 premium-transition duration-500 pointer-events-none select-none">🔗</div>
            <div className="flex flex-col h-full justify-between relative z-10 w-full">
              <div className="flex justify-between items-start mb-2">
                <div className="p-2 rounded-lg bg-white/5 text-2xl shadow-inner">🔗</div>
                <div className="text-xs text-gray-500 group-hover:text-indigo-400 transition-colors flex items-center gap-1">
                  View <svg className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                </div>
              </div>
              <div>
                <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Broken Links</h4>
                <p className="text-3xl font-black bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent mt-1">{stats.brokenLinks || 0}</p>
                <p className="text-[10px] text-gray-500 mt-1">Active Reports</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Revenue Row */}
      {isSuperAdmin && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span className="text-emerald-400">💵</span> Revenue Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => setActiveTab("revenueDashboard")}
              className="glass-card p-6 flex flex-col justify-between group h-44 relative text-left w-full cursor-pointer"
            >
              <div className="absolute -right-4 -bottom-4 text-[5rem] opacity-[0.02] group-hover:opacity-[0.06] group-hover:scale-110 premium-transition duration-500 pointer-events-none select-none">💰</div>
              <div className="flex flex-col h-full justify-between relative z-10 w-full">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 rounded-lg bg-white/5 text-2xl shadow-inner">💰</div>
                  <div className="text-xs text-gray-500 group-hover:text-indigo-400 transition-colors flex items-center gap-1">
                    View <svg className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                  </div>
                </div>
                <div>
                  <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Revenue</h4>
                  <p className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent mt-1">₹{(stats.totalRevenue || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-gray-500 mt-1">Lifetime Earnings</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("revenueDashboard")}
              className="glass-card p-6 flex flex-col justify-between group h-44 relative text-left w-full cursor-pointer"
            >
              <div className="absolute -right-4 -bottom-4 text-[5rem] opacity-[0.02] group-hover:opacity-[0.06] group-hover:scale-110 premium-transition duration-500 pointer-events-none select-none">⭐</div>
              <div className="flex flex-col h-full justify-between relative z-10 w-full">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 rounded-lg bg-white/5 text-2xl shadow-inner">⭐</div>
                  <div className="text-xs text-gray-500 group-hover:text-indigo-400 transition-colors flex items-center gap-1">
                    View <svg className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                  </div>
                </div>
                <div>
                  <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Pro Members</h4>
                  <p className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mt-1">{stats.paidUsers || 0}</p>
                  <p className="text-[10px] text-gray-500 mt-1">Premium Accounts</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("revenueDashboard")}
              className="glass-card p-6 flex flex-col justify-between group h-44 relative text-left w-full cursor-pointer"
            >
              <div className="absolute -right-4 -bottom-4 text-[5rem] opacity-[0.02] group-hover:opacity-[0.06] group-hover:scale-110 premium-transition duration-500 pointer-events-none select-none">📈</div>
              <div className="flex flex-col h-full justify-between relative z-10 w-full">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 rounded-lg bg-white/5 text-2xl shadow-inner">📈</div>
                  <div className="text-xs text-gray-500 group-hover:text-indigo-400 transition-colors flex items-center gap-1">
                    View <svg className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                  </div>
                </div>
                <div>
                  <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Recent Sales</h4>
                  <p className="text-3xl font-black bg-gradient-to-r from-indigo-400 to-blue-500 bg-clip-text text-transparent mt-1">{stats.recentTxCount || 0}</p>
                  <p className="text-[10px] text-gray-500 mt-1">Last 30 Transactions</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Resource Inventory */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <span className="text-emerald-400">📦</span> Resource Inventory
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {contentCollections.map((col) => (
            <button
              key={col.name}
              onClick={() => setActiveTab(col.name)}
              className="glass-card p-5 text-left hover:border-indigo-500/30 transition-all group flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute -right-2 -bottom-2 text-3xl opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-110 premium-transition duration-500 pointer-events-none select-none">{col.icon}</div>
              <div className="flex items-center justify-between w-full relative z-10">
                <span className="text-2xl group-hover:scale-110 duration-200 inline-block">{col.icon}</span>
                <span className="text-xs font-black text-indigo-400">{stats[col.name] || 0}</span>
              </div>
              <h5 className="text-[10px] text-gray-455 font-bold uppercase tracking-wider mt-3 truncate relative z-10">{col.label}</h5>
            </button>
          ))}
        </div>
      </div>

      {/* Management Shortcuts */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <span className="text-purple-400">⚙️</span> Management Shortcuts
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Add New Asset", icon: "📦", tab: "assets" },
            { label: "Site Settings", icon: "⚙️", tab: "siteSettings" },
            { label: "Update Banners", icon: "🖼️", tab: "banners" },
            { label: "Review Ratings", icon: "⭐", tab: "ratings" },
          ].map((act) => (
            <button
              key={act.label}
              onClick={() => setActiveTab(act.tab)}
              className="glass-card p-4 text-left hover:border-indigo-500/30 transition-all flex items-center gap-3 group relative overflow-hidden"
            >
              <div className="absolute -right-2 -bottom-2 text-3xl opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-110 premium-transition duration-500 pointer-events-none select-none">{act.icon}</div>
              <span className="text-xl group-hover:scale-110 duration-200 inline-block relative z-10">{act.icon}</span>
              <span className="text-xs font-bold text-gray-300 truncate relative z-10">{act.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent System Activity */}
      {isSuperAdmin && stats.recentLogs && stats.recentLogs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span className="text-indigo-400">🕒</span> Recent System Activity
          </h3>
          <div className="glass-card p-6">
            <div className="divide-y divide-white/5">
              {stats.recentLogs.map((log: any, idx: number) => {
                const date = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "Recently";
                return (
                  <div key={idx} className="py-3 flex items-center justify-between group first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] group-hover:scale-125 transition-transform animate-pulse"></div>
                      <div>
                        <div className="text-xs text-gray-200 group-hover:text-indigo-400 transition-colors font-medium">
                          {log.action}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {log.adminEmail || log.userEmail || "System"} • {log.itemName || log.details || ""}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-500 font-semibold">{date}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
