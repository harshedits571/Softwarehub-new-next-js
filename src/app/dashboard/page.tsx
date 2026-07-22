"use client";

import React, { useState, useEffect } from "react";
import { collection, query, where, doc, updateDoc, setDoc, onSnapshot, getDoc } from "firebase/firestore";
import { firestore } from "../../utils/firebase";
import { useAuth } from "../../context/AuthContext";
import { useCurrency } from "../../hooks/useCurrency";
import { RatingModal } from "../../components/RatingModal";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Transaction {
  id: string;
  itemId: string;
  itemTitle: string;
  amount: number;
  currency: string;
  paymentId: string;
  type: string;
  timestamp: any;
}

interface PurchasedItem {
  id: string;
  Title: string;
  Category?: string;
  ImageURL?: string;
  DownloadLink?: string;
  Versions?: any[];
  ownerUid?: string;
  vendorId?: string;
}

export default function CustomerDashboard() {
  const { currentUser, userProfile, logout } = useAuth();
  const pricing = useCurrency();
  const router = useRouter();

  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [orders, setOrders] = useState<Transaction[]>([]);
  const [purchasedProducts, setPurchasedProducts] = useState<PurchasedItem[]>([]);
  const [creatorMap, setCreatorMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Profile Form States
  const [isEditing, setIsEditing] = useState(false);
  const [editAddress, setEditAddress] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Tabs navigation
  const [activeTab, setActiveTab] = useState<"library" | "orders" | "settings">("library");

  // Ratings overlay
  const [ratingItem, setRatingItem] = useState<{ id: string; title: string; version: string; ownerUid?: string } | null>(null);
  const [isRatingOpen, setIsRatingOpen] = useState(false);

  const [toasts, setToasts] = useState<{ id: string; msg: string; type: "success" | "error" | "info" }[]>([]);

  const showToast = (msg: string, type: "success" | "error" | "info" = "info") => {
    const toastId = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id: toastId, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 4000);
  };

  useEffect(() => {
    if (!currentUser) {
      router.push("/auth");
      return;
    }

    setLoading(true);

    // 1. Fetch customer billing settings config
    const unsubCust = onSnapshot(doc(firestore, "customers", currentUser.email || ""), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCustomerInfo(data);
        setEditAddress(data.address || "");
        setEditPhone(data.phone || "");
      }
    });

    // 2. Fetch order transactions list
    const qOrders = query(collection(firestore, "transactions"), where("uid", "==", currentUser.uid));
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      const list: Transaction[] = [];
      snap.forEach((docSnap) => {
        const { id: _id, ...rest } = docSnap.data() as Transaction;
        list.push({ ...rest, id: docSnap.id });
      });
      // Sort orders by timestamp descending
      list.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setOrders(list);
    });

    // 3. Fetch purchased products items details
    const unsubProducts = onSnapshot(collection(firestore, "products"), async (snap) => {
      const allProds: PurchasedItem[] = [];
      const ownerUids = new Set<string>();
      
      snap.forEach((docSnap) => {
        const data = docSnap.data() as PurchasedItem;
        allProds.push({ ...data, id: docSnap.id });
        if (data.ownerUid) ownerUids.add(data.ownerUid);
      });

      // Filter products based on purchases record
      const purchasedKeys = userProfile?.purchased || {};
      const filtered = allProds.filter((p) => purchasedKeys[p.id] || userProfile?.role === "admin" || userProfile?.role === "sub-admin");
      
      // Fetch creator names
      if (ownerUids.size > 0) {
        try {
          const { query: fq, collection: fcol, where: fwhere, getDocs: fgetDocs } = require("firebase/firestore");
          const qCreators = fq(fcol(firestore, "users"), fwhere("__name__", "in", Array.from(ownerUids)));
          const creatorsSnap = await fgetDocs(qCreators);
          const cMap: Record<string, string> = {};
          creatorsSnap.forEach((cDoc: any) => {
            const data = cDoc.data();
            cMap[cDoc.id] = data.creatorDetails?.displayName || data.displayName || data.name || "Creator";
          });
          setCreatorMap(cMap);
        } catch (e) {
          console.warn("Failed to fetch creator names", e);
        }
      }

      setPurchasedProducts(filtered);
      setLoading(false);
    });

    return () => {
      unsubCust();
      unsubOrders();
      unsubProducts();
    };
  }, [currentUser, userProfile]);

  const handleSaveProfile = async () => {
    if (!currentUser?.email) return;
    setSavingProfile(true);
    try {
      // Save details to Firestore customer document
      await setDoc(doc(firestore, "customers", currentUser.email), {
        address: editAddress,
        phone: editPhone
      }, { merge: true });

      // Save to main user document
      await updateDoc(doc(firestore, "users", currentUser.uid), {
        phone: editPhone,
        address: editAddress
      });

      showToast("Profile settings saved!", "success");
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      showToast("Failed to save billing settings.", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const executeDownload = (prod: PurchasedItem) => {
    const link = prod.DownloadLink || "#";
    const win = window.open(link, "_blank");
    if (win) win.focus();
    showToast("Opening download package...", "success");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Loading Purchases Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-gray-300 relative overflow-hidden flex flex-col justify-between selection:bg-indigo-500/30 selection:text-white">
      {/* Background decorations */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-[10%] w-[40rem] h-[40rem] bg-indigo-900/5 rounded-full blur-[12rem]"></div>
        <div className="absolute bottom-0 right-[10%] w-[40rem] h-[40rem] bg-purple-900/5 rounded-full blur-[12rem]"></div>
      </div>

      {/* Toast Notifier */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.msg}
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 py-4 px-6 md:px-8 max-w-[1400px] mx-auto w-full">
        <div className="glass-card !rounded-full px-6 py-2.5 flex justify-between items-center w-full bg-[#0f0f15]/80 border border-white/5 shadow-lg backdrop-blur-md">
          <Link href="/" className="font-bold tracking-tighter text-white hover:scale-105 transition-all text-lg">
            Harsh<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Edits</span>
          </Link>
          <div className="flex items-center gap-4">
            <button onClick={() => logout()} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-xs px-5 py-2 rounded-full transition-all">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Content Viewport */}
      <main className="pt-28 pb-20 px-6 max-w-[1200px] mx-auto w-full relative z-10 flex-1 space-y-12">
        {/* User Card */}
        <div className="flex flex-col md:flex-row items-center gap-6 justify-between bg-white/2 border border-white/5 p-6 md:p-8 rounded-[2.5rem]">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-white text-2xl font-bold uppercase">
              {currentUser?.displayName ? currentUser.displayName.charAt(0) : (currentUser?.email?.charAt(0) || "U")}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">{currentUser?.displayName || "Creator Partner"}</h2>
              <p className="text-xs text-gray-500">{currentUser?.email}</p>
            </div>
          </div>
          <div className="flex gap-6 border-t border-white/5 md:border-t-0 pt-4 md:pt-0 w-full md:w-auto justify-around">
            <div className="text-center">
              <span className="text-[10px] text-gray-500 block uppercase font-bold">Total Orders</span>
              <span className="text-lg font-black text-white">{orders.length}</span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-gray-500 block uppercase font-bold">Approx Spent</span>
              <span className="text-lg font-black text-emerald-400">
                {(() => {
                  const calculatedSpent = orders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0);
                  const displaySpent = customerInfo?.totalSpent || calculatedSpent;
                  return pricing.currency === "INR" ? `₹${displaySpent}` : `$${displaySpent.toFixed(2)}`;
                })()}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-white/5 gap-6">
          <button
            onClick={() => setActiveTab("library")}
            className={`pb-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === "library" ? "text-indigo-400 border-indigo-500" : "text-gray-500 border-transparent hover:text-white"
            }`}
          >
            My Download Library ({purchasedProducts.length})
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`pb-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === "orders" ? "text-indigo-400 border-indigo-500" : "text-gray-500 border-transparent hover:text-white"
            }`}
          >
            Order History ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`pb-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === "settings" ? "text-indigo-400 border-indigo-500" : "text-gray-500 border-transparent hover:text-white"
            }`}
          >
            Billing Settings
          </button>
        </div>

        {/* Tab contents */}
        {activeTab === "library" && (
          <div className="space-y-4">
            {purchasedProducts.length === 0 ? (
              <div className="text-center py-16 bg-white/2 border border-white/5 rounded-3xl">
                <span className="text-3xl mb-3 block">📦</span>
                <p className="text-xs text-gray-500">You haven't unlocked any asset packs yet.</p>
                <Link href="/" className="text-xs text-indigo-400 font-bold hover:underline mt-2 block">
                  Browse Store Catalog
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {purchasedProducts.map((prod) => (
                  <div key={prod.id} className="flex gap-4 p-5 bg-white/2 border border-white/5 rounded-2xl items-center justify-between">
                    <div className="flex gap-4 items-center">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/5 bg-dark-900 shrink-0">
                        <img src={prod.ImageURL || "https://placehold.co/150"} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white leading-snug">{prod.Title}</h4>
                        {prod.ownerUid ? (
                          <span className="text-[10px] text-gray-500 font-bold block mb-1">
                            By <span className="text-indigo-400">{creatorMap[prod.ownerUid] || "Creator"}</span>
                          </span>
                        ) : null}
                        <span className="text-[10px] text-gray-600 uppercase font-black">{prod.Category}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => executeDownload(prod)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase px-4 py-2.5 rounded-lg transition-all"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => {
                          setRatingItem({ id: prod.id, title: prod.Title, version: "Latest", ownerUid: prod.ownerUid });
                          setIsRatingOpen(true);
                        }}
                        className="bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold text-[10px] uppercase px-3 py-2.5 rounded-lg transition-all"
                      >
                        Rate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "orders" && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-center py-16 bg-white/2 border border-white/5 rounded-3xl">
                <p className="text-xs text-gray-500">No payment transaction logs found.</p>
              </div>
            ) : (
              <div className="bg-white/2 border border-white/5 rounded-3xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/2 text-gray-500 font-bold uppercase text-[9px] tracking-wider">
                      <th className="p-4">Item details</th>
                      <th className="p-4">Payment ID</th>
                      <th className="p-4">Amount Paid</th>
                      <th className="p-4">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((ord) => (
                      <tr key={ord.id} className="border-b border-white/5 hover:bg-white/2 transition-all">
                        <td className="p-4 font-bold text-white">{ord.itemTitle}</td>
                        <td className="p-4 font-mono text-gray-500 text-[10px]">{ord.paymentId}</td>
                        <td className="p-4 font-black text-emerald-400">
                          {ord.currency === "INR" ? `₹${ord.amount}` : `$${ord.amount.toFixed(2)}`}
                        </td>
                        <td className="p-4 text-gray-500">
                          {ord.timestamp ? new Date(ord.timestamp.seconds * 1000).toLocaleDateString() : "Recently"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="bg-white/2 border border-white/5 p-6 md:p-8 rounded-[2.5rem] max-w-xl">
            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-6">Billing & Account Details</h3>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Contact Phone</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className={`w-full bg-dark-900 border rounded-xl px-4 py-3 text-xs outline-none text-white ${
                    isEditing ? "border-white/10 focus:border-indigo-500" : "border-transparent cursor-not-allowed opacity-60"
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Billing / Physical Address</label>
                <textarea
                  rows={3}
                  disabled={!isEditing}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Street details, Country, State, Postal code..."
                  className={`w-full bg-dark-900 border rounded-xl px-4 py-3 text-xs outline-none text-white resize-none ${
                    isEditing ? "border-white/10 focus:border-indigo-500" : "border-transparent cursor-not-allowed opacity-60"
                  }`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="bg-white/5 hover:bg-white/10 text-white font-bold text-xs px-5 py-2.5 rounded-xl border border-white/10 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all"
                    >
                      {savingProfile ? "Saving..." : "Save details"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all"
                  >
                    Edit Details
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-gray-600 relative z-10 w-full">
        <p>&copy; {new Date().getFullYear()} Harsh Edits. All rights reserved.</p>
      </footer>

      {/* Ratings Modal */}
      {ratingItem && (
        <RatingModal
          isOpen={isRatingOpen}
          onClose={() => {
            setIsRatingOpen(false);
            setRatingItem(null);
          }}
          itemId={ratingItem?.id || ""}
          itemTitle={ratingItem?.title || ""}
          versionName={ratingItem?.version || ""}
          ownerUid={ratingItem?.ownerUid || undefined}
          onToast={showToast}
        />
      )}
    </div>
  );
}
