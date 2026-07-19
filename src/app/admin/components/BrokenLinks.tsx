"use client";

import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, deleteDoc, updateDoc, query, orderBy } from "firebase/firestore";
import { firestore } from "../../../utils/firebase";

interface BrokenLinkReport {
  id: string;
  resourceName?: string;
  category?: string;
  userName?: string;
  details?: string;
  status: "pending" | "fixed";
  timestamp: number;
}

export default function BrokenLinks() {
  const [reports, setReports] = useState<BrokenLinkReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "fixed">("all");
  const [selectedReport, setSelectedReport] = useState<BrokenLinkReport | null>(null);

  const loadReports = async () => {
    setLoading(true);
    try {
      const q = query(collection(firestore, "brokenLinkReports"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      const list: BrokenLinkReport[] = [];
      snap.forEach((docSnap) => {
        const val = docSnap.data();
        let status = (val.status || "pending").toLowerCase();
        if (status !== "fixed") status = "pending";

        let ts = val.timestamp;
        if (ts && typeof ts.toMillis === "function") {
          ts = ts.toMillis();
        } else if (ts && typeof ts === "object" && ts.seconds) {
          ts = ts.seconds * 1000;
        } else {
          ts = Number(ts) || Date.now();
        }

        list.push({
          id: docSnap.id,
          resourceName: val.resourceName,
          category: val.category,
          userName: val.userName,
          details: val.details,
          status: status as "pending" | "fixed",
          timestamp: ts,
        });
      });

      setReports(list);
    } catch (err) {
      console.error("Error loading broken links:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleMarkFixed = async (id: string) => {
    if (!window.confirm("Mark this broken link report as fixed?")) return;

    try {
      const reportDocRef = doc(firestore, "brokenLinkReports", id);
      await updateDoc(reportDocRef, {
        status: "fixed",
        fixedAt: Date.now(),
      });
      alert("Report marked as fixed!");
      loadReports();
    } catch (err: any) {
      console.error("Error marking fixed:", err);
      alert("Failed to update status: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;

    try {
      const reportDocRef = doc(firestore, "brokenLinkReports", id);
      await deleteDoc(reportDocRef);
      alert("Report deleted successfully.");
      if (selectedReport?.id === id) {
        setSelectedReport(null);
      }
      loadReports();
    } catch (err: any) {
      console.error("Error deleting report:", err);
      alert("Failed to delete report: " + err.message);
    }
  };

  const filteredReports = reports.filter((r) => {
    const matchSearch =
      (r.resourceName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.category || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.details || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.userName || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === "all" || r.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const totalCount = reports.length;
  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const fixedCount = reports.filter((r) => r.status === "fixed").length;

  return (
    <div className="space-y-6 text-white animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Broken Link <span className="text-red-500">Reports</span>
          </h2>
          <p className="text-gray-400 text-xs mt-1">Review user reported link issues</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-dark-900 border border-white/5 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-indigo-500 w-48 md:w-64"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-dark-900 border border-white/5 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="fixed">Fixed</option>
          </select>
        </div>
      </div>

      {/* Counters Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-xl text-center">
          <div className="text-xl font-black text-white">{totalCount}</div>
          <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-1">Total Reports</div>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-center">
          <div className="text-xl font-black text-rose-400">{pendingCount}</div>
          <div className="text-[9px] text-rose-500/80 font-bold uppercase tracking-wider mt-1">Pending</div>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center">
          <div className="text-xl font-black text-emerald-400">{fixedCount}</div>
          <div className="text-[9px] text-emerald-500/80 font-bold uppercase tracking-wider mt-1">Fixed</div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="text-xs font-semibold">Loading reports...</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                  <th className="px-6 py-4">Resource</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Reporter</th>
                  <th className="px-6 py-4">Issue Details</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredReports.length > 0 ? (
                  filteredReports.map((row) => (
                    <tr key={row.id} className="hover:bg-white/2 transition-all">
                      <td className="px-6 py-4 font-bold text-white">{row.resourceName || "Unknown"}</td>
                      <td className="px-6 py-4 text-indigo-300 capitalize">{row.category}</td>
                      <td className="px-6 py-4 text-gray-400">{row.userName || "Anonymous"}</td>
                      <td className="px-6 py-4 max-w-xs truncate" title={row.details}>
                        {row.details || "No details provided"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            row.status === "fixed"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {row.status === "fixed" ? "Fixed" : "Pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {row.timestamp ? new Date(row.timestamp).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 shrink-0">
                        {row.status === "pending" && (
                          <button
                            onClick={() => handleMarkFixed(row.id)}
                            className="bg-emerald-500/10 hover:bg-emerald-600 hover:text-white border border-emerald-500/20 text-emerald-400 rounded-lg px-2 py-1 text-[10px] font-bold transition-all"
                          >
                            Mark Fixed
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="bg-red-500/10 hover:bg-red-600 hover:text-white border border-red-500/20 text-red-400 rounded-lg px-2 py-1 text-[10px] font-bold transition-all"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No broken link reports found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
