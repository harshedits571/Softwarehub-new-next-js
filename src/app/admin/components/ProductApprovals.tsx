"use client";

import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, addDoc } from "firebase/firestore";
import { firestore } from "../../../utils/firebase";

interface ProductApprovalsProps {
  currentUser: any;
}

interface ProductItem {
  id: string;
  Title: string;
  Description?: string;
  ImageURL?: string;
  DownloadLink?: string;
  price?: number;
  priceUSD?: number;
  Category?: string;
  status: string;
  ownerUid?: string;
  adminReviewNote?: string;
}

export default function ProductApprovals({ currentUser }: ProductApprovalsProps) {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedItem, setSelectedItem] = useState<ProductItem | null>(null);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadPendingItems = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(firestore, "products"),
        where("status", "in", ["pending", "change-requested"])
      );
      const snap = await getDocs(q);
      const list: ProductItem[] = [];
      snap.forEach((docSnap) => {
        list.push({
          id: docSnap.id,
          ...(docSnap.data() as Omit<ProductItem, "id">),
        });
      });
      setItems(list);
    } catch (err) {
      console.error("Error loading pending submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingItems();
  }, []);

  const handleReviewAction = async (status: "approved" | "rejected" | "change-requested") => {
    if (!selectedItem) return;
    setSubmitting(true);

    try {
      const docRef = doc(firestore, "products", selectedItem.id);
      
      const updatePayload: Record<string, any> = { status };
      if (status === "change-requested") {
        updatePayload.adminReviewNote = feedbackNote;
      }

      await updateDoc(docRef, updatePayload);

      // Log activity
      await addDoc(collection(firestore, "auditLogs"), {
        adminEmail: currentUser.email || "Admin",
        action: `Submissions Review: Marked as ${status}`,
        collection: selectedItem.Category || "products",
        itemName: selectedItem.Title,
        timestamp: Timestamp.now(),
      });

      alert(`Submission successfully marked as ${status}!`);
      setSelectedItem(null);
      setFeedbackNote("");
      loadPendingItems();
    } catch (err: any) {
      alert("Failed to save review: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 text-white animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Creator Submissions Review Panel</h2>
        <p className="text-gray-400 text-xs mt-1">Review, approve, or request changes for creator uploads</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Pending List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-gray-300">Queue List ({items.length})</h3>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
              <p className="text-xs font-semibold">Retrieving submissions queue...</p>
            </div>
          ) : items.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`glass-card p-4 rounded-2xl flex items-center justify-between gap-6 transition-all cursor-pointer ${
                    selectedItem?.id === item.id ? "border-indigo-500" : "hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <img
                      src={item.ImageURL || "/assets/SM.png"}
                      className="w-16 h-10 object-cover rounded-lg border border-white/10 bg-dark-900 shrink-0"
                      alt=""
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{item.Title}</h4>
                      <p className="text-[10px] text-gray-500 mt-1 uppercase font-black">
                        {item.Category} • Owner: {item.ownerUid}
                      </p>
                    </div>
                  </div>

                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${
                    item.status === "change-requested"
                      ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                      : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-500 glass-card border-dashed border-white/10 rounded-2xl bg-[#0f0f15]/50">
              <span className="text-3xl block mb-2">📥</span>
              <p className="text-xs font-semibold">Submissions queue is currently empty.</p>
            </div>
          )}
        </div>

        {/* Right Side: Details & Actions */}
        <div className="glass-card p-6 rounded-3xl space-y-6 bg-[#0f0f15]/50 border border-white/5 h-fit">
          <h3 className="text-sm font-bold text-gray-300">Moderator Review Action</h3>

          {selectedItem ? (
            <div className="space-y-6">
              <div className="space-y-4">
                <img
                  src={selectedItem.ImageURL || "/assets/SM.png"}
                  className="w-full aspect-video object-cover rounded-xl border border-white/10"
                  alt=""
                />
                <div>
                  <h4 className="text-base font-black text-white leading-snug">{selectedItem.Title}</h4>
                  <p className="text-xs text-gray-400 mt-2 font-light">{selectedItem.Description}</p>
                </div>
                <div className="flex justify-between text-xs py-3 border-y border-white/5">
                  <span className="text-gray-500">Proposed Price:</span>
                  <span className="font-bold text-emerald-400">₹{selectedItem.price} / ${selectedItem.priceUSD}</span>
                </div>
                <div className="text-xs py-1">
                  <span className="text-gray-500 block mb-1">Download Link:</span>
                  <a href={selectedItem.DownloadLink} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline break-all font-mono">
                    {selectedItem.DownloadLink}
                  </a>
                </div>
              </div>

              {selectedItem.status === "change-requested" && selectedItem.adminReviewNote && (
                <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 text-xs">
                  <p className="text-[10px] text-indigo-400 font-bold uppercase mb-1">Previous Review Note:</p>
                  <p className="text-gray-400 font-light leading-relaxed">{selectedItem.adminReviewNote}</p>
                </div>
              )}

              {/* Feedback Note Field */}
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold">Feedback / Changes Requested note</label>
                <textarea
                  rows={3}
                  value={feedbackNote}
                  onChange={(e) => setFeedbackNote(e.target.value)}
                  placeholder="Tell the creator what specs to fix (e.g. Broken links, improve thumbnail resolution...)"
                  className="w-full bg-dark-900 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-indigo-500 resize-none text-white"
                />
              </div>

              {/* Review buttons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => handleReviewAction("approved")}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-green-600/10 active:scale-95 text-center"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReviewAction("change-requested")}
                  disabled={submitting || !feedbackNote}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/10 active:scale-95 text-center"
                >
                  Request Changes
                </button>
                <button
                  onClick={() => handleReviewAction("rejected")}
                  disabled={submitting}
                  className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-red-600/10 active:scale-95 text-center"
                >
                  Reject
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500 py-12 text-center">Select a pending asset from the queue to start reviewing.</p>
          )}
        </div>
      </div>
    </div>
  );
}
