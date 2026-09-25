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
  plan: "trial" | "starter" | "pro" | "family" | "enterprise" | string;
  status: "active" | "inactive" | "suspended" | "expired" | "unclaimed";
  claimStatus?: "unclaimed" | "claimed";
  isGift?: boolean;
  isTrial?: boolean;
  claimed?: boolean;
  giftNote?: string;
  issueDate?: any;
  createdAt?: any;
  trialStartDate?: any;
  trialEndDate?: any;
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
  const [editingLicense, setEditingLicense] = useState<LicenseRecord | null>(null);
  const [renewingLicense, setRenewingLicense] = useState<LicenseRecord | null>(null);
  const [generating, setGenerating] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Generator form
  const [genName, setGenName] = useState("");
  const [genEmail, setGenEmail] = useState("");
  const [genPlan, setGenPlan] = useState<string>("pro");
  const [genMaxMachines, setGenMaxMachines] = useState(3);
  const [genExpiry, setGenExpiry] = useState("lifetime");
  const [genTrialDays, setGenTrialDays] = useState(30);
  const [genCustomDate, setGenCustomDate] = useState("");
  const [genIsGift, setGenIsGift] = useState(false);
  const [genNote, setGenNote] = useState("");

  // Edit / Upgrade Modal state
  const [editPlan, setEditPlan] = useState<string>("pro");
  const [editStatus, setEditStatus] = useState<string>("active");
  const [editMaxMachines, setEditMaxMachines] = useState(3);
  const [editExpiry, setEditExpiry] = useState("lifetime");
  const [editCustomDate, setEditCustomDate] = useState("");
  const [editNote, setEditNote] = useState("");

  // Helpers
  const parseDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (val.toDate) return val.toDate();
    if (val.seconds) return new Date(val.seconds * 1000);
    try {
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  const formatDate = (val: any) => {
    if (!val) return "—";
    if (val === "lifetime" || val === "Lifetime") return "Lifetime (No Expiry)";
    const d = parseDate(val);
    if (!d) return String(val);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const getMemberDuration = (lic: LicenseRecord) => {
    const rawDate = lic.createdAt || lic.issueDate || lic.trialStartDate;
    const start = parseDate(rawDate);
    if (!start) return "Member";
    const diffMs = Date.now() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Joined today";
    if (diffDays === 1) return "Joined 1 day ago";
    if (diffDays < 30) return `Member for ${diffDays} days`;
    const months = Math.floor(diffDays / 30);
    if (months === 1) return "Member for 1 month";
    if (months < 12) return `Member for ${months} months`;
    const years = (diffDays / 365).toFixed(1);
    return `Member for ${years} years`;
  };

  const getExpiryDetails = (lic: LicenseRecord) => {
    const isTrial = Boolean(lic.isTrial || lic.plan?.toLowerCase() === "trial");
    const rawExpiry = lic.trialEndDate || lic.expiryDate;

    if (!rawExpiry || rawExpiry === "lifetime" || rawExpiry === "Lifetime") {
      return {
        isTrial: false,
        isLifetime: true,
        isExpired: false,
        daysLeft: 9999,
        badgeText: "Lifetime Access",
        colorClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      };
    }

    const expDate = parseDate(rawExpiry);
    if (!expDate) {
      return {
        isTrial,
        isLifetime: false,
        isExpired: false,
        daysLeft: 0,
        badgeText: String(rawExpiry),
        colorClass: "bg-slate-500/10 text-slate-400 border-slate-500/20",
      };
    }

    const diffMs = expDate.getTime() - Date.now();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return {
        isTrial,
        isLifetime: false,
        isExpired: true,
        daysLeft,
        badgeText: isTrial ? `Trial Expired (${Math.abs(daysLeft)}d ago)` : `Expired (${Math.abs(daysLeft)}d ago)`,
        colorClass: "bg-rose-500/10 text-rose-400 border-rose-500/30",
      };
    }

    if (daysLeft === 0) {
      return {
        isTrial,
        isLifetime: false,
        isExpired: false,
        daysLeft: 0,
        badgeText: isTrial ? "Trial Ends Today" : "Expires Today",
        colorClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      };
    }

    if (isTrial) {
      return {
        isTrial: true,
        isLifetime: false,
        isExpired: false,
        daysLeft,
        badgeText: `Free Trial (${daysLeft}d left)`,
        colorClass: daysLeft <= 3 ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
      };
    }

    return {
      isTrial: false,
      isLifetime: false,
      isExpired: false,
      daysLeft,
      badgeText: daysLeft <= 7 ? `Expires in ${daysLeft} days` : `${daysLeft} days remaining`,
      colorClass: daysLeft <= 7 ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-blue-500/10 text-blue-400 border-blue-500/20",
    };
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const generateKeyString = (plan = "pro") => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const segment = (len = 4) => {
      let s = "";
      for (let i = 0; i < len; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
      return s;
    };
    const prefix = plan === "trial" ? "TRIAL" : "PCLOUD";
    return `${prefix}-${segment(4)}-${segment(4)}-${segment(4)}-${segment(4)}`;
  };

  // Filter licenses
  const filteredLicenses = licenses.filter((l) => {
    const exp = getExpiryDetails(l);
    const planName = (l.plan || "starter").toLowerCase();

    // Plan Filter
    if (planFilter === "trial") {
      if (!l.isTrial && planName !== "trial") return false;
    } else if (planFilter === "pro") {
      if (planName !== "pro") return false;
    } else if (planFilter === "starter") {
      if (planName !== "starter" && planName !== "basic") return false;
    } else if (planFilter === "family") {
      if (planName !== "family") return false;
    }

    // Status Filter
    if (statusFilter === "active" && l.status !== "active") return false;
    if (statusFilter === "suspended" && l.status !== "suspended") return false;
    if (statusFilter === "trial_active") {
      if (!exp.isTrial || exp.isExpired) return false;
    }
    if (statusFilter === "expiring_soon") {
      if (exp.isLifetime || exp.isExpired || exp.daysLeft > 7) return false;
    }
    if (statusFilter === "expired") {
      if (!exp.isExpired && l.status !== "expired") return false;
    }
    if (statusFilter === "unclaimed" && l.claimStatus !== "unclaimed") return false;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchKey = l.key?.toLowerCase().includes(q);
      const matchName = l.customerName?.toLowerCase().includes(q);
      const matchEmail = l.customerEmail?.toLowerCase().includes(q);
      const matchDevice = l.devices?.some((d) => d.machineGuid?.toLowerCase().includes(q) || d.machineName?.toLowerCase().includes(q));
      if (!matchKey && !matchName && !matchEmail && !matchDevice) return false;
    }
    return true;
  });

  // KPIs
  const totalCount = licenses.length;
  const proCount = licenses.filter((l) => (l.plan || "").toLowerCase() === "pro" || (l.plan || "").toLowerCase() === "family").length;
  const trialCount = licenses.filter((l) => l.isTrial || (l.plan || "").toLowerCase() === "trial").length;
  const expiringSoonCount = licenses.filter((l) => {
    const exp = getExpiryDetails(l);
    return !exp.isLifetime && !exp.isExpired && exp.daysLeft <= 7;
  }).length;
  const suspendedCount = licenses.filter((l) => l.status === "suspended").length;

  // Manual generation
  const handleGenerateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genName.trim() || !genEmail.trim()) {
      alert("Name and email are required!");
      return;
    }
    setGenerating(true);
    try {
      const isTrial = genPlan === "trial";
      const keyStr = generateKeyString(genPlan);
      const isGift = Boolean(genIsGift);

      let computedExpiry = "Lifetime";
      if (isTrial) {
        const endDate = new Date(Date.now() + genTrialDays * 24 * 60 * 60 * 1000).toISOString();
        computedExpiry = endDate;
      } else if (genExpiry === "custom" && genCustomDate) {
        computedExpiry = new Date(genCustomDate).toISOString();
      }

      const payload: LicenseRecord = {
        id: keyStr,
        key: keyStr,
        customerName: genName.trim(),
        customerEmail: genEmail.trim().toLowerCase(),
        plan: genPlan,
        status: isGift ? "unclaimed" : "active",
        claimStatus: isGift ? "unclaimed" : "claimed",
        isGift: isGift,
        isTrial: isTrial,
        claimed: !isGift,
        giftNote: genNote.trim() || (isTrial ? `${genTrialDays}-Day Free Trial Grant` : isGift ? "Complimentary Free Gift Grant" : "Direct Admin Generation"),
        maxMachines: Number(genMaxMachines),
        activatedMachines: 0,
        devices: [],
        issueDate: serverTimestamp(),
        createdAt: new Date().toISOString(),
        trialStartDate: isTrial ? new Date().toISOString() : undefined,
        trialEndDate: isTrial ? computedExpiry : undefined,
        expiryDate: computedExpiry,
      };

      await setDoc(doc(db, "licenses", keyStr), payload);
      setShowGenModal(false);
      setGenName("");
      setGenEmail("");
      setGenNote("");
      if (onRefresh) onRefresh();

      if (isTrial) {
        alert(`⏳ Free Trial License Generated!\n\nCustomer: ${genName.trim()}\nEmail: ${genEmail.trim().toLowerCase()}\nDuration: ${genTrialDays} Days\nKey: ${keyStr}`);
      } else if (isGift) {
        alert(`🎁 Free Gift License Created Successfully!\n\nCustomer: ${genName.trim()}\nEmail: ${genEmail.trim().toLowerCase()}\nPlan: ${genPlan.toUpperCase()}\nKey: ${keyStr}`);
      } else {
        alert(`License generated successfully!\nKey: ${keyStr}`);
      }
    } catch (err: any) {
      alert("Error generating license: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  // Instant 1-Click Promote to Pro
  const handleQuickPromoteToPro = async (license: LicenseRecord) => {
    if (!confirm(`⚡ Upgrade ${license.customerEmail} to Lifetime Pro Plan?\n\nThis will remove trial restrictions, set 3 PC machine slots, and grant permanent Pro access.`)) {
      return;
    }

    try {
      await updateDoc(doc(db, "licenses", license.id), {
        plan: "pro",
        isTrial: false,
        maxMachines: Math.max(license.maxMachines || 1, 3),
        status: "active",
        expiryDate: "Lifetime",
        trialEndDate: null,
        promotedAt: new Date().toISOString(),
        notes: (license.notes ? license.notes + " | " : "") + "Promoted to Lifetime Pro by Admin",
      });

      if (onRefresh) onRefresh();
      alert(`🎉 Successfully upgraded ${license.customerName || license.customerEmail} to Lifetime Pro!`);
    } catch (err: any) {
      alert("Error upgrading to Pro: " + err.message);
    }
  };

  // Extend / Renew Expiry
  const handleExtendExpiry = async (license: LicenseRecord, daysToAdd: number | "lifetime") => {
    try {
      let newExpiry = "Lifetime";
      if (daysToAdd !== "lifetime") {
        const currentExp = parseDate(license.expiryDate || license.trialEndDate);
        const baseTime = (currentExp && currentExp.getTime() > Date.now()) ? currentExp.getTime() : Date.now();
        newExpiry = new Date(baseTime + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
      }

      const updates: any = {
        expiryDate: newExpiry,
        status: "active",
      };

      if (license.isTrial || license.plan === "trial") {
        updates.trialEndDate = newExpiry;
      }

      await updateDoc(doc(db, "licenses", license.id), updates);
      if (onRefresh) onRefresh();
      setRenewingLicense(null);
      alert(`✅ License expiry updated for ${license.customerEmail}!\nNew Expiry: ${formatDate(newExpiry)}`);
    } catch (err: any) {
      alert("Error extending license: " + err.message);
    }
  };

  // Open Edit Modal
  const openEditModal = (lic: LicenseRecord) => {
    setEditingLicense(lic);
    setEditPlan(lic.plan || "pro");
    setEditStatus(lic.status || "active");
    setEditMaxMachines(lic.maxMachines || 3);
    setEditNote(lic.notes || "");

    const exp = lic.expiryDate || lic.trialEndDate;
    if (!exp || exp === "lifetime" || exp === "Lifetime") {
      setEditExpiry("lifetime");
      setEditCustomDate("");
    } else {
      setEditExpiry("custom");
      const d = parseDate(exp);
      setEditCustomDate(d ? d.toISOString().slice(0, 10) : "");
    }
  };

  // Save Edit Modal
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLicense) return;

    setUpdating(true);
    try {
      const isTrial = editPlan === "trial";
      let newExpiry = "Lifetime";
      if (editExpiry === "custom" && editCustomDate) {
        newExpiry = new Date(editCustomDate).toISOString();
      }

      const updates: any = {
        plan: editPlan,
        status: editStatus,
        maxMachines: Number(editMaxMachines),
        isTrial: isTrial,
        expiryDate: newExpiry,
        notes: editNote.trim(),
      };

      if (isTrial) {
        updates.trialEndDate = newExpiry;
      } else {
        updates.trialEndDate = null;
      }

      await updateDoc(doc(db, "licenses", editingLicense.id), updates);
      setEditingLicense(null);
      if (onRefresh) onRefresh();
      alert("✅ License updated successfully!");
    } catch (err: any) {
      alert("Error updating license: " + err.message);
    } finally {
      setUpdating(false);
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
        machineId: null,
        machineName: null,
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
      "Member Duration",
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
      `"${getMemberDuration(l)}"`,
      l.devices?.length || l.activatedMachines || 0,
      l.maxMachines || 1,
      `"${formatDate(l.issueDate || l.createdAt)}"`,
      `"${formatDate(l.expiryDate || l.trialEndDate)}"`,
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total */}
        <div className="bg-[#121622] border border-cyan-500/20 rounded-xl p-4 bg-cyan-500/[0.02]">
          <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider block mb-1">
            Total Licenses
          </span>
          <div className="text-2xl font-bold text-cyan-300">{totalCount}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Registered Users</span>
        </div>

        {/* Pro Members */}
        <div className="bg-[#121622] border border-indigo-500/20 rounded-xl p-4 bg-indigo-500/[0.02]">
          <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider block mb-1">
            🌟 Pro Members
          </span>
          <div className="text-2xl font-bold text-indigo-300">{proCount}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Pro & Family Tier</span>
        </div>

        {/* Free Trials */}
        <div className="bg-[#121622] border border-amber-500/20 rounded-xl p-4 bg-amber-500/[0.02]">
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block mb-1">
            ⏳ Free Trials
          </span>
          <div className="text-2xl font-bold text-amber-300">{trialCount}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Active / Trial users</span>
        </div>

        {/* Expiring Soon */}
        <div className="bg-[#121622] border border-rose-500/20 rounded-xl p-4 bg-rose-500/[0.02]">
          <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider block mb-1">
            ⚠️ Expiring (&lt;7d)
          </span>
          <div className="text-2xl font-bold text-rose-400">{expiringSoonCount}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Needs renewal</span>
        </div>

        {/* Suspended */}
        <div className="bg-[#121622] border border-slate-700 rounded-xl p-4 bg-white/[0.01]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            🔒 Suspended
          </span>
          <div className="text-2xl font-bold text-slate-300">{suspendedCount}</div>
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
              placeholder="Search by key, customer email, name, or machine GUID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0a0d14] text-white pl-9 pr-3 py-2 rounded-lg text-xs border border-white/10 focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
            />
          </div>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="bg-[#0a0d14] text-slate-300 px-3 py-2 rounded-lg text-xs border border-white/10 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Plans</option>
            <option value="trial">⏳ Free Trials Only</option>
            <option value="pro">🌟 Pro (3 PCs)</option>
            <option value="starter">📦 Starter / Basic (1 PC)</option>
            <option value="family">👨‍👩‍👧‍👦 Family (5 PCs)</option>
          </select>

          {/* Status & Expiry Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0a0d14] text-slate-300 px-3 py-2 rounded-lg text-xs border border-white/10 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="trial_active">⏳ Active Free Trials</option>
            <option value="expiring_soon">⚠️ Expiring Soon (&lt; 7 Days)</option>
            <option value="expired">🚨 Expired / Over</option>
            <option value="suspended">🔒 Suspended</option>
            <option value="unclaimed">🎁 Unclaimed Gifts</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs border border-white/10 transition font-medium"
          >
            <i className="fa-solid fa-file-csv text-cyan-400"></i>
            Export CSV
          </button>
          <button
            onClick={() => setShowGenModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium text-xs shadow-lg shadow-cyan-500/20 hover:brightness-110 transition active:scale-95 whitespace-nowrap"
          >
            <i className="fa-solid fa-key text-[11px]"></i>
            Generate Key / Trial
          </button>
        </div>
      </div>

      {/* License Inventory Table */}
      <div className="bg-[#121622] rounded-xl border border-white/5 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                <th className="py-3.5 px-4">License Key</th>
                <th className="py-3.5 px-4">Customer & Duration</th>
                <th className="py-3.5 px-4">Plan & Device Slots</th>
                <th className="py-3.5 px-4">Expiry / Renewal Status</th>
                <th className="py-3.5 px-4">Access Status</th>
                <th className="py-3.5 px-4 text-right">Actions & Upgrade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLicenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <i className="fa-solid fa-shield-halved text-3xl mb-3 block text-slate-600"></i>
                    No licenses found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLicenses.map((lic) => {
                  const used = lic.devices?.length || lic.activatedMachines || 0;
                  const max = lic.maxMachines || 1;
                  const isFull = used >= max;
                  const exp = getExpiryDetails(lic);
                  const memberDuration = getMemberDuration(lic);
                  const isTrial = Boolean(lic.isTrial || lic.plan?.toLowerCase() === "trial");
                  const isStarter = (lic.plan?.toLowerCase() === "starter" || lic.plan?.toLowerCase() === "basic");

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
                        {lic.giftNote && (
                          <div className="text-[10px] text-slate-500 mt-1 max-w-[180px] truncate" title={lic.giftNote}>
                            📝 {lic.giftNote}
                          </div>
                        )}
                      </td>

                      {/* Customer & Duration */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">{lic.customerName || "Customer"}</div>
                        <div className="text-[11px] text-cyan-400">{lic.customerEmail}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <i className="fa-regular fa-clock text-[9px]"></i>
                          {memberDuration}
                        </div>
                      </td>

                      {/* Plan & Machine Slots */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isTrial
                                ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                : lic.plan?.toLowerCase() === "pro"
                                ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                                : lic.plan?.toLowerCase() === "family"
                                ? "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                                : "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                            }`}
                          >
                            {isTrial ? "⏳ Free Trial" : lic.plan?.toLowerCase() === "pro" ? "🌟 Pro Edition" : lic.plan}
                          </span>
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
                            className={`h-full ${isFull ? "bg-amber-400" : "bg-cyan-400"}`}
                            style={{ width: `${Math.min(100, (used / max) * 100)}%` }}
                          ></div>
                        </div>
                      </td>

                      {/* Expiry & Renewal */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${exp.colorClass}`}>
                            {exp.badgeText}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[10px]">
                          Expiry: {formatDate(lic.expiryDate || lic.trialEndDate)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {lic.claimStatus === "unclaimed" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                            🎁 Unclaimed
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                              lic.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : lic.status === "suspended"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
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

                      {/* Actions & Upgrade */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick 1-Click Promote to Pro for Trial or Starter */}
                          {(isTrial || isStarter) && (
                            <button
                              onClick={() => handleQuickPromoteToPro(lic)}
                              title="⚡ Upgrade User to Lifetime Pro"
                              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-indigo-500/20 hover:from-amber-500/30 hover:to-indigo-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold transition flex items-center gap-1 shadow-sm active:scale-95"
                            >
                              <span>⚡</span>
                              <span>Upgrade Pro</span>
                            </button>
                          )}

                          {/* Renew / Extend Button */}
                          <button
                            onClick={() => setRenewingLicense(lic)}
                            title="Extend / Renew License Duration"
                            className="p-1.5 rounded text-emerald-400 hover:bg-emerald-400/10 text-xs transition"
                          >
                            <i className="fa-solid fa-clock-rotate-left"></i>
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => openEditModal(lic)}
                            title="Edit Plan, Status & Slots"
                            className="p-1.5 rounded text-cyan-400 hover:bg-cyan-400/10 text-xs transition"
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>

                          {/* View Devices */}
                          <button
                            onClick={() => setViewingDevices(lic)}
                            title="View registered hardware / unbind"
                            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/10 text-xs transition"
                          >
                            <i className="fa-solid fa-laptop-code"></i>
                          </button>

                          {/* Suspend / Activate */}
                          {lic.status === "active" ? (
                            <button
                              onClick={() => handleStatusChange(lic, "suspended")}
                              title="Suspend License Access"
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

                          {/* Delete */}
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

      {/* Renew / Extend Expiry Modal */}
      {renewingLicense && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-emerald-500/30 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <i className="fa-solid fa-clock-rotate-left text-emerald-400"></i>
                  Extend / Renew License Expiry
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  User: <span className="font-semibold text-emerald-300">{renewingLicense.customerEmail}</span>
                </p>
              </div>
              <button
                onClick={() => setRenewingLicense(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-white/[0.02] p-3 rounded-lg border border-white/5">
                <div className="text-slate-400">Current Expiry:</div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {formatDate(renewingLicense.expiryDate || renewingLicense.trialEndDate)}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-2">Quick Renewal Presets:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleExtendExpiry(renewingLicense, 7)}
                    className="p-2.5 rounded-lg bg-[#0a0d14] border border-white/10 hover:border-emerald-500/50 text-slate-200 hover:text-emerald-300 transition text-left font-semibold"
                  >
                    ➕ Add +7 Days Trial
                  </button>
                  <button
                    onClick={() => handleExtendExpiry(renewingLicense, 30)}
                    className="p-2.5 rounded-lg bg-[#0a0d14] border border-white/10 hover:border-emerald-500/50 text-slate-200 hover:text-emerald-300 transition text-left font-semibold"
                  >
                    ➕ Add +30 Days
                  </button>
                  <button
                    onClick={() => handleExtendExpiry(renewingLicense, 90)}
                    className="p-2.5 rounded-lg bg-[#0a0d14] border border-white/10 hover:border-emerald-500/50 text-slate-200 hover:text-emerald-300 transition text-left font-semibold"
                  >
                    ➕ Add +90 Days (3 Mo)
                  </button>
                  <button
                    onClick={() => handleExtendExpiry(renewingLicense, 365)}
                    className="p-2.5 rounded-lg bg-[#0a0d14] border border-white/10 hover:border-emerald-500/50 text-slate-200 hover:text-emerald-300 transition text-left font-semibold"
                  >
                    ➕ Add +1 Year (365d)
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleExtendExpiry(renewingLicense, "lifetime")}
                  className="w-full py-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold transition flex items-center justify-center gap-2"
                >
                  <span>🌟</span>
                  <span>Make Expiry Permanent (Lifetime Access)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Plan & Status Modal */}
      {editingLicense && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-cyan-500/30 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <i className="fa-solid fa-pen-to-square text-cyan-400"></i>
                  Edit License & Plan Status
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Key: <span className="font-mono text-cyan-300 font-bold">{editingLicense.key}</span>
                </p>
              </div>
              <button
                onClick={() => setEditingLicense(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Customer</label>
                <div className="text-slate-200 font-medium">{editingLicense.customerName} ({editingLicense.customerEmail})</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Plan Tier</label>
                  <select
                    value={editPlan}
                    onChange={(e) => {
                      const p = e.target.value;
                      setEditPlan(p);
                      if (p === "trial") setEditMaxMachines(1);
                      if (p === "starter") setEditMaxMachines(1);
                      if (p === "pro") setEditMaxMachines(3);
                      if (p === "family") setEditMaxMachines(5);
                    }}
                    className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500 capitalize"
                  >
                    <option value="trial">⏳ Free Trial</option>
                    <option value="starter">📦 Starter (1 PC)</option>
                    <option value="pro">🌟 Pro (3 PCs)</option>
                    <option value="family">👨‍👩‍👧‍👦 Family (5 PCs)</option>
                    <option value="enterprise">🏢 Enterprise (10 PCs)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Max Machines</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={editMaxMachines}
                    onChange={(e) => setEditMaxMachines(Number(e.target.value))}
                    className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Account Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500 capitalize"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended (Blocked)</option>
                    <option value="expired">Expired</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Expiry Type</label>
                  <select
                    value={editExpiry}
                    onChange={(e) => setEditExpiry(e.target.value)}
                    className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="lifetime">Lifetime (No Expiry)</option>
                    <option value="custom">Custom Date</option>
                  </select>
                </div>
              </div>

              {editExpiry === "custom" && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Custom Expiration Date</label>
                  <input
                    type="date"
                    required
                    value={editCustomDate}
                    onChange={(e) => setEditCustomDate(e.target.value)}
                    className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Admin Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. VIP client, custom license extension"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLicense(null)}
                  className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium shadow-lg shadow-cyan-500/20 hover:brightness-110 transition disabled:opacity-50"
                >
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* Manual License / Trial Generator Modal */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-white/10 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <i className="fa-solid fa-key text-cyan-400"></i>
                  Generate License Key or Free Trial
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Issue an authorized key or trial for a customer</p>
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
                      if (p === "trial") {
                        setGenMaxMachines(1);
                        setGenExpiry("trial");
                      } else if (p === "starter") {
                        setGenMaxMachines(1);
                      } else if (p === "pro") {
                        setGenMaxMachines(3);
                      } else if (p === "family") {
                        setGenMaxMachines(5);
                      }
                    }}
                    className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500 capitalize"
                  >
                    <option value="trial">⏳ Free Trial</option>
                    <option value="starter">📦 Starter (1 PC)</option>
                    <option value="pro">🌟 Pro (3 PCs)</option>
                    <option value="family">👨‍👩‍👧‍👦 Family (5 PCs)</option>
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

              {genPlan === "trial" ? (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Trial Length</label>
                  <select
                    value={genTrialDays}
                    onChange={(e) => setGenTrialDays(Number(e.target.value))}
                    className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500"
                  >
                    <option value={7}>7-Day Free Trial</option>
                    <option value={14}>14-Day Free Trial</option>
                    <option value={30}>30-Day Free Trial</option>
                    <option value={60}>60-Day Extended Trial</option>
                  </select>
                </div>
              ) : (
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
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Grant Delivery</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
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
                      Ready to activate on Desktop App
                    </div>
                  </button>

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
                      Popup to claim on website login
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Grant Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Free trial tester, promotional grant"
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
                  {generating ? "Generating..." : "Generate Key / Trial"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
