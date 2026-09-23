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

export interface CustomLinkRecord {
  id: string;
  code: string;
  assignedPlan: "starter" | "pro" | "family" | "all";
  customPriceINR: number;
  originalPriceINR: number;
  discountPercentage: number;
  assignedTo: string; // Influencer, affiliate, partner name
  notes?: string;
  clicks: number;
  successfulPurchases: number;
  revenueGenerated: number;
  maxRedemptions: number; // 0 for unlimited
  currentRedemptions: number;
  active: boolean;
  createdAt: any;
  expiresAt?: string | null;
}

interface CustomLinksTabProps {
  links: CustomLinkRecord[];
  onRefresh?: () => void;
}

export default function CustomLinksTab({ links, onRefresh }: CustomLinksTabProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled" | "expired">("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingLink, setEditingLink] = useState<CustomLinkRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formCode, setFormCode] = useState("");
  const [formAssignee, setFormAssignee] = useState("");
  const [formPlan, setFormPlan] = useState<"starter" | "pro" | "family" | "all">("starter");
  const [formOrigPrice, setFormOrigPrice] = useState(1499);
  const [formCustomPrice, setFormCustomPrice] = useState(999);
  const [formMaxRedemptions, setFormMaxRedemptions] = useState(0);
  const [formExpiresAt, setFormExpiresAt] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Helpers
  const calcDiscount = (orig: number, custom: number) => {
    if (!orig || orig <= 0) return 0;
    const diff = orig - custom;
    return Math.max(0, Math.round((diff / orig) * 100));
  };

  const generateRandomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let res = "PROMO-";
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormCode(res);
  };

  const openCreateModal = () => {
    setEditingLink(null);
    setFormCode("VIP" + Math.floor(1000 + Math.random() * 9000));
    setFormAssignee("");
    setFormPlan("starter");
    setFormOrigPrice(1499);
    setFormCustomPrice(999);
    setFormMaxRedemptions(0);
    setFormExpiresAt("");
    setFormNotes("");
    setShowModal(true);
  };

  const openEditModal = (link: CustomLinkRecord) => {
    setEditingLink(link);
    setFormCode(link.code);
    setFormAssignee(link.assignedTo || "");
    setFormPlan(link.assignedPlan || "starter");
    setFormOrigPrice(link.originalPriceINR || 1499);
    setFormCustomPrice(link.customPriceINR || 999);
    setFormMaxRedemptions(link.maxRedemptions || 0);
    setFormExpiresAt(link.expiresAt || "");
    setFormNotes(link.notes || "");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = formCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (!cleanCode) {
      alert("Please provide a valid alphanumeric code!");
      return;
    }
    setSaving(true);
    try {
      const discount = calcDiscount(Number(formOrigPrice), Number(formCustomPrice));
      const payload: Partial<CustomLinkRecord> = {
        code: cleanCode,
        assignedPlan: formPlan,
        customPriceINR: Number(formCustomPrice),
        originalPriceINR: Number(formOrigPrice),
        discountPercentage: discount,
        assignedTo: formAssignee.trim(),
        maxRedemptions: Number(formMaxRedemptions),
        expiresAt: formExpiresAt || null,
        notes: formNotes.trim(),
        active: editingLink ? editingLink.active : true,
      };

      if (editingLink) {
        await updateDoc(doc(db, "custom_links", editingLink.id), payload);
      } else {
        await setDoc(doc(db, "custom_links", cleanCode), {
          ...payload,
          id: cleanCode,
          clicks: 0,
          successfulPurchases: 0,
          revenueGenerated: 0,
          currentRedemptions: 0,
          createdAt: serverTimestamp(),
        });
      }

      setShowModal(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error("Save custom link error:", err);
      alert("Failed to save custom link: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (link: CustomLinkRecord) => {
    try {
      await updateDoc(doc(db, "custom_links", link.id), {
        active: !link.active,
      });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("Error toggling link: " + err.message);
    }
  };

  const deleteLink = async (link: CustomLinkRecord) => {
    if (!confirm(`Are you sure you want to permanently delete custom link "${link.code}"?`)) return;
    try {
      await deleteDoc(doc(db, "custom_links", link.id));
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("Error deleting link: " + err.message);
    }
  };

  const copyShareLink = (code: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://softwarehubs.in";
    const url = `${origin}/personal-cloud?ref=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(url);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Status check
  const getLinkStatus = (link: CustomLinkRecord): "active" | "expired" | "disabled" => {
    if (!link.active) return "disabled";
    if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) return "expired";
    if (link.maxRedemptions > 0 && (link.currentRedemptions || 0) >= link.maxRedemptions) return "expired";
    return "active";
  };

  // Filtered links
  const filteredLinks = links.filter((l) => {
    const status = getLinkStatus(l);
    if (statusFilter !== "all" && status !== statusFilter) return false;
    if (planFilter !== "all" && l.assignedPlan !== planFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchCode = l.code?.toLowerCase().includes(q);
      const matchAssignee = l.assignedTo?.toLowerCase().includes(q);
      const matchNotes = l.notes?.toLowerCase().includes(q);
      if (!matchCode && !matchAssignee && !matchNotes) return false;
    }
    return true;
  });

  // KPI Calculations
  const totalLinks = links.length;
  const activeLinks = links.filter((l) => getLinkStatus(l) === "active").length;
  const totalClicks = links.reduce((acc, l) => acc + (l.clicks || 0), 0);
  const totalPurchases = links.reduce((acc, l) => acc + (l.successfulPurchases || l.currentRedemptions || 0), 0);
  const totalRevenue = links.reduce((acc, l) => acc + (l.revenueGenerated || 0), 0);
  const avgConversion = totalClicks > 0 ? ((totalPurchases / totalClicks) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      {/* Header & KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#121622] border border-white/5 rounded-xl p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Total Links
          </span>
          <div className="text-2xl font-bold text-white">{totalLinks}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">All campaigns</span>
        </div>

        <div className="bg-[#121622] border border-emerald-500/20 rounded-xl p-4 bg-emerald-500/[0.02]">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
            Active Links
          </span>
          <div className="text-2xl font-bold text-emerald-400">{activeLinks}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Live & redeemable</span>
        </div>

        <div className="bg-[#121622] border border-cyan-500/20 rounded-xl p-4 bg-cyan-500/[0.02]">
          <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider block mb-1">
            Total Clicks
          </span>
          <div className="text-2xl font-bold text-cyan-300">{totalClicks.toLocaleString()}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Link visits</span>
        </div>

        <div className="bg-[#121622] border border-purple-500/20 rounded-xl p-4 bg-purple-500/[0.02]">
          <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider block mb-1">
            Purchases
          </span>
          <div className="text-2xl font-bold text-purple-300">{totalPurchases}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Redeemed orders</span>
        </div>

        <div className="bg-[#121622] border border-amber-500/20 rounded-xl p-4 bg-amber-500/[0.02]">
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block mb-1">
            Revenue Made
          </span>
          <div className="text-2xl font-bold text-amber-300">₹{totalRevenue.toLocaleString()}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">From custom links</span>
        </div>

        <div className="bg-[#121622] border border-indigo-500/20 rounded-xl p-4 bg-indigo-500/[0.02]">
          <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider block mb-1">
            Conv. Rate
          </span>
          <div className="text-2xl font-bold text-indigo-300">{avgConversion}%</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Clicks to sales</span>
        </div>
      </div>

      {/* Control Bar: Search, Filters, & Create Button */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#121622] p-4 rounded-xl border border-white/5">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <i className="fa-solid fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
            <input
              type="text"
              placeholder="Search code, influencer name, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0a0d14] text-white pl-9 pr-3 py-2 rounded-lg text-xs border border-white/10 focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="bg-[#0a0d14] text-slate-300 px-3 py-2 rounded-lg text-xs border border-white/10 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="disabled">Disabled</option>
            <option value="expired">Expired / Max Limit</option>
          </select>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="bg-[#0a0d14] text-slate-300 px-3 py-2 rounded-lg text-xs border border-white/10 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Plans</option>
            <option value="starter">Starter Plan</option>
            <option value="pro">Pro Plan</option>
            <option value="family">Family Plan</option>
          </select>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium text-xs shadow-lg shadow-cyan-500/20 hover:brightness-110 transition active:scale-95 whitespace-nowrap"
        >
          <i className="fa-solid fa-plus text-[11px]"></i>
          Create Custom Link
        </button>
      </div>

      {/* Custom Links Table */}
      <div className="bg-[#121622] rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                <th className="py-3.5 px-4">Link Code & Referral</th>
                <th className="py-3.5 px-4">Assignee / Partner</th>
                <th className="py-3.5 px-4">Plan & Custom Price</th>
                <th className="py-3.5 px-4">Traffic & Sales</th>
                <th className="py-3.5 px-4">Conversion</th>
                <th className="py-3.5 px-4">Revenue</th>
                <th className="py-3.5 px-4">Redemptions</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLinks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <i className="fa-solid fa-link-slash text-3xl mb-3 block text-slate-600"></i>
                    No custom links found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredLinks.map((link) => {
                  const status = getLinkStatus(link);
                  const purchases = link.successfulPurchases || link.currentRedemptions || 0;
                  const clicks = link.clicks || 0;
                  const conv = clicks > 0 ? ((purchases / clicks) * 100).toFixed(1) : "0.0";
                  const remaining = link.maxRedemptions > 0 ? Math.max(0, link.maxRedemptions - purchases) : null;

                  return (
                    <tr key={link.id} className="hover:bg-white/[0.02] transition">
                      {/* Code & Referral */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white bg-white/5 px-2 py-1 rounded border border-white/10 tracking-wide text-xs">
                            {link.code}
                          </span>
                          <button
                            onClick={() => copyShareLink(link.code)}
                            title="Copy full promotional URL"
                            className={`p-1.5 rounded transition ${
                              copiedId === link.code
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "hover:bg-white/10 text-slate-400 hover:text-white"
                            }`}
                          >
                            <i className={`fa-solid ${copiedId === link.code ? "fa-check" : "fa-copy"} text-xs`}></i>
                          </button>
                        </div>
                        {link.notes && (
                          <span className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 max-w-[200px]">
                            {link.notes}
                          </span>
                        )}
                      </td>

                      {/* Assignee */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">{link.assignedTo || "—"}</div>
                        <span className="text-[10px] text-slate-500">
                          {link.createdAt?.toDate ? link.createdAt.toDate().toLocaleDateString() : "Active"}
                        </span>
                      </td>

                      {/* Plan & Pricing */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="capitalize font-semibold text-white">{link.assignedPlan}</span>
                          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded font-bold">
                            {link.discountPercentage}% OFF
                          </span>
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          <span className="text-emerald-400 font-bold">₹{link.customPriceINR}</span>
                          <span className="line-through text-slate-600 ml-1.5">₹{link.originalPriceINR}</span>
                        </div>
                      </td>

                      {/* Traffic */}
                      <td className="py-3.5 px-4">
                        <div className="text-white font-medium">
                          {clicks.toLocaleString()} <span className="text-slate-500 text-[10px]">clicks</span>
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          {purchases} <span className="text-slate-500 text-[10px]">orders</span>
                        </div>
                      </td>

                      {/* Conversion */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            Number(conv) >= 10
                              ? "bg-emerald-500/10 text-emerald-400"
                              : Number(conv) > 0
                              ? "bg-cyan-500/10 text-cyan-400"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {conv}%
                        </span>
                      </td>

                      {/* Revenue */}
                      <td className="py-3.5 px-4 font-bold text-amber-300">
                        ₹{(link.revenueGenerated || purchases * link.customPriceINR).toLocaleString()}
                      </td>

                      {/* Redemptions */}
                      <td className="py-3.5 px-4">
                        {link.maxRedemptions > 0 ? (
                          <div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                              <span>{purchases} used</span>
                              <span>{remaining} left</span>
                            </div>
                            <div className="w-20 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  remaining === 0 ? "bg-rose-500" : "bg-cyan-400"
                                }`}
                                style={{
                                  width: `${Math.min(100, (purchases / link.maxRedemptions) * 100)}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Unlimited ({purchases} used)</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            status === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : status === "expired"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              status === "active"
                                ? "bg-emerald-400 animate-pulse"
                                : status === "expired"
                                ? "bg-amber-400"
                                : "bg-rose-400"
                            }`}
                          ></span>
                          {status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => toggleStatus(link)}
                            title={link.active ? "Disable link" : "Enable link"}
                            className={`p-1.5 rounded text-xs transition ${
                              link.active
                                ? "text-slate-400 hover:text-amber-400 hover:bg-amber-400/10"
                                : "text-emerald-400 hover:bg-emerald-400/10"
                            }`}
                          >
                            <i className={`fa-solid ${link.active ? "fa-pause" : "fa-play"}`}></i>
                          </button>
                          <button
                            onClick={() => openEditModal(link)}
                            title="Edit campaign details"
                            className="p-1.5 rounded text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 text-xs transition"
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button
                            onClick={() => deleteLink(link)}
                            title="Delete custom link"
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

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-white/10 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingLink ? "Edit Custom Link" : "Create Custom Promotional Link"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Generate affiliate or discounted links for campaigns & influencers
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              {/* Code input & generator */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Custom Link Code / Slug <span className="text-rose-400">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    disabled={!!editingLink}
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="e.g. HARSH50, VIP2026, SUMMER30"
                    className="flex-1 bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 font-mono tracking-wider focus:outline-none focus:border-cyan-500 uppercase disabled:opacity-50"
                  />
                  {!editingLink && (
                    <button
                      type="button"
                      onClick={generateRandomCode}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg border border-white/10 font-medium transition"
                    >
                      <i className="fa-solid fa-dice mr-1"></i> Auto
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Link format: https://softwarehubs.in/personal-cloud?ref={formCode || "CODE"}
                </span>
              </div>

              {/* Assignee Name */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Assignee / Influencer / Campaign Name
                </label>
                <input
                  type="text"
                  value={formAssignee}
                  onChange={(e) => setFormAssignee(e.target.value)}
                  placeholder="e.g. TechReviewer Alex / YouTube Channel"
                  className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Plan Selection */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Assigned Plan
                </label>
                <select
                  value={formPlan}
                  onChange={(e: any) => {
                    const plan = e.target.value;
                    setFormPlan(plan);
                    if (plan === "starter") {
                      setFormOrigPrice(1499);
                      setFormCustomPrice(999);
                    } else if (plan === "pro") {
                      setFormOrigPrice(2499);
                      setFormCustomPrice(1699);
                    } else if (plan === "family") {
                      setFormOrigPrice(3999);
                      setFormCustomPrice(2799);
                    }
                  }}
                  className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500 capitalize"
                >
                  <option value="starter">Starter Plan (1 Machine)</option>
                  <option value="pro">Pro Plan (3 Machines)</option>
                  <option value="family">Family Plan (5 Machines)</option>
                  <option value="all">Applicable To Any Plan</option>
                </select>
              </div>

              {/* Pricing row */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Original Price (₹)</label>
                  <input
                    type="number"
                    min="1"
                    value={formOrigPrice}
                    onChange={(e) => setFormOrigPrice(Number(e.target.value))}
                    className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Custom Price (₹)</label>
                  <input
                    type="number"
                    min="1"
                    value={formCustomPrice}
                    onChange={(e) => setFormCustomPrice(Number(e.target.value))}
                    className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500 text-emerald-400 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Discount %</label>
                  <div className="bg-[#0a0d14] px-3 py-2 rounded-lg border border-white/10 text-cyan-400 font-bold flex items-center justify-between">
                    <span>{calcDiscount(formOrigPrice, formCustomPrice)}%</span>
                    <span className="text-[10px] text-slate-500">Calculated</span>
                  </div>
                </div>
              </div>

              {/* Limits and Expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Max Redemptions <span className="text-slate-500 font-normal">(0 = unlimited)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formMaxRedemptions}
                    onChange={(e) => setFormMaxRedemptions(Number(e.target.value))}
                    className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Expiration Date <span className="text-slate-500 font-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                    className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Internal Campaign Notes</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Partnered on Instagram Reel, coupon valid until month end"
                  className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500"
                ></textarea>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium shadow-lg shadow-cyan-500/20 hover:brightness-110 transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingLink ? "Update Link" : "Create Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
