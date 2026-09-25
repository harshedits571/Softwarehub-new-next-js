"use client";

import React, { useState } from "react";
import { firestore as db } from "@/utils/firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";

export interface PaymentRecord {
  id: string;
  paymentId: string;
  orderId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  planId: "starter" | "pro" | "family" | string;
  planName?: string;
  amount: number; // in INR
  currency?: string;
  gateway: "razorpay" | "manual" | "stripe" | string;
  gatewayStatus: "captured" | "authorized" | "failed" | "refunded" | string;
  transactionDate: any;
  invoiceNumber?: string;
  refundStatus?: "none" | "requested" | "refunded" | string;
  licenseKey?: string;
  referralCode?: string;
  notes?: string;
}

interface PaymentsTabProps {
  payments: PaymentRecord[];
  onRefresh?: () => void;
}

export default function PaymentsTab({ payments, onRefresh }: PaymentsTabProps) {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [refundFilter, setRefundFilter] = useState("all");
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Helper date
  const formatDate = (val: any) => {
    if (!val) return "—";
    if (val.toDate) return val.toDate().toLocaleString();
    if (val.seconds) return new Date(val.seconds * 1000).toLocaleString();
    try {
      const d = new Date(val);
      return isNaN(d.getTime()) ? String(val) : d.toLocaleString();
    } catch {
      return String(val);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter payments
  const filteredPayments = payments.filter((p) => {
    if (planFilter !== "all" && p.planId?.toLowerCase() !== planFilter.toLowerCase()) return false;
    if (refundFilter !== "all") {
      const isRefunded = p.refundStatus === "refunded" || p.gatewayStatus === "refunded";
      if (refundFilter === "refunded" && !isRefunded) return false;
      if (refundFilter === "none" && isRefunded) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = p.customerName?.toLowerCase().includes(q);
      const matchEmail = p.customerEmail?.toLowerCase().includes(q);
      const matchPhone = p.customerPhone?.toLowerCase().includes(q);
      const matchPayId = p.paymentId?.toLowerCase().includes(q);
      const matchInv = p.invoiceNumber?.toLowerCase().includes(q);
      const matchKey = p.licenseKey?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone && !matchPayId && !matchInv && !matchKey) return false;
    }
    return true;
  });

  // KPIs
  const totalRev = payments
    .filter((p) => p.refundStatus !== "refunded" && p.gatewayStatus !== "failed")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalCount = payments.length;
  const aov = totalCount > 0 ? Math.round(totalRev / totalCount) : 0;
  const refundedCount = payments.filter((p) => p.refundStatus === "refunded").length;

  // CSV Export
  const exportCSV = () => {
    if (filteredPayments.length === 0) return alert("No transactions to export");
    const headers = [
      "Invoice Number",
      "Payment ID",
      "Order ID",
      "Customer Name",
      "Email",
      "Phone",
      "Plan",
      "Amount INR",
      "Gateway",
      "Status",
      "Refund Status",
      "Date",
      "License Key",
      "Referral Code",
    ];
    const rows = filteredPayments.map((p) => [
      `"${p.invoiceNumber || ""}"`,
      `"${p.paymentId || ""}"`,
      `"${p.orderId || ""}"`,
      `"${p.customerName || ""}"`,
      `"${p.customerEmail || ""}"`,
      `"${p.customerPhone || ""}"`,
      `"${p.planId || ""}"`,
      p.amount || 0,
      `"${p.gateway || "Razorpay"}"`,
      `"${p.gatewayStatus || "captured"}"`,
      `"${p.refundStatus || "none"}"`,
      `"${formatDate(p.transactionDate)}"`,
      `"${p.licenseKey || ""}"`,
      `"${p.referralCode || ""}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `personal_cloud_payments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle Refund
  const handleToggleRefund = async (p: PaymentRecord) => {
    const isRefunded = p.refundStatus === "refunded";
    const newStatus = isRefunded ? "none" : "refunded";
    if (
      !confirm(
        `Are you sure you want to mark payment ${p.paymentId} as ${
          newStatus === "refunded" ? "REFUNDED" : "ACTIVE / NOT REFUNDED"
        }?`
      )
    )
      return;

    try {
      await updateDoc(doc(db, "payments", p.id), {
        refundStatus: newStatus,
        gatewayStatus: newStatus === "refunded" ? "refunded" : "captured",
      });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("Error updating refund status: " + err.message);
    }
  };

  // Delete Payment record
  const handleDeletePayment = async (p: PaymentRecord) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete payment record ${p.paymentId || p.id}?`
      )
    )
      return;

    try {
      await deleteDoc(doc(db, "payments", p.id));
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("Error deleting payment: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#121622] border border-emerald-500/20 rounded-xl p-4 bg-emerald-500/[0.02]">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
            Settled Revenue
          </span>
          <div className="text-2xl font-bold text-emerald-400">₹{totalRev.toLocaleString()}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Net successful charges</span>
        </div>

        <div className="bg-[#121622] border border-cyan-500/20 rounded-xl p-4 bg-cyan-500/[0.02]">
          <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider block mb-1">
            Total Transactions
          </span>
          <div className="text-2xl font-bold text-cyan-300">{totalCount}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">All time processed</span>
        </div>

        <div className="bg-[#121622] border border-purple-500/20 rounded-xl p-4 bg-purple-500/[0.02]">
          <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider block mb-1">
            Avg. Order Value
          </span>
          <div className="text-2xl font-bold text-purple-300">₹{aov.toLocaleString()}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Per customer spend</span>
        </div>

        <div className="bg-[#121622] border border-rose-500/20 rounded-xl p-4 bg-rose-500/[0.02]">
          <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider block mb-1">
            Refunds Issued
          </span>
          <div className="text-2xl font-bold text-rose-300">{refundedCount}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Cases settled</span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#121622] p-4 rounded-xl border border-white/5">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <i className="fa-solid fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
            <input
              type="text"
              placeholder="Search payment ID, email, invoice, name..."
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
            <option value="starter">Starter Plan</option>
            <option value="pro">Pro Plan</option>
            <option value="family">Family Plan</option>
          </select>

          {/* Refund Filter */}
          <select
            value={refundFilter}
            onChange={(e) => setRefundFilter(e.target.value)}
            className="bg-[#0a0d14] text-slate-300 px-3 py-2 rounded-lg text-xs border border-white/10 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Statuses</option>
            <option value="none">Successful Only</option>
            <option value="refunded">Refunded Only</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs border border-white/10 transition font-medium"
          >
            <i className="fa-solid fa-file-csv text-cyan-400"></i>
            Export CSV
          </button>
        </div>
      </div>

      {/* Payments Ledger Table */}
      <div className="bg-[#121622] rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                <th className="py-3.5 px-4">Transaction / Invoice</th>
                <th className="py-3.5 px-4">Customer Details</th>
                <th className="py-3.5 px-4">Purchased Plan</th>
                <th className="py-3.5 px-4">Amount Paid</th>
                <th className="py-3.5 px-4">Gateway</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4 text-right">Receipt / Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <i className="fa-solid fa-receipt text-3xl mb-3 block text-slate-600"></i>
                    No payments found matching the current criteria.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const isRefunded = p.refundStatus === "refunded" || p.gatewayStatus === "refunded";
                  const invNum = p.invoiceNumber || `INV-${(p.paymentId || p.id).slice(-8).toUpperCase()}`;

                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition">
                      {/* Transaction / Invoice */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-cyan-400 font-medium text-[11px]">
                            {p.paymentId || p.id}
                          </span>
                          <button
                            onClick={() => copyToClipboard(p.paymentId || p.id, p.id)}
                            className="text-slate-500 hover:text-white transition"
                            title="Copy payment ID"
                          >
                            <i className={`fa-solid ${copiedId === p.id ? "fa-check text-emerald-400" : "fa-copy"} text-[10px]`}></i>
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                          #{invNum}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">{p.customerName || "Customer"}</div>
                        <div className="text-[11px] text-slate-400">{p.customerEmail}</div>
                        {p.customerPhone && (
                          <div className="text-[10px] text-slate-500">{p.customerPhone}</div>
                        )}
                      </td>

                      {/* Purchased Plan */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-white capitalize">
                          {p.planName || p.planId || "Starter"}
                        </span>
                        {p.referralCode && (
                          <span className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-1.5 py-0.5 rounded font-mono ml-2">
                            {p.referralCode}
                          </span>
                        )}
                        {p.licenseKey && (
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5 truncate max-w-[130px]">
                            Key: {p.licenseKey}
                          </div>
                        )}
                      </td>

                      {/* Amount Paid */}
                      <td className="py-3.5 px-4 font-bold text-white text-sm">
                        ₹{(p.amount || 0).toLocaleString()}
                      </td>

                      {/* Gateway */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium text-[11px]">
                          <i className="fa-solid fa-shield-halved text-[10px]"></i>
                          {p.gateway || "Razorpay"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isRefunded ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <i className="fa-solid fa-rotate-left text-[9px]"></i> Refunded
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <i className="fa-solid fa-check text-[9px]"></i> Captured
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {formatDate(p.transactionDate)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedReceipt(p)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 transition text-[11px] font-medium"
                          >
                            <i className="fa-solid fa-file-invoice text-xs"></i>
                            Invoice
                          </button>
                          <button
                            onClick={() => handleToggleRefund(p)}
                            title={isRefunded ? "Mark as not refunded" : "Mark as refunded"}
                            className={`p-1.5 rounded text-xs transition ${
                              isRefunded
                                ? "text-slate-500 hover:text-white hover:bg-white/5"
                                : "text-slate-400 hover:text-amber-400 hover:bg-amber-400/10"
                            }`}
                          >
                            <i className="fa-solid fa-undo"></i>
                          </button>
                          <button
                            onClick={() => handleDeletePayment(p)}
                            title="Delete Payment Record"
                            className="p-1.5 rounded text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 transition"
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

      {/* Tax Invoice & Printable Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-white/10 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header with actions */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <span className="font-semibold text-white text-xs flex items-center gap-2">
                <i className="fa-solid fa-file-invoice text-cyan-400"></i>
                Official Payment Receipt & Tax Invoice
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-medium border border-cyan-500/20 transition flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-print"></i> Print / PDF
                </button>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>
            </div>

            {/* Printable Receipt Paper Container */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-300 print:text-black print:bg-white bg-[#0e121b]">
              {/* Brand & Invoice Meta */}
              <div className="flex items-start justify-between border-b border-white/10 pb-6">
                <div>
                  <h2 className="text-xl font-black text-white tracking-wider flex items-center gap-2">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                      SOFTWAREHUBS
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Personal Cloud Storage System</p>
                  <p className="text-[11px] text-slate-500">support@softwarehubs.in | softwarehubs.in</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    TAX INVOICE
                  </span>
                  <div className="text-xs font-mono font-bold text-white mt-2">
                    #{selectedReceipt.invoiceNumber || `INV-${(selectedReceipt.paymentId || selectedReceipt.id).slice(-8).toUpperCase()}`}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Date: {formatDate(selectedReceipt.transactionDate)}
                  </div>
                </div>
              </div>

              {/* Billed To */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Billed To Customer:
                  </span>
                  <div className="text-white font-bold text-sm">{selectedReceipt.customerName || "Customer"}</div>
                  <div className="text-slate-400">{selectedReceipt.customerEmail}</div>
                  {selectedReceipt.customerPhone && (
                    <div className="text-slate-400">{selectedReceipt.customerPhone}</div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Payment Gateway Info:
                  </span>
                  <div className="text-slate-300">Method: {selectedReceipt.gateway || "Razorpay"}</div>
                  <div className="font-mono text-[11px] text-cyan-400">{selectedReceipt.paymentId}</div>
                  <div className="text-emerald-400 font-semibold text-[11px] mt-0.5">Status: Paid & Verified</div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-white/10 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-slate-400 font-semibold text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Item & Description</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Price</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <tr>
                      <td className="py-3 px-3">
                        <div className="text-white font-bold capitalize">
                          Personal Cloud — {selectedReceipt.planName || selectedReceipt.planId || "Starter"} License
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Lifetime Software License for Windows PC Storage
                        </div>
                        {selectedReceipt.licenseKey && (
                          <div className="font-mono text-[11px] text-cyan-300 mt-1">
                            License Key: {selectedReceipt.licenseKey}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-300">1</td>
                      <td className="py-3 px-3 text-right text-slate-300">₹{selectedReceipt.amount}</td>
                      <td className="py-3 px-3 text-right text-white font-bold">₹{selectedReceipt.amount}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total Calculation */}
              <div className="flex justify-end text-xs">
                <div className="w-64 space-y-1.5 border-t border-white/10 pt-3">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span>₹{selectedReceipt.amount}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>GST / Taxes:</span>
                    <span>Included (0%)</span>
                  </div>
                  <div className="flex justify-between text-white font-bold text-sm pt-2 border-t border-white/10">
                    <span>Total Paid:</span>
                    <span className="text-emerald-400">₹{selectedReceipt.amount} INR</span>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="border-t border-white/10 pt-4 text-center text-[11px] text-slate-500">
                This is an electronically generated receipt for your Personal Cloud software license. For support or queries, reach us at support@softwarehubs.in.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
