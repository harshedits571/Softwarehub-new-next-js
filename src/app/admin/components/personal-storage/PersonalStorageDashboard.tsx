"use client";

import React, { useState, useEffect } from "react";
import { firestore as db } from "@/utils/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

// Sub-tabs
import OverviewTab from "./OverviewTab";
import LeadsTab, { LeadRecord } from "./LeadsTab";
import PricingTab from "./PricingTab";
import CustomLinksTab, { CustomLinkRecord } from "./CustomLinksTab";
import PaymentsTab, { PaymentRecord } from "./PaymentsTab";
import LicensingTab, { LicenseRecord } from "./LicensingTab";
import SoftwareUpdatesTab from "./SoftwareUpdatesTab";

export type PSTabType =
  | "overview"
  | "leads"
  | "pricing"
  | "customlinks"
  | "payments"
  | "licensing"
  | "updates";

export default function PersonalStorageDashboard() {
  const [activeTab, setActiveTab] = useState<PSTabType>("overview");
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Live state
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [licenses, setLicenses] = useState<LicenseRecord[]>([]);
  const [customLinks, setCustomLinks] = useState<CustomLinkRecord[]>([]);

  // Real-time Firestore Listeners
  useEffect(() => {
    setLoading(true);

    // 1. Leads
    const leadsUnsub = onSnapshot(
      collection(db, "leads"),
      (snapshot) => {
        const items: LeadRecord[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Include if product is personal_cloud or untyped
          items.push({
            id: doc.id,
            name: data.name || data.customerName || "Customer",
            email: data.email || data.customerEmail || "",
            phone: data.phone || data.customerPhone || "",
            plan: data.plan || data.planId || "starter",
            leadStatus: data.leadStatus || "Interested",
            paymentStatus: data.paymentStatus || "Pending",
            amountPaid: data.amountPaid || data.amount || 0,
            licenseKey: data.licenseKey || "",
            registrationDate: data.registrationDate || data.createdAt,
            purchaseDate: data.purchaseDate || null,
            activityHistory: data.activityHistory || [],
            source: data.source || "Website",
            referralCode: data.referralCode || data.couponCode || "",
          });
        });
        // Sort newest first
        items.sort((a, b) => {
          const dateA = a.registrationDate?.seconds || new Date(a.registrationDate || 0).getTime();
          const dateB = b.registrationDate?.seconds || new Date(b.registrationDate || 0).getTime();
          return dateB - dateA;
        });
        setLeads(items);
        setLoading(false);
      },
      (error: any) => {
        if (error.code === "permission-denied") {
          setPermissionError("Firestore Security Rules: Access denied to collection 'leads'. Please paste the updated firestore.rules in Firebase Console.");
        } else {
          console.warn("Firestore leads notice:", error.message || error);
        }
        setLoading(false);
      }
    );

    // 2. Payments
    const paymentsUnsub = onSnapshot(
      collection(db, "payments"),
      (snapshot) => {
        const items: PaymentRecord[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          items.push({
            id: doc.id,
            paymentId: data.paymentId || data.id || doc.id,
            orderId: data.orderId || "",
            customerName: data.customerName || data.name || "Customer",
            customerEmail: data.customerEmail || data.email || "",
            customerPhone: data.customerPhone || data.phone || "",
            planId: data.planId || data.plan || "starter",
            planName: data.planName || "",
            amount: Number(data.amount || data.amountPaid || 0),
            currency: data.currency || "INR",
            gateway: data.gateway || "razorpay",
            gatewayStatus: data.gatewayStatus || data.status || "captured",
            transactionDate: data.transactionDate || data.createdAt,
            invoiceNumber: data.invoiceNumber || "",
            refundStatus: data.refundStatus || "none",
            licenseKey: data.licenseKey || "",
            referralCode: data.referralCode || "",
            notes: data.notes || "",
          });
        });
        // Sort newest first
        items.sort((a, b) => {
          const dateA = a.transactionDate?.seconds || new Date(a.transactionDate || 0).getTime();
          const dateB = b.transactionDate?.seconds || new Date(b.transactionDate || 0).getTime();
          return dateB - dateA;
        });
        setPayments(items);
      },
      (error: any) => {
        if (error.code === "permission-denied") {
          setPermissionError("Firestore Security Rules: Access denied to collection 'payments'. Please paste the updated firestore.rules in Firebase Console.");
        }
      }
    );

    // 3. Licenses
    const licensesUnsub = onSnapshot(
      collection(db, "licenses"),
      (snapshot) => {
        const items: LicenseRecord[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          items.push({
            id: doc.id,
            key: data.key || data.licenseKey || doc.id,
            customerName: data.customerName || data.name || "Customer",
            customerEmail: data.customerEmail || data.email || "",
            plan: data.plan || data.planId || "starter",
            status: data.status || "active",
            issueDate: data.issueDate || data.createdAt,
            expiryDate: data.expiryDate || "Lifetime",
            maxMachines: data.maxMachines || 1,
            activatedMachines: data.activatedMachines || data.devices?.length || 0,
            devices: data.devices || [],
            notes: data.notes || "",
          });
        });
        // Sort newest first
        items.sort((a, b) => {
          const dateA = a.issueDate?.seconds || new Date(a.issueDate || 0).getTime();
          const dateB = b.issueDate?.seconds || new Date(b.issueDate || 0).getTime();
          return dateB - dateA;
        });
        setLicenses(items);
      },
      (error: any) => {
        if (error.code === "permission-denied") {
          setPermissionError("Firestore Security Rules: Access denied to collection 'licenses'. Please paste the updated firestore.rules in Firebase Console.");
        }
      }
    );

    // 4. Custom Links
    const linksUnsub = onSnapshot(
      collection(db, "custom_links"),
      (snapshot) => {
        const items: CustomLinkRecord[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          items.push({
            id: doc.id,
            code: data.code || doc.id,
            assignedPlan: data.assignedPlan || data.plan || "starter",
            customPriceINR: Number(data.customPriceINR || data.customPrice || 999),
            originalPriceINR: Number(data.originalPriceINR || data.originalPrice || 1499),
            discountPercentage: Number(data.discountPercentage || 0),
            assignedTo: data.assignedTo || data.influencerName || "",
            notes: data.notes || "",
            clicks: Number(data.clicks || 0),
            successfulPurchases: Number(data.successfulPurchases || data.currentRedemptions || 0),
            revenueGenerated: Number(data.revenueGenerated || data.totalSalesINR || 0),
            maxRedemptions: Number(data.maxRedemptions || 0),
            currentRedemptions: Number(data.currentRedemptions || data.successfulPurchases || 0),
            active: data.active !== false,
            createdAt: data.createdAt,
            expiresAt: data.expiresAt || null,
          });
        });
        setCustomLinks(items);
      },
      (error: any) => {
        if (error.code === "permission-denied") {
          setPermissionError("Firestore Security Rules: Access denied to collection 'custom_links'. Please paste the updated firestore.rules in Firebase Console.");
        }
      }
    );

    return () => {
      leadsUnsub();
      paymentsUnsub();
      licensesUnsub();
      linksUnsub();
    };
  }, []);

  // Tabs metadata
  const TABS: { id: PSTabType; label: string; icon: string; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: "fa-chart-pie" },
    { id: "leads", label: "Leads & Customers", icon: "fa-users", badge: leads.length },
    { id: "pricing", label: "Pricing Management", icon: "fa-tags" },
    { id: "customlinks", label: "Custom Links", icon: "fa-link", badge: customLinks.length },
    { id: "payments", label: "Payments", icon: "fa-credit-card", badge: payments.length },
    { id: "licensing", label: "Licensing", icon: "fa-key", badge: licenses.length },
    { id: "updates", label: "Software Updates", icon: "fa-cloud-arrow-down" },
  ];
  // Overview Stats
  const totalRevenue = payments
    .filter((p) => p.refundStatus !== "refunded" && p.gatewayStatus !== "failed")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalSales = payments.filter((p) => p.refundStatus !== "refunded").length;
  const totalLeads = leads.length;
  const activeLicenses = licenses.filter((l) => l.status === "active").length;
  const conversionRate = totalLeads > 0 ? Number(((totalSales / totalLeads) * 100).toFixed(1)) : 0;
  const avgOrderValue = totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0;
  const interestedCount = leads.filter((l) => l.leadStatus === "Interested").length;
  const verifiedCount = leads.filter((l) => l.leadStatus === "Verified" || l.leadStatus === "Converted").length;
  const cancelledCount = leads.filter((l) => l.leadStatus === "Cancelled").length;

  const overviewStats = {
    totalRevenue,
    totalSales,
    totalLeads,
    activeLicenses,
    conversionRate,
    avgOrderValue,
    interestedCount,
    verifiedCount,
    cancelledCount,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121622] p-5 rounded-2xl border border-white/5 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xl shadow-lg shadow-cyan-500/25">
            <i className="fa-solid fa-server"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Personal Cloud Dashboard
              </h1>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Live Real-Time Sync
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Dedicated management center for Personal Cloud customers, sales, licenses, and software links
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/personal-cloud"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10 transition"
          >
            <i className="fa-solid fa-arrow-up-right-from-square text-cyan-400"></i>
            Live Storefront
          </a>
        </div>
      </div>

      {permissionError && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start justify-between gap-3 text-xs text-amber-200 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <i className="fa-solid fa-triangle-exclamation text-amber-400 text-sm mt-0.5"></i>
            <div>
              <strong className="font-semibold text-amber-300 block mb-0.5">Cloud Firestore Security Notice</strong>
              <span>
                Your Firestore security rules need to be updated in Firebase Console to allow reading Personal Cloud collections. Copy the rules from <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-300 font-mono">firestore.rules</code> into Firebase Console &gt; Firestore Database &gt; Rules.
              </span>
            </div>
          </div>
          <button
            onClick={() => setPermissionError(null)}
            className="text-amber-400 hover:text-white p-1"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Top Navigation Tabs */}
      <div className="bg-[#121622] p-1.5 rounded-xl border border-white/5 flex items-center gap-1 overflow-x-auto scrollbar-none">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 shadow-md shadow-cyan-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
              }`}
            >
              <i
                className={`fa-solid ${tab.icon} ${
                  isActive ? "text-cyan-400" : "text-slate-500"
                } text-xs`}
              ></i>
              <span>{tab.label}</span>
              {typeof tab.badge === "number" && tab.badge > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? "bg-cyan-500 text-black"
                      : "bg-white/10 text-slate-400"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Display */}
      {loading ? (
        <div className="bg-[#121622] p-16 rounded-2xl border border-white/5 text-center">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-400 text-xs">Syncing Personal Cloud collections from Firestore...</p>
        </div>
      ) : (
        <div>
          {activeTab === "overview" && (
            <OverviewTab
              stats={overviewStats}
              recentPayments={payments.slice(0, 5)}
              recentLeads={leads.slice(0, 5)}
              onNavigateTab={(tab) => setActiveTab(tab as PSTabType)}
            />
          )}

          {activeTab === "leads" && (
            <LeadsTab leads={leads} />
          )}

          {activeTab === "pricing" && (
            <PricingTab />
          )}

          {activeTab === "customlinks" && (
            <CustomLinksTab links={customLinks} />
          )}

          {activeTab === "payments" && (
            <PaymentsTab payments={payments} />
          )}

          {activeTab === "licensing" && (
            <LicensingTab licenses={licenses} />
          )}

          {activeTab === "updates" && (
            <SoftwareUpdatesTab />
          )}
        </div>
      )}
    </div>
  );
}
