"use client";

import React, { useState } from "react";
import { firestore as db } from "@/utils/firebase";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

export interface DeviceInfo {
  machineGuid: string;
  machineName?: string;
  osVersion?: string;
  activatedAt?: any;
}

export interface LicenseRecord {
  id: string;
  key: string;
  customerName: string;
  customerEmail: string;
  plan: "starter" | "pro" | "family" | string;
  status: "active" | "inactive" | "suspended" | "expired" | "unclaimed";
  claimStatus?: "unclaimed" | "claimed";
  isGift?: boolean;
  claimed?: boolean;
  giftNote?: string;
  issueDate: any;
  expiryDate?: any;
  maxMachines: number;
  activatedMachines: number;
  devices?: DeviceInfo[];
  notes?: string;
  lastActiveAt?: any;
}

interface LicensingTabProps {
  licenses: LicenseRecord[];
  onRefresh?: () => void;
}

export default function LicensingTab({ licenses, onRefresh }: LicensingTabProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modals
  const [showGenModal, setShowGenModal] = useState(false);
  const [viewingDevices, setViewingDevices] = useState<LicenseRecord | null>(null);
  const [generating, setGenerating] = useState(false);

  // Generator form
  const [genName, setGenName] = useState("");
  const [genEmail, setGenEmail] = useState("");
  const [genPlan, setGenPlan] = useState<"starter" | "pro" | "family">("starter");
  const [genMaxMachines, setGenMaxMachines] = useState(1);
  const [genExpiry, setGenExpiry] = useState("lifetime");
  const [genCustomDate, setGenCustomDate] = useState("");
  const [genIsGift, setGenIsGift] = useState(true);
  const [genNote, setGenNote] = useState("");

  // Helpers
  const formatDate = (val: any) => {
    if (!val) return "—";
    if (val === "lifetime" || val === "Lifetime") return "Lifetime";
    if (val.toDate) return val.toDate().toLocaleDateString();
    if (val.seconds) return new Date(val.seconds * 1000).toLocaleDateString();
    try {
      const d = new Date(val);
      return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString();
    } catch {
      return String(val);
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const generateKeyString = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const segment = (len = 4) => {
      let s = "";
      for (let i = 0; i < len; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
      return s;
    };
    return `PCLOUD-${segment(4)}-${segment(4)}-${segment(4)}-${segment(4)}`;
  };

  // Filter licenses
  const filteredLicenses = licenses.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (planFilter !== "all" && l.plan?.toLowerCase() !== planFilter.toLowerCase()) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchKey = l.key?.toLowerCase().includes(q);
      const matchName = l.customerName?.toLowerCase().includes(q);
      const matchEmail = l.customerEmail?.toLowerCase().includes(q);
      const matchDevice = l.devices?.some((d) => d.machineGuid?.toLowerCase().includes(q));
      if (!matchKey && !matchName && !matchEmail && !matchDevice) return false;
    }
    return true;
  });

  // KPIs
  const totalCount = licenses.length;
  const activeCount = licenses.filter((l) => l.status === "active").length;
  const suspendedCount = licenses.filter((l) => l.status === "suspended").length;
  const totalActiveDevices = licenses.reduce(
    (sum, l) => sum + (l.devices?.length || l.activatedMachines || 0),
    0
  );

  // Manual generation
  const handleGenerateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genName.trim() || !genEmail.trim()) {
      alert("Name and email are required!");
      return;
    }
    setGenerating(true);
    try {
      const keyStr = generateKeyString();
      const isGift = Boolean(genIsGift);
      const payload: LicenseRecord = {
        id: keyStr,
        key: keyStr,
        customerName: genName.trim(),
        customerEmail: genEmail.trim().toLowerCase(),
        plan: genPlan,
        status: isGift ? "unclaimed" : "active",
        claimStatus: isGift ? "unclaimed" : "claimed",
        isGift: isGift,
        claimed: !isGift,
        giftNote: genNote.trim() || (isGift ? "Complimentary Free Grant" : "Direct Admin Generation"),
        maxMachines: Number(genMaxMachines),
        activatedMachines: 0,
        devices: [],
        issueDate: serverTimestamp(),
        expiryDate: genExpiry === "lifetime" ? "Lifetime" : genCustomDate || "Lifetime",
      };

      await setDoc(doc(db, "licenses", keyStr), payload);
      setShowGenModal(false);
      setGenName("");
      setGenEmail("");
      setGenNote("");
      if (onRefresh) onRefresh();
      if (isGift) {
        alert(`🎁 Free Gift License Created Successfully!\n\nCustomer: ${genName.trim()}\nEmail: ${genEmail.trim().toLowerCase()}\nPlan: ${genPlan.toUpperCase()}\nKey: ${keyStr}\n\nWhen this user logs into SoftwareHubs, a center popup will appear allowing them to claim their Personal Cloud license for free without paying!\n\nNote: They can redeem this grant only once.`);
      } else {
        alert(`License generated successfully!\nKey: ${keyStr}`);
      }
    } catch (err: any) {
      alert("Error generating license: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  // Update status
  const handleStatusChange = async (license: LicenseRecord, newStatus: "active" | "suspended" | "inactive" | "expired") => {
    try {
      await updateDoc(doc(db, "licenses", license.id), { status: newStatus });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("Error updating status: " + err.message);
    }
  };

  // Unbind / Reset all devices
  const handleResetDevices = async (license: LicenseRecord) => {
    if (
      !confirm(
        `Are you sure you want to unbind and clear all registered hardware devices for ${license.customerEmail}? This will let the customer bind a new PC.`
      )
    )
      return;

    try {
      await updateDoc(doc(db, "licenses", license.id), {
        devices: [],
        activatedMachines: 0,
      });
      if (viewingDevices?.id === license.id) {
        setViewingDevices({ ...license, devices: [], activatedMachines: 0 });
      }
      if (onRefresh) onRefresh();
      alert("All device slots reset successfully!");
    } catch (err: any) {
      alert("Error resetting devices: " + err.message);
    }
  };

  // Delete license
  const handleDeleteLicense = async (license: LicenseRecord) => {
    if (!confirm(`Permanently delete license ${license.key}? Customer will lose access.`)) return;
    try {
      await deleteDoc(doc(db, "licenses", license.id));
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("Error deleting license: " + err.message);
    }
  };

  // Export CSV
  const exportCSV = () => {
    if (filteredLicenses.length === 0) return alert("No licenses to export");
    const headers = [
      "License Key",
      "Customer Name",
      "Email",
      "Plan",
      "Status",
      "Slots Used",
      "Max Slots",
      "Issue Date",
      "Expiry Date",
      "Devices Bound",
    ];
    const rows = filteredLicenses.map((l) => [
      `"${l.key}"`,
      `"${l.customerName}"`,
      `"${l.customerEmail}"`,
      `"${l.plan}"`,
      `"${l.status}"`,
      l.devices?.length || l.activatedMachines || 0,
      l.maxMachines || 1,
      `"${formatDate(l.issueDate)}"`,
      `"${formatDate(l.expiryDate)}"`,
      `"${(l.devices || []).map((d) => d.machineGuid || d.machineName).join("; ")}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `personal_cloud_licenses_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#121622] border border-cyan-500/20 rounded-xl p-4 bg-cyan-500/[0.02]">
          <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider block mb-1">
            Total Licenses
          </span>
          <div className="text-2xl font-bold text-cyan-300">{totalCount}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Issued lifetime keys</span>
        </div>

        <div className="bg-[#121622] border border-emerald-500/20 rounded-xl p-4 bg-emerald-500/[0.02]">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
            Active Licenses
          </span>
          <div className="text-2xl font-bold text-emerald-400">{activeCount}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Authorized to run</span>
        </div>

        <div className="bg-[#121622] border border-purple-500/20 rounded-xl p-4 bg-purple-500/[0.02]">
          <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider block mb-1">
            Connected PCs
          </span>
          <div className="text-2xl font-bold text-purple-300">{totalActiveDevices}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Active machine GUIDs</span>
        </div>

        <div className="bg-[#121622] border border-amber-500/20 rounded-xl p-4 bg-amber-500/[0.02]">
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block mb-1">
            Suspended Keys
          </span>
          <div className="text-2xl font-bold text-amber-300">{suspendedCount}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Blocked / Revoked</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#121622] p-4 rounded-xl border border-white/5">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <i className="fa-solid fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
            <input
              type="text"
              placeholder="Search license key, email, customer, or GUID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0a0d14] text-white pl-9 pr-3 py-2 rounded-lg text-xs border border-white/10 focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0a0d14] text-slate-300 px-3 py-2 rounded-lg text-xs border border-white/10 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
            <option value="inactive">Inactive</option>
            <option value="expired">Expired</option>
          </select>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="bg-[#0a0d14] text-slate-300 px-3 py-2 rounded-lg text-xs border border-white/10 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Plans</option>
            <option value="starter">Starter (1 PC)</option>
            <option value="pro">Pro (3 PCs)</option>
            <option value="family">Family (5 PCs)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs border border-white/10 transition font-medium"
          >
            <i className="fa-solid fa-file-csv text-cyan-400"></i>
            CSV
          </button>
          <button
            onClick={() => setShowGenModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium text-xs shadow-lg shadow-cyan-500/20 hover:brightness-110 transition active:scale-95 whitespace-nowrap"
          >
            <i className="fa-solid fa-key text-[11px]"></i>
            Generate Key
          </button>
        </div>
      </div>

      {/* License Inventory Table */}
      <div className="bg-[#121622] rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                <th className="py-3.5 px-4">License Key</th>
                <th className="py-3.5 px-4">Customer Details</th>
                <th className="py-3.5 px-4">Plan & Machine Slots</th>
                <th className="py-3.5 px-4">Issued & Expiry</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLicenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <i className="fa-solid fa-shield-halved text-3xl mb-3 block text-slate-600"></i>
                    No licenses found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredLicenses.map((lic) => {
                  const used = lic.devices?.length || lic.activatedMachines || 0;
                  const max = lic.maxMachines || 1;
                  const isFull = used >= max;

                  return (
                    <tr key={lic.id} className="hover:bg-white/[0.02] transition">
                      {/* Key */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white bg-white/5 px-2.5 py-1 rounded border border-white/10 tracking-wider text-xs">
                            {lic.key}
                          </span>
                          <button
                            onClick={() => copyKey(lic.key)}
                            title="Copy License Key"
                            className={`p-1.5 rounded transition ${
                              copiedKey === lic.key
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "text-slate-400 hover:text-white hover:bg-white/10"
                            }`}
                          >
                            <i className={`fa-solid ${copiedKey === lic.key ? "fa-check" : "fa-copy"} text-xs`}></i>
                          </button>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">{lic.customerName || "Customer"}</div>
                        <div className="text-[11px] text-slate-400">{lic.customerEmail}</div>
                      </td>

                      {/* Plan & Machine Slots */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="capitalize font-semibold text-white">{lic.plan}</span>
                          <button
                            onClick={() => setViewingDevices(lic)}
                            className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 font-medium"
                          >
                            <i className="fa-solid fa-laptop text-[9px]"></i>
                            {used} / {max} PCs
                          </button>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              isFull ? "bg-amber-400" : "bg-cyan-400"
                            }`}
                            style={{ width: `${Math.min(100, (used / max) * 100)}%` }}
                          ></div>
                        </div>
                      </td>

                      {/* Issued & Expiry */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-300 text-[11px]">
                          Issued: {formatDate(lic.issueDate)}
                        </div>
                        <div className="text-slate-500 text-[10px]">
                          Expiry: {formatDate(lic.expiryDate)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {lic.claimStatus === "unclaimed" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                            🎁 Unclaimed Gift
                          </span>
                        ) : lic.claimed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            ✅ Claimed (Active)
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                              lic.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : lic.status === "suspended"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                lic.status === "active" ? "bg-emerald-400" : "bg-rose-400"
                              }`}
                            ></span>
                            {lic.status}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingDevices(lic)}
                            title="View registered hardware / unbind"
                            className="p-1.5 rounded text-cyan-400 hover:bg-cyan-400/10 text-xs transition"
                          >
                            <i className="fa-solid fa-laptop-code"></i>
                          </button>
                          {lic.status === "active" ? (
                            <button
                              onClick={() => handleStatusChange(lic, "suspended")}
                              title="Suspend License"
                              className="p-1.5 rounded text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 text-xs transition"
                            >
                              <i className="fa-solid fa-ban"></i>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusChange(lic, "active")}
                              title="Activate License"
                              className="p-1.5 rounded text-emerald-400 hover:bg-emerald-400/10 text-xs transition"
                            >
                              <i className="fa-solid fa-check"></i>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteLicense(lic)}
                            title="Delete License"
                            className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 text-xs transition"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Connected Devices Drawer / Modal */}
      {viewingDevices && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-white/10 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <i className="fa-solid fa-laptop text-cyan-400"></i>
                  Bound Hardware & Device GUIDs
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Key: <span className="font-mono text-cyan-300 font-bold">{viewingDevices.key}</span>
                </p>
              </div>
              <button
                onClick={() => setViewingDevices(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between bg-white/[0.02] p-3 rounded-lg border border-white/5 text-xs">
                <div>
                  <span className="text-slate-400">Assigned To:</span>{" "}
                  <span className="font-semibold text-white">{viewingDevices.customerName}</span>
                </div>
                <div>
                  <span className="text-slate-400">Slot Limit:</span>{" "}
                  <span className="font-semibold text-cyan-400">
                    {(viewingDevices.devices?.length || 0)} / {viewingDevices.maxMachines}
                  </span>
                </div>
              </div>

              {/* Devices List */}
              <div className="space-y-2">
                {!viewingDevices.devices || viewingDevices.devices.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 border border-dashed border-white/10 rounded-xl text-xs">
                    <i className="fa-solid fa-computer text-2xl mb-2 block text-slate-600"></i>
                    No machines bound yet. License is ready for first activation on customer's PC.
                  </div>
                ) : (
                  viewingDevices.devices.map((d, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-[#0a0d14] rounded-lg border border-white/10 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white flex items-center gap-2">
                          <i className="fa-solid fa-desktop text-cyan-400"></i>
                          {d.machineName || `Machine #${idx + 1}`}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                          GUID: {d.machineGuid}
                        </div>
                        {d.osVersion && (
                          <div className="text-[10px] text-slate-500">OS: {d.osVersion}</div>
                        )}
                      </div>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-medium">
                        Bound
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Unbind / Reset Button */}
              {viewingDevices.devices && viewingDevices.devices.length > 0 && (
                <div className="pt-2">
                  <button
                    onClick={() => handleResetDevices(viewingDevices)}
                    className="w-full py-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-arrows-rotate"></i>
                    Unbind All Devices (Reset Machine Slots)
                  </button>
                  <p className="text-[10px] text-slate-500 text-center mt-1.5">
                    Use this if the customer reinstalled Windows or changed their PC motherboard.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual License Generator Modal */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-white/10 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <i className="fa-solid fa-key text-cyan-400"></i>
                  Generate New License Key
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Issue an authorized key for a customer</p>
              </div>
              <button
                onClick={() => setShowGenModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <form onSubmit={handleGenerateLicense} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Customer Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={genName}
                  onChange={(e) => setGenName(e.target.value)}
                  className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Customer Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john@example.com"
                  value={genEmail}
                  onChange={(e) => setGenEmail(e.target.value)}
                  className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tier / Plan</label>
                  <select
                    value={genPlan}
                    onChange={(e: any) => {
                      const p = e.target.value;
                      setGenPlan(p);
                      if (p === "starter") setGenMaxMachines(1);
                      if (p === "pro") setGenMaxMachines(3);
                      if (p === "family") setGenMaxMachines(5);
                    }}
                    className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500 capitalize"
                  >
                    <option value="starter">Starter Plan</option>
                    <option value="pro">Pro Plan</option>
                    <option value="family">Family Plan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Max Machines</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={genMaxMachines}
                    onChange={(e) => setGenMaxMachines(Number(e.target.value))}
                    className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Expiry</label>
                <select
                  value={genExpiry}
                  onChange={(e) => setGenExpiry(e.target.value)}
                  className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500 mb-2"
                >
                  <option value="lifetime">Lifetime Access</option>
                  <option value="custom">Custom Date</option>
                </select>

                {genExpiry === "custom" && (
                  <input
                    type="date"
                    required
                    value={genCustomDate}
                    onChange={(e) => setGenCustomDate(e.target.value)}
                    className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Grant Type</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setGenIsGift(true)}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      genIsGift
                        ? "bg-amber-500/10 border-amber-500/50 text-amber-300"
                        : "bg-[#0a0d14] border-white/10 text-slate-400 hover:text-white"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 text-xs">
                      <span>🎁</span>
                      <span>Free Gift Grant</span>
                    </div>
                    <div className="text-[10px] opacity-75 mt-0.5">
                      User gets free claim popup on login (₹0)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGenIsGift(false)}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      !genIsGift
                        ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-300"
                        : "bg-[#0a0d14] border-white/10 text-slate-400 hover:text-white"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 text-xs">
                      <span>🔑</span>
                      <span>Direct Active Key</span>
                    </div>
                    <div className="text-[10px] opacity-75 mt-0.5">
                      Pre-activated standalone license key
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Grant Note / Promotion Purpose (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Free gift for friend, influencer promotion, beta tester"
                  value={genNote}
                  onChange={(e) => setGenNote(e.target.value)}
                  className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500 mb-3"
                />
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGenModal(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium shadow-lg shadow-cyan-500/20 hover:brightness-110 transition disabled:opacity-50"
                >
                  {generating ? "Generating..." : "Generate Key"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
