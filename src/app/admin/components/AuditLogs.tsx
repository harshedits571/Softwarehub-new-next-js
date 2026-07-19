"use client";

import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { firestore } from "../../../utils/firebase";

interface LogEntry {
  adminEmail: string;
  action: string;
  collection: string;
  itemName: string;
  timestamp: number;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const q = query(collection(firestore, "auditLogs"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      const list: LogEntry[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        let ts = data.timestamp;
        if (ts && typeof ts.toMillis === "function") {
          ts = ts.toMillis();
        } else if (ts && typeof ts === "object" && ts.seconds) {
          ts = ts.seconds * 1000;
        } else {
          ts = Number(ts) || Date.now();
        }
        list.push({
          adminEmail: data.adminEmail || data.user || "N/A",
          action: data.action || data.type || "Activity",
          collection: data.collection || "",
          itemName: data.itemName || data.detail || "",
          timestamp: ts,
        });
      });

      setLogs(list);
    } catch (err) {
      console.error("Error loading audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(
    (log) =>
      log.action !== "Rated Resource" &&
      (log.adminEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.collection.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.itemName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getActionColor = (action: string) => {
    if (action === "Added Item") return "text-emerald-400";
    if (action === "Edited Item") return "text-amber-400";
    if (action === "Deleted Item") return "text-red-400";
    return "text-blue-400";
  };

  return (
    <div className="space-y-6 text-white animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Activity Log</h2>
          <p className="text-gray-400 text-xs mt-1">Audit trail of admin changes</p>
        </div>
        <input
          type="text"
          placeholder="Search activity..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-dark-900 border border-white/5 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-indigo-500 w-48 md:w-64"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="text-xs font-semibold">Loading logs...</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Admin Email</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Collection</th>
                  <th className="px-6 py-4">Item Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-white/2 transition-colors">
                      <td className="px-6 py-4 font-mono text-gray-500">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : "N/A"}
                      </td>
                      <td className="px-6 py-4 font-semibold text-white">{log.adminEmail}</td>
                      <td className={`px-6 py-4 font-bold ${getActionColor(log.action)}`}>
                        {log.action}
                      </td>
                      <td className="px-6 py-4 text-indigo-400">{log.collection}</td>
                      <td className="px-6 py-4 text-gray-300 truncate max-w-xs" title={log.itemName}>
                        {log.itemName}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No activity logs found.
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
