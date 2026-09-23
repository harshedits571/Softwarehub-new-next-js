"use client";

import React from "react";

interface OverviewTabProps {
  stats: {
    totalRevenue: number;
    totalSales: number;
    totalLeads: number;
    activeLicenses: number;
    conversionRate: number;
    avgOrderValue: number;
    interestedCount: number;
    verifiedCount: number;
    cancelledCount: number;
  };
  recentPayments: any[];
  recentLeads: any[];
  onNavigateTab: (tabId: string) => void;
}

export default function OverviewTab({
  stats,
  recentPayments,
  recentLeads,
  onNavigateTab,
}: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Revenue */}
        <div className="bg-[#0f111a] border border-white/5 rounded-2xl p-5 hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs">
              <i className="fa-solid fa-indian-rupee-sign"></i>
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            ₹{stats.totalRevenue.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <i className="fa-solid fa-arrow-trend-up"></i>
            <span>Real-time earnings</span>
          </p>
        </div>

        {/* Total Sales */}
        <div className="bg-[#0f111a] border border-white/5 rounded-2xl p-5 hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Sales</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs">
              <i className="fa-solid fa-bag-shopping"></i>
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats.totalSales}</div>
          <p className="text-[11px] text-gray-400 mt-1">Paid licenses issued</p>
        </div>

        {/* Total Leads */}
        <div className="bg-[#0f111a] border border-white/5 rounded-2xl p-5 hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Leads</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs">
              <i className="fa-solid fa-users"></i>
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats.totalLeads}</div>
          <p className="text-[11px] text-amber-400/80 mt-1">
            {stats.interestedCount} Interested • {stats.verifiedCount} Verified
          </p>
        </div>

        {/* Active Licenses */}
        <div className="bg-[#0f111a] border border-white/5 rounded-2xl p-5 hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Licenses</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs">
              <i className="fa-solid fa-key"></i>
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats.activeLicenses}</div>
          <p className="text-[11px] text-cyan-400 mt-1">Hardware locked keys</p>
        </div>

        {/* Conversion Rate */}
        <div className="bg-[#0f111a] border border-white/5 rounded-2xl p-5 hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Conversion</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center text-xs">
              <i className="fa-solid fa-percent"></i>
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats.conversionRate}%</div>
          <p className="text-[11px] text-purple-400 mt-1">Interested $\rightarrow$ Paid</p>
        </div>

        {/* Avg Order Value */}
        <div className="bg-[#0f111a] border border-white/5 rounded-2xl p-5 hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Order</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center text-xs">
              <i className="fa-solid fa-chart-pie"></i>
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            ₹{stats.avgOrderValue.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Per transaction</p>
        </div>
      </div>

      {/* Conversion Funnel & Quick Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Conversion Funnel */}
        <div className="bg-[#0f111a] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-filter text-cyan-400"></i>
              Customer Conversion Funnel
            </h3>
            <span className="text-[11px] text-gray-400">Website Traffic</span>
          </div>

          <div className="space-y-4">
            {/* Step 1: Interested */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-300 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Interested (Initiated Checkout)
                </span>
                <span className="text-amber-400 font-bold">{stats.interestedCount}</span>
              </div>
              <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.totalLeads > 0 ? 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Step 2: Verified / Converted */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-300 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Verified (Completed Payment)
                </span>
                <span className="text-emerald-400 font-bold">{stats.verifiedCount}</span>
              </div>
              <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${stats.totalLeads > 0 ? (stats.verifiedCount / stats.totalLeads) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Step 3: Active Device Bound */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-300 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  Active Installed PCs
                </span>
                <span className="text-cyan-400 font-bold">{stats.activeLicenses}</span>
              </div>
              <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${stats.totalSales > 0 ? Math.min(100, (stats.activeLicenses / stats.totalSales) * 100) : 0}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
            <span>Overall Conversion:</span>
            <span className="text-emerald-400 font-bold text-sm">{stats.conversionRate}%</span>
          </div>
        </div>

        {/* Quick Growth Bar Chart */}
        <div className="lg:col-span-2 bg-[#0f111a] border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-chart-column text-indigo-400"></i>
                Revenue & Sales Momentum
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Dynamic visual trend of Personal Cloud Pro purchases
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-white/5 text-[10px] text-gray-400 font-semibold">
                Live Data
              </span>
            </div>
          </div>

          {/* SVG Visual Graph */}
          <div className="relative h-44 w-full flex items-end gap-2 pt-6">
            {stats.totalSales === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 text-xs">
                <i className="fa-solid fa-chart-line text-2xl mb-2 text-gray-600"></i>
                <span>No purchase data recorded yet</span>
              </div>
            ) : (
              <div className="w-full h-full flex items-end justify-between gap-3 px-2">
                {recentPayments.slice(0, 10).reverse().map((pay, idx) => {
                  const amt = Number(pay.amount) || 999;
                  const maxAmt = 2000;
                  const heightPct = Math.max(15, Math.min(100, (amt / maxAmt) * 100));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-black/90 border border-white/10 px-2 py-0.5 rounded text-[10px] text-white whitespace-nowrap pointer-events-none z-10">
                        ₹{amt} • {pay.plan || "pro"}
                      </div>
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-cyan-600 to-indigo-500 group-hover:from-cyan-400 group-hover:to-indigo-300 transition-all duration-300"
                        style={{ height: `${heightPct}%` }}
                      ></div>
                      <span className="text-[9px] text-gray-500 truncate max-w-[40px]">
                        {pay.createdAt ? new Date(pay.createdAt.toDate ? pay.createdAt.toDate() : pay.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : `T${idx+1}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
            <span>Recent Transactions Volume</span>
            <button
              onClick={() => onNavigateTab("payments")}
              className="text-cyan-400 hover:text-cyan-300 font-semibold text-xs flex items-center gap-1"
            >
              View All Transactions →
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Leads & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="bg-[#0f111a] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-user-plus text-amber-400"></i>
              Recent Customer Leads
            </h3>
            <button
              onClick={() => onNavigateTab("leads")}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
            >
              Manage Leads ({stats.totalLeads}) →
            </button>
          </div>

          <div className="space-y-2.5">
            {recentLeads.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-xs">
                No customer leads logged yet.
              </div>
            ) : (
              recentLeads.slice(0, 5).map((lead, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white truncate">
                      {lead.customerName || lead.name || "Customer"}
                    </h4>
                    <p className="text-[11px] text-gray-400 truncate">{lead.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        lead.leadStatus === "Verified" || lead.status === "Verified"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : lead.leadStatus === "Interested" || lead.status === "Interested"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}
                    >
                      {lead.leadStatus || lead.status || "Interested"}
                    </span>
                    <span className="text-[10px] text-gray-500 uppercase font-mono">
                      {lead.plan || "pro"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-[#0f111a] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-credit-card text-emerald-400"></i>
              Recent Purchases
            </h3>
            <button
              onClick={() => onNavigateTab("payments")}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              View Payments ({stats.totalSales}) →
            </button>
          </div>

          <div className="space-y-2.5">
            {recentPayments.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-xs">
                No payment transactions recorded yet.
              </div>
            ) : (
              recentPayments.slice(0, 5).map((pay, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white truncate">
                        {pay.customerName || pay.name || pay.email || "Customer"}
                      </h4>
                      <span className="text-[9px] font-mono text-gray-400 bg-white/5 px-1.5 py-0.2 rounded">
                        {pay.paymentId ? pay.paymentId.substring(0, 10) + "..." : "RAZORPAY"}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 truncate">{pay.email}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-emerald-400">
                      ₹{pay.amount || 999}
                    </div>
                    <span className="text-[10px] text-gray-500">
                      {pay.createdAt ? new Date(pay.createdAt.toDate ? pay.createdAt.toDate() : pay.createdAt).toLocaleDateString() : "Recent"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
