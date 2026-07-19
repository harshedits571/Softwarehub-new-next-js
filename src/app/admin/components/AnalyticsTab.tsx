"use client";

import React, { useEffect, useState } from "react";
import { ref, get } from "firebase/database";
import { db } from "../../../utils/firebase";

export default function AnalyticsTab() {
  const [totalViews, setTotalViews] = useState(0);
  const [uniqueVisitors, setUniqueVisitors] = useState(0);
  const [todayViews, setTodayViews] = useState(0);
  const [todayUnique, setTodayUnique] = useState(0);

  const [dailyChart, setDailyChart] = useState<any[]>([]);
  const [deviceBreakdown, setDeviceBreakdown] = useState<Record<string, number>>({});
  const [regionBreakdown, setRegionBreakdown] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];

    const fetchAnalytics = async () => {
      try {
        const totalViewsSnap = await get(ref(db, "analytics/totalPageViews"));
        setTotalViews(totalViewsSnap.val() || 0);

        const uniqueVisitorsSnap = await get(ref(db, "analytics/uniqueVisitors"));
        setUniqueVisitors(uniqueVisitorsSnap.val() || 0);

        const todayViewsSnap = await get(ref(db, `analytics/daily/${today}/pageViews`));
        setTodayViews(todayViewsSnap.val() || 0);

        const todayUniqueSnap = await get(ref(db, `analytics/daily/${today}/uniqueVisitors`));
        setTodayUnique(todayUniqueSnap.val() || 0);

        // Daily chart last 7 days
        const dailySnap = await get(ref(db, "analytics/daily"));
        const dailyVal = dailySnap.val() || {};
        const days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().split("T")[0];
          const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          days.push({
            label,
            views: dailyVal[key]?.pageViews || 0,
          });
        }
        setDailyChart(days);

        // Device breakdown
        const deviceSnap = await get(ref(db, "analytics/byDevice"));
        setDeviceBreakdown(deviceSnap.val() || {});

        // Region breakdown
        const regionSnap = await get(ref(db, "analytics/byRegion"));
        setRegionBreakdown(regionSnap.val() || {});
      } catch (err) {
        console.error("Error loading analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold">Loading visitor analytics...</p>
      </div>
    );
  }

  // Calculate chart max values
  const maxViews = Math.max(...dailyChart.map((d) => d.views), 1);
  const totalDeviceViews = Object.values(deviceBreakdown).reduce((a, b) => a + b, 0) || 1;
  const regionList = Object.entries(regionBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxRegionViews = regionList[0] ? regionList[0][1] : 1;

  const deviceColors: Record<string, string> = {
    desktop: "bg-indigo-500",
    mobile: "bg-pink-500",
    tablet: "bg-emerald-500",
  };

  const deviceIcons: Record<string, string> = {
    desktop: "fa-solid fa-desktop",
    mobile: "fa-solid fa-mobile-screen",
    tablet: "fa-solid fa-tablet-screen-button",
  };

  return (
    <div className="space-y-8 animate-fade-in text-white">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Visitor <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-emerald-400">Analytics</span>
          </h2>
          <p className="text-gray-400 text-xs mt-1">Real-time visitor data from Firebase</p>
        </div>
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Live
        </div>
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Page Views", val: totalViews },
          { label: "Unique Visitors", val: uniqueVisitors },
          { label: "Views Today", val: todayViews },
          { label: "Unique Today", val: todayUnique },
        ].map((item, idx) => (
          <div key={idx} className="glass-card p-6 rounded-2xl text-center hover:border-purple-500/30 transition-all">
            <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-emerald-400">
              {item.val.toLocaleString()}
            </div>
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Last 7 Days Daily Views */}
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-gray-300">📈 Last 7 Days (Page Views)</h3>
          <div className="space-y-3">
            {dailyChart.map((d, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-[10px] text-gray-400 w-16 font-semibold shrink-0">{d.label}</span>
                <div className="flex-1 bg-white/5 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-emerald-500 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${(d.views / maxViews) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-500 w-10 text-right font-bold shrink-0">{d.views}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Device breakdown */}
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-gray-300">📱 Device Breakdown</h3>
          <div className="space-y-3">
            {Object.entries(deviceBreakdown).length > 0 ? (
              Object.entries(deviceBreakdown).map(([device, val]) => (
                <div key={device} className="flex items-center gap-4">
                  <span className="text-[10px] text-gray-400 w-16 font-semibold shrink-0 capitalize flex items-center gap-1.5">
                    <i className={`${deviceIcons[device] || "fa-solid fa-display"} text-[10px]`}></i> {device}
                  </span>
                  <div className="flex-1 bg-white/5 h-2 rounded-full overflow-hidden">
                    <div
                      className={`${deviceColors[device] || "bg-indigo-500"} h-full rounded-full transition-all duration-1000`}
                      style={{ width: `${(val / totalDeviceViews) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 w-10 text-right font-bold shrink-0">{val}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 py-6">No device analytics logs recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Top Visitor Regions */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-gray-300">🌍 Top Visitor Regions</h3>
        <div className="space-y-3">
          {regionList.length > 0 ? (
            regionList.map(([region, val]) => (
              <div key={region} className="flex items-center gap-4">
                <span className="text-[10px] text-gray-400 w-32 font-semibold shrink-0 truncate capitalize">
                  {region.replace(/_/g, " ")}
                </span>
                <div className="flex-1 bg-white/5 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${(val / maxRegionViews) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-500 w-10 text-right font-bold shrink-0">{val}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500 py-6">No regional analytics logs recorded yet.</p>
          )}
        </div>
      </div>

      {/* Info Tips */}
      <div className="bg-indigo-600/5 border border-indigo-500/10 p-4 rounded-xl flex gap-3 items-start">
        <span className="text-lg">💡</span>
        <p className="text-xs text-gray-400 leading-relaxed">
          Analytics are compiled automatically when visitors load the SoftwhereHub landing pages. Unique visitors are logged daily using a one-way hashed browser session fingerprint.
        </p>
      </div>
    </div>
  );
}
