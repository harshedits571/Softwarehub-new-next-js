"use client";

import React, { useState } from "react";
import { doc, updateDoc, deleteDoc, addDoc, collection, Timestamp } from "firebase/firestore";
import { firestore } from "../../../../utils/firebase";

export interface LeadRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  plan: string;
  leadStatus: "Interested" | "Verified" | "Converted" | "Cancelled" | string;
  paymentStatus: "Pending" | "Paid" | "Failed" | string;
  amountPaid: number;
  licenseKey?: string;
  registrationDate: any;
  purchaseDate?: any;
  activityHistory?: any[];
  source?: string;
  referralCode?: string;
}

export interface LeadsTabProps {
  leads: LeadRecord[] | any[];
  onRefresh?: () => void;
}

export default function LeadsTab({ leads, onRefresh }: LeadsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Lead Form State
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPlan, setNewPlan] = useState("pro");
  const [newStatus, setNewStatus] = useState("Interested");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtering
  const filteredLeads = leads.filter((lead) => {
    const name = (lead.customerName || lead.name || "").toLowerCase();
    const email = (lead.email || "").toLowerCase();
    const phone = (lead.phone || "").toLowerCase();
    const q = searchTerm.toLowerCase();

    const matchesSearch = name.includes(q) || email.includes(q) || phone.includes(q);
    const leadStat = (lead.leadStatus || lead.status || "Interested").toLowerCase();
    const matchesStatus = statusFilter === "all" || leadStat === statusFilter.toLowerCase();
    const leadPlan = (lead.plan || "pro").toLowerCase();
    const matchesPlan = planFilter === "all" || leadPlan === planFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const handleUpdateStatus = async (leadId: string, nextStatus: string) => {
    try {
      const docRef = doc(firestore, "leads", leadId);
      await updateDoc(docRef, {
        leadStatus: nextStatus,
        status: nextStatus,
        updatedAt: Timestamp.now(),
      });
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead({ ...selectedLead, leadStatus: nextStatus, status: nextStatus });
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm("Are you sure you want to delete this customer lead?")) return;
    try {
      await deleteDoc(doc(firestore, "leads", leadId));
      if (selectedLead?.id === leadId) setSelectedLead(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("Failed to delete lead: " + err.message);
    }
  };

  const handleAddManualLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, "leads"), {
        customerName: newName,
        email: newEmail.toLowerCase().trim(),
        phone: newPhone.trim(),
        plan: newPlan,
        leadStatus: newStatus,
        status: newStatus,
        paymentStatus: newStatus === "Verified" || newStatus === "Converted" ? "Paid" : "Pending",
        createdAt: Timestamp.now(),
        source: "admin_manual",
        activityHistory: [
          {
            action: "manual_entry",
            timestamp: Date.now(),
            details: `Manually added by administrator with status: ${newStatus}`,
          },
        ],
      });
      setShowAddModal(false);
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("Failed to add lead: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportCSV = () => {
    if (filteredLeads.length === 0) return alert("No leads to export.");
    const headers = [
      "Customer Name",
      "Email",
      "Phone",
      "Plan",
      "Lead Status",
      "Payment Status",
      "Created Date",
      "Payment ID",
      "License Key",
    ];
    const rows = filteredLeads.map((l) => [
      `"${l.customerName || l.name || ""}"`,
      `"${l.email || ""}"`,
      `"${l.phone || ""}"`,
      `"${l.plan || "pro"}"`,
      `"${l.leadStatus || l.status || "Interested"}"`,
      `"${l.paymentStatus || "Pending"}"`,
      `"${l.createdAt ? (l.createdAt.toDate ? l.createdAt.toDate().toISOString() : l.createdAt) : ""}"`,
      `"${l.paymentId || ""}"`,
      `"${l.licenseKey || ""}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `personal_cloud_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f111a] border border-white/5 p-5 rounded-2xl">
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs"></i>
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl text-xs text-gray-300 px-3 py-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Statuses</option>
            <option value="Interested">Interested (Initiated)</option>
            <option value="Verified">Verified (Paid)</option>
            <option value="Converted">Converted</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl text-xs text-gray-300 px-3 py-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Plans</option>
            <option value="starter">Starter / Basic</option>
            <option value="pro">Pro Lifetime</option>
            <option value="family">Family Bundle</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-gray-300 transition-all flex items-center gap-1.5"
            title="Export leads to CSV"
          >
            <i className="fa-solid fa-file-export text-xs text-cyan-400"></i>
            Export CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center gap-1.5"
          >
            <i className="fa-solid fa-user-plus text-xs"></i>
            Add Lead
          </button>
        </div>
      </div>

      {/* Customer Leads Table */}
      <div className="bg-[#0f111a] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01] text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">Selected Plan</th>
                <th className="py-3.5 px-4">Lead Status</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-gray-300">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    <i className="fa-solid fa-users-slash text-3xl mb-3 text-gray-600"></i>
                    <p>No customer leads found matching your criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const leadStat = lead.leadStatus || lead.status || "Interested";
                  const isVerified = leadStat === "Verified" || leadStat === "Converted";
                  const isInterested = leadStat === "Interested";
                  const isCancelled = leadStat === "Cancelled";

                  return (
                    <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Customer Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{lead.customerName || lead.name || "Customer"}</span>
                          {lead.refCode && (
                            <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.2 rounded font-mono">
                              REF: {lead.refCode}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400">{lead.email}</div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 text-gray-300">
                        {lead.phone || <span className="text-gray-600 italic">None</span>}
                      </td>

                      {/* Selected Plan */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-white uppercase text-[11px] bg-white/5 px-2 py-0.5 rounded border border-white/5">
                          {lead.plan || "pro"}
                        </span>
                      </td>

                      {/* Lead Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                            isVerified
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : isInterested
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse"
                              : isCancelled
                              ? "bg-red-500/15 text-red-400 border border-red-500/30"
                              : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isVerified ? "bg-emerald-400" : isInterested ? "bg-amber-400" : isCancelled ? "bg-red-400" : "bg-blue-400"
                            }`}
                          ></span>
                          {leadStat}
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[11px] font-semibold ${
                            lead.paymentStatus === "Paid"
                              ? "text-emerald-400"
                              : lead.paymentStatus === "Failed"
                              ? "text-red-400"
                              : "text-gray-400"
                          }`}
                        >
                          {lead.paymentStatus || (isVerified ? "Paid" : "Pending")}
                        </span>
                        {lead.amount && (
                          <span className="text-[10px] text-gray-500 block">
                            ₹{lead.amount}
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-gray-400 text-[11px]">
                        {lead.createdAt
                          ? new Date(
                              lead.createdAt.toDate ? lead.createdAt.toDate() : lead.createdAt
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "--"}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedLead(lead)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-400 transition-colors"
                            title="View Activity Details"
                          >
                            <i className="fa-solid fa-eye text-xs"></i>
                          </button>

                          {/* Quick Verified toggle */}
                          {leadStat !== "Verified" ? (
                            <button
                              onClick={() => handleUpdateStatus(lead.id, "Verified")}
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                              title="Mark as Verified (Payment Succeeded)"
                            >
                              <i className="fa-solid fa-check text-xs"></i>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(lead.id, "Interested")}
                              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors"
                              title="Revert to Interested"
                            >
                              <i className="fa-solid fa-clock-rotate-left text-xs"></i>
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteLead(lead.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                            title="Delete Lead"
                          >
                            <i className="fa-solid fa-trash text-xs"></i>
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

      {/* Lead Detail & Activity Timeline Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f111a] border border-white/10 rounded-2xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/5 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                  Customer Profile & Audit
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {selectedLead.customerName || selectedLead.name || "Customer"}
                </h3>
                <p className="text-xs text-gray-400">{selectedLead.email}</p>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[10px] text-gray-500 block uppercase font-semibold">Plan</span>
                <span className="text-sm font-bold text-white uppercase">{selectedLead.plan || "pro"}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[10px] text-gray-500 block uppercase font-semibold">Status</span>
                <span className="text-sm font-bold text-emerald-400">
                  {selectedLead.leadStatus || selectedLead.status || "Interested"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[10px] text-gray-500 block uppercase font-semibold">Phone</span>
                <span className="text-xs font-bold text-gray-300">{selectedLead.phone || "--"}</span>
              </div>
            </div>

            {/* Associated License & Payment IDs */}
            {(selectedLead.licenseKey || selectedLead.paymentId) && (
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 space-y-2">
                {selectedLead.licenseKey && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Issued License Key:</span>
                    <span className="font-mono font-bold text-cyan-300 select-all">
                      {selectedLead.licenseKey}
                    </span>
                  </div>
                )}
                {selectedLead.paymentId && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Razorpay Payment ID:</span>
                    <span className="font-mono text-gray-300">{selectedLead.paymentId}</span>
                  </div>
                )}
              </div>
            )}

            {/* Activity History Timeline */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <i className="fa-solid fa-timeline text-indigo-400"></i>
                Activity & Lifecycle History
              </h4>
              <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10 pl-6">
                {Array.isArray(selectedLead.activityHistory) && selectedLead.activityHistory.length > 0 ? (
                  selectedLead.activityHistory.map((act: any, idx: number) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-cyan-400 border-2 border-[#0f111a]"></div>
                      <div className="text-xs text-white font-semibold">{act.action}</div>
                      <div className="text-[11px] text-gray-400">{act.details}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {new Date(act.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500 italic">
                    Lead initiated on website checkout modal. No extra events logged.
                  </div>
                )}
              </div>
            </div>

            {/* Status Override */}
            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs text-gray-400">Override Status:</span>
              <div className="flex items-center gap-2">
                {["Interested", "Verified", "Converted", "Cancelled"].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(selectedLead.id, st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      (selectedLead.leadStatus || selectedLead.status) === st
                        ? "bg-cyan-500 text-black font-bold"
                        : "bg-white/5 hover:bg-white/10 text-gray-400"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Manual Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleAddManualLead}
            className="bg-[#0f111a] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-user-plus text-cyan-400"></i>
                Add Customer Lead
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rahul@gmail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                    Plan
                  </label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="starter">Starter / Basic</option>
                    <option value="pro">Pro Lifetime</option>
                    <option value="family">Family Bundle</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                    Lead Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Interested">Interested</option>
                    <option value="Verified">Verified (Paid)</option>
                    <option value="Converted">Converted</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl transition-all"
              >
                {isSubmitting ? "Saving..." : "Save Customer Lead"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
