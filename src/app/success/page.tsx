"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { firestore } from "../../utils/firebase";
import Link from "next/link";
import { RatingModal } from "../../components/RatingModal";

function SuccessContent() {
  const searchParams = useSearchParams();
  const txId = searchParams.get("tx");
  const router = useRouter();

  const [tx, setTx] = useState<any>(null);
  const [thankYouMsg, setThankYouMsg] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [isRatingOpen, setIsRatingOpen] = useState(false);

  useEffect(() => {
    if (!txId) {
      setLoading(false);
      return;
    }

    const fetchSuccessData = async () => {
      try {
        const txSnap = await getDoc(doc(firestore, "transactions", txId));
        if (txSnap.exists()) {
          const t = txSnap.data();
          setTx(t);
          
          if (t.vendorId && t.vendorId !== "platform") {
            const vendorSnap = await getDoc(doc(firestore, "users", t.vendorId));
            if (vendorSnap.exists()) {
              const vendorData = vendorSnap.data();
              setCreatorName(vendorData.creatorDetails?.displayName || "Creator");
              setThankYouMsg(vendorData.storefront?.thankYouMessage || "Thank you for your purchase!");
            }
          } else {
            setThankYouMsg("Thank you for choosing SoftwhereHub! Your product is ready for download.");
          }
        }
      } catch (err) {
        console.error("Error fetching tx:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSuccessData();
  }, [txId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center text-white">
        <h2 className="text-xl font-bold mb-4">Invalid Order</h2>
        <Link href="/dashboard" className="bg-white/10 px-6 py-2 rounded-full hover:bg-white/20 transition-all">Go to Library</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center text-white p-6 relative overflow-hidden selection:bg-emerald-500/30">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-emerald-900/10 rounded-full blur-[10rem]"></div>
      </div>

      <div className="z-10 bg-white/5 border border-white/10 rounded-[2.5rem] p-8 md:p-12 max-w-2xl w-full backdrop-blur-xl shadow-2xl text-center space-y-8 animate-fade-in">
        <div className="w-24 h-24 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
          <i className="fa-solid fa-check text-4xl"></i>
        </div>

        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">Payment Successful!</h1>
          <p className="text-gray-400 text-sm">Your order #{tx.orderId || txId} has been confirmed.</p>
        </div>

        <div className="bg-black/40 rounded-2xl p-6 border border-white/5 text-left space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-white/5">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Purchased Asset</p>
              <p className="font-bold text-white mt-1">{tx.itemTitle}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Amount Paid</p>
              <p className="font-black text-emerald-400 mt-1 text-lg">
                {tx.currency === "USD" ? "$" : "₹"}{tx.amount}
              </p>
            </div>
          </div>
          
          {(creatorName || thankYouMsg) && (
            <div className="pt-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Message from {creatorName || "SoftwhereHub"}</p>
              <p className="text-sm text-gray-300 italic leading-relaxed whitespace-pre-wrap">"{thankYouMsg}"</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href={`/dashboard`}
            className="py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-xl uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <i className="fa-solid fa-download"></i> Access Download
          </Link>

          <button
            onClick={() => setIsRatingOpen(true)}
            className="py-4 bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 text-white font-bold rounded-xl uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            <i className="fa-solid fa-star text-yellow-500"></i> Rate this Asset
          </button>
        </div>
      </div>

      <RatingModal
        isOpen={isRatingOpen}
        onClose={() => setIsRatingOpen(false)}
        itemId={tx.itemId}
        itemTitle={tx.itemTitle}
        versionName="Latest"
        ownerUid={tx.vendorId}
        onToast={(msg) => alert(msg)}
      />
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
