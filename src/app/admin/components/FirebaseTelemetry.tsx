"use client";

import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { firestore } from "../../../utils/firebase";

interface StorageAudit {
  ownerUid: string;
  size: number;
  path: string;
  uploadedAt: any;
}

interface DownloadLog {
  uid: string;
  resourceId: string;
  timestamp: any;
}

export default function FirebaseTelemetry() {
  const [audits, setAudits] = useState<StorageAudit[]>([]);
  const [downloads, setDownloads] = useState<DownloadLog[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTelemetry = async () => {
      setLoading(true);
      try {
        // 0. Fetch Users to map UIDs to Names
        const usersSnap = await getDocs(collection(firestore, "users"));
        const uMap: Record<string, string> = {};
        usersSnap.forEach((docSnap) => {
          const data = docSnap.data();
          uMap[docSnap.id] = data.displayName || data.name || docSnap.id;
        });
        setUsersMap(uMap);

        // 1. Fetch Storage Audits (Uploads)
        const snap = await getDocs(collection(firestore, "storageAudits"));
        const auditList: StorageAudit[] = [];
        snap.forEach((docSnap) => {
          auditList.push(docSnap.data() as StorageAudit);
        });
        setAudits(auditList);

        // 2. Fetch Download Logs (last 30 days for monthly billing estimate)
        const thirtyDaysAgo = Timestamp.fromMillis(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const dlQuery = query(collection(firestore, "downloadLogs"), where("timestamp", ">=", thirtyDaysAgo));
        const dlSnap = await getDocs(dlQuery);
        const dlList: DownloadLog[] = [];
        dlSnap.forEach((docSnap) => {
          dlList.push(docSnap.data() as DownloadLog);
        });
        setDownloads(dlList);
      } catch (err) {
        console.error("Error loading telemetry logs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTelemetry();
  }, []);

  // Compute Upload Stats
  const totalSizeBytes = audits.reduce((sum, item) => sum + (Number(item.size) || 0), 0);
  const totalSizeGB = totalSizeBytes / (1024 * 1024 * 1024);
  const totalUploadOps = audits.length;
  
  // Compute Download Stats (Bandwidth)
  const totalDownloadOps = downloads.length;
  
  // Create a map of resourceId to its size in GB (to estimate download bandwidth)
  const resourceSizeMap: Record<string, number> = {};
  audits.forEach(item => {
    // We try to match path to resourceId if possible, or we just average it. 
    // Since storage path usually contains the product ID or we don't have perfect mapping,
    // we'll use an average size of uploaded files for external links that aren't mapped.
  });
  
  const avgFileSizeBytes = audits.length > 0 ? (totalSizeBytes / audits.length) : (50 * 1024 * 1024); // 50MB default
  let totalDownloadedBytes = 0;
  downloads.forEach(dl => {
    totalDownloadedBytes += avgFileSizeBytes; // Estimate since external links don't cost Firebase Bandwidth anyway, but gives user an idea
  });
  const totalDownloadedGB = totalDownloadedBytes / (1024 * 1024 * 1024);

  // --- Pricing Calculations (Accounting for FREE TIER) ---
  // 1. Storage: First 5GB free. Excess is $0.026/GB
  const billableStorageGB = Math.max(0, totalSizeGB - 5);
  const storageCostUSD = billableStorageGB * 0.026;

  // 2. Download Bandwidth: First 1GB/day free (approx 30GB/month). Excess is $0.12/GB
  const billableBandwidthGB = Math.max(0, totalDownloadedGB - 30);
  const bandwidthCostUSD = billableBandwidthGB * 0.12;

  // 3. Operations: 
  // Uploads: 20k/day free (approx 600k/month). Excess $0.05 per 10k
  const billableUploadOps = Math.max(0, totalUploadOps - 600000);
  const uploadOpsCostUSD = (billableUploadOps / 10000) * 0.05;

  // Downloads: 50k/day free (approx 1.5M/month). Excess $0.004 per 10k
  const billableDownloadOps = Math.max(0, totalDownloadOps - 1500000);
  const downloadOpsCostUSD = (billableDownloadOps / 10000) * 0.004;

  const totalCostUSD = storageCostUSD + bandwidthCostUSD + uploadOpsCostUSD + downloadOpsCostUSD;
  const totalCostINR = totalCostUSD * 83; // approx exchange rate

  // Group by Creator
  const creatorUsage: Record<string, { size: number; count: number }> = {};
  audits.forEach((item) => {
    const uid = item.ownerUid || "System / Admin";
    if (!creatorUsage[uid]) {
      creatorUsage[uid] = { size: 0, count: 0 };
    }
    creatorUsage[uid].size += Number(item.size) || 0;
    creatorUsage[uid].count += 1;
  });

  return (
    <div className="space-y-8 text-white animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Firebase Telemetry Monitor</h2>
        <p className="text-gray-400 text-sm mt-1">Blaze Plan infrastructure tracking & real-time cost estimation</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Storage */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 bg-[#0f0f15]/50 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <i className="fa-solid fa-hard-drive text-4xl"></i>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Storage</span>
          </div>
          <div>
            <p className="text-3xl font-black text-indigo-400">{totalSizeGB.toFixed(3)} <span className="text-sm font-medium text-gray-400">GB</span></p>
            <p className="text-[10px] text-gray-500 mt-1">Free Limit: 5.00 GB</p>
          </div>
        </div>

        {/* Bandwidth */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 bg-[#0f0f15]/50 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <i className="fa-solid fa-network-wired text-4xl"></i>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Est. Bandwidth (30d)</span>
          </div>
          <div>
            <p className="text-3xl font-black text-blue-400">{totalDownloadedGB.toFixed(3)} <span className="text-sm font-medium text-gray-400">GB</span></p>
            <p className="text-[10px] text-gray-500 mt-1">Free Limit: ~30.00 GB / month</p>
          </div>
        </div>

        {/* Uploads */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 bg-[#0f0f15]/50 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <i className="fa-solid fa-cloud-arrow-up text-4xl"></i>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Upload Ops</span>
          </div>
          <div>
            <p className="text-3xl font-black text-purple-400">{totalUploadOps.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 mt-1">Free Limit: 600k / month</p>
          </div>
        </div>

        {/* Downloads */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 bg-[#0f0f15]/50 flex flex-col justify-between relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
            <i className="fa-solid fa-cloud-arrow-down text-4xl"></i>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Download Ops (30d)</span>
          </div>
          <div>
            <p className="text-3xl font-black text-cyan-400">{totalDownloadOps.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 mt-1">Free Limit: 1.5M / month</p>
          </div>
        </div>
      </div>

      {/* Pricing Banner */}
      <div className={`glass-card p-6 rounded-2xl border ${totalCostUSD > 0 ? 'border-red-500/30 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5'} flex items-center justify-between`}>
        <div>
          <h3 className="text-lg font-bold text-white mb-1">
            {totalCostUSD > 0 ? "You have exceeded the Free Tier" : "You are within the Free Tier limits"}
          </h3>
          <p className="text-sm text-gray-400">
            {totalCostUSD > 0 
              ? "Your current usage has exceeded the 5GB storage or daily operation limits. See estimated costs below." 
              : "All your storage, bandwidth, and operations are fully covered by Firebase's no-cost quota! You owe nothing."}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-4xl font-black ${totalCostUSD > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            ₹{totalCostINR.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Est. Monthly Bill (${totalCostUSD.toFixed(3)} USD)</p>
        </div>
      </div>

      {/* Creator Storage Breakdown */}
      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
        <h3 className="px-6 py-4 text-xs font-bold text-white border-b border-white/5 uppercase bg-white/5">Storage Allocation By Creator</h3>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
            <p className="text-[10px] font-bold">Summing storage allocations...</p>
          </div>
        ) : Object.keys(creatorUsage).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 text-xs bg-white/5 font-bold uppercase">
                  <th className="px-6 py-4">Creator Name</th>
                  <th className="px-6 py-4">Uploaded Files Count</th>
                  <th className="px-6 py-4">Total Space Used</th>
                  <th className="px-6 py-4">Est. Creator Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                {Object.entries(creatorUsage).map(([uid, data]) => {
                  const sizeMB = data.size / (1024 * 1024);
                  const sizeGB = data.size / (1024 * 1024 * 1024);
                  // Only calculate cost if they independently exceed free limits (or show absolute raw cost)
                  const rawCostUSD = sizeGB > 5 ? (sizeGB - 5) * 0.026 : 0; 
                  const costINR = rawCostUSD * 83;
                  const creatorName = usersMap[uid] || uid;

                  return (
                    <tr key={uid} className="hover:bg-white/5 transition-all">
                      <td className="px-6 py-4 font-mono text-indigo-400">{creatorName}</td>
                      <td className="px-6 py-4 font-semibold text-white">{data.count} Files</td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-white leading-tight">{sizeMB.toFixed(2)} MB</p>
                        <p className="text-[10px] text-gray-500 mt-1">{sizeGB.toFixed(6)} GB</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-black ${costINR > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          ₹{costINR.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500">
            <span className="text-3xl block mb-2">📊</span>
            <p className="text-xs font-semibold">No uploads registered in storage audits telemetry.</p>
          </div>
        )}
      </div>
    </div>
  );
}

