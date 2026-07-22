"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, addDoc, updateDoc, setDoc, Timestamp } from "firebase/firestore";
import { firestore } from "../../utils/firebase";
import { useAuth } from "../../context/AuthContext";
import { useCurrency } from "../../hooks/useCurrency";
import Link from "next/link";

interface Version {
  id?: string;
  Name: string;
  Link: string;
  price?: number;
  priceUSD?: number;
  salePrice?: number;
  inrPrice?: number;
  inrSalePrice?: number;
}

function CheckoutPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const productId = searchParams.get("productId");
  const versionName = searchParams.get("versionName") || "Latest";

  const { currentUser, userProfile } = useAuth();
  const pricing = useCurrency();

  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Checkout fields
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Vendor Payout Splits Info
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [creatorRzpAccount, setCreatorRzpAccount] = useState<string | null>(null);

  // Load User details
  useEffect(() => {
    if (currentUser) {
      setCustomerName(currentUser.displayName || "");
      setCustomerEmail(currentUser.email || "");
    }
  }, [currentUser]);

  // Load product details
  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true);
      try {
        if (productId && productId !== "pro") {
          const prodSnap = await getDoc(doc(firestore, "products", productId));
          if (prodSnap.exists()) {
            const pData = prodSnap.data();
            setProduct({ id: prodSnap.id, ...pData });

            // Extract vendor details for payouts splits
            const vId = pData.vendorId || pData.ownerUid;
            if (vId) {
              setVendorId(vId);
              const userSnap = await getDoc(doc(firestore, "users", vId));
              if (userSnap.exists()) {
                const uData = userSnap.data();
                const rzpAcc = uData.creatorDetails?.paymentDetails?.razorpayAccountId;
                if (rzpAcc) {
                  setCreatorRzpAccount(rzpAcc);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to load checkout details:", err);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [productId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Preparing Checkout Gateway...</p>
      </div>
    );
  }

  // Calculate pricing amount
  const isProMembership = !productId || productId === "pro";
  const itemTitle = isProMembership ? "Lifetime Pro Access Bundle" : product?.Title || "Resource Package";

  let priceVal = isProMembership ? pricing.activePrice : (parseFloat(product?.price) || 0);
  let priceUSDVal = isProMembership ? pricing.activePrice : (parseFloat(product?.priceUSD) || 0);

  // If dynamic versions are available, check if price matches selected version
  if (!isProMembership && product?.Versions) {
    const versionsList = Object.values(product.Versions) as Version[];
    const matchedVer = versionsList.find((v) => v.Name === versionName);
    if (matchedVer) {
      priceVal = matchedVer.inrPrice || matchedVer.price || priceVal;
      priceUSDVal = matchedVer.priceUSD || matchedVer.price || priceUSDVal;
    }
  }

  const amount = pricing.currency === "INR" ? priceVal : priceUSDVal;
  const displayPrice = pricing.currency === "USD" ? `$${amount.toFixed(2)}` : `₹${amount}`;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);

    if (!currentUser) {
      setPaymentError("You must log in to proceed with checkout.");
      router.push("/auth");
      return;
    }

    const Razorpay = (window as any).Razorpay;
    if (!Razorpay) {
      setPaymentError("Razorpay Gateway failed to initialize. Please refresh.");
      return;
    }

    setProcessing(true);
    setPaymentError(null);

    try {
      const platformFee = amount * 0.1;
      const creatorShare = amount * 0.9;

      // 1. Create order server-side (with Route transfer if creator product)
      const orderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amount,
          currency: pricing.currency,
          productId: isProMembership ? "PRO_BUNDLE" : productId,
          productTitle: itemTitle,
          customerEmail: customerEmail,
          customerName: customerName,
          creatorLinkedAccountId: creatorRzpAccount || null,
          platformCommissionPercent: 10,
        }),
      });

      const orderData = await orderRes.json();

      if (!orderData.success || !orderData.id) {
        throw new Error(orderData.error || "Failed to create Razorpay order");
      }

      const options = {
        key: pricing.rzpKey || "",
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.id,
        name: "SoftwhereHub",
        description: `Access to: ${itemTitle}`,
        image: "/assets/logo.png",
        handler: async function (response: any) {
          try {
            const paymentId = response.razorpay_payment_id;
            const orderId = response.razorpay_order_id;
            const signature = response.razorpay_signature;

            // 2. Verify payment signature server-side
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                razorpay_signature: signature,
              }),
            });

            const verifyData = await verifyRes.json();

            if (!verifyData.success) {
              throw new Error("Payment verification failed. Please contact support.");
            }

            // 3. Update User purchases / pro state in Firestore
            const userDocRef = doc(firestore, "users", currentUser.uid);
            const userSnap = await getDoc(userDocRef);
            const userData = userSnap.exists() ? userSnap.data() : {};

            const updatedPurchased = { ...(userData?.purchased || {}) };
            if (!isProMembership && productId) {
              updatedPurchased[productId] = true;
            } else if (isProMembership) {
              updatedPurchased["PRO_BUNDLE"] = true; // Pro Membership Token
            }

            await updateDoc(userDocRef, {
              paymentId: paymentId,
              paidAt: Timestamp.now(),
              // isPaid is protected by firestore.rules, so we cannot update it here
              purchased: updatedPurchased,
            });

            // 4. Create customer stats in /customers/{email}
            const custDocRef = doc(firestore, "customers", currentUser.email || "");
            const custSnap = await getDoc(custDocRef);
            const custData = custSnap.exists() ? custSnap.data() : {};
            const spent = (custData?.totalSpent || 0) + amount;
            const orders = (custData?.ordersCount || 0) + 1;

            await setDoc(custDocRef, {
              phone: customerPhone,
              address: "",
              totalSpent: spent,
              ordersCount: orders,
              lastOrderDate: Timestamp.now(),
              firstOrderDate: custData?.firstOrderDate || Timestamp.now(),
            }, { merge: true });

            // 5. Create Transaction node in Firestore
            const txRef = await addDoc(collection(firestore, "transactions"), {
              uid: currentUser.uid,
              email: currentUser.email || "N/A",
              userName: customerName || currentUser.displayName || "N/A",
              amount: amount,
              currency: pricing.currency,
              itemId: isProMembership ? "PRO_BUNDLE" : productId,
              itemTitle: itemTitle,
              paymentId: paymentId,
              orderId: orderId,
              type: isProMembership ? "pro_membership" : "individual",
              vendorId: vendorId || "platform",
              payoutAccountId: creatorRzpAccount || "",
              platformCommission: isProMembership ? 0 : platformFee,
              creatorPayout: isProMembership ? 0 : creatorShare,
              routeTransfer: orderData.hasTransfer || false,
              timestamp: Timestamp.now(),
            });

            // 6. Log audit log
            await addDoc(collection(firestore, "auditLogs"), {
              type: "Payment",
              user: currentUser.email || "N/A",
              detail: `Paid ${pricing.currency} ${amount} for ${itemTitle}. Route transfer: ${orderData.hasTransfer ? "Yes" : "No"}, split: platform ${platformFee}, creator ${creatorShare}`,
              timestamp: Timestamp.now(),
            });

            // 7. Success redirection
            router.push(`/success?tx=${txRef.id}`);
          } catch (err: any) {
            console.error(err);
            setPaymentError(err.message || "Payment successful, but post-payment processing failed. Contact support.");
          } finally {
            setProcessing(false);
          }
        },
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        theme: {
          color: "#4f46e5",
        },
      };

      const rzp = new Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        setPaymentError("Payment Failed: " + response.error.description);
        setProcessing(false);
      });
      rzp.open();
    } catch (e: any) {
      setPaymentError(e.message || "An error occurred during checkout setup.");
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-gray-300 relative overflow-hidden selection:bg-brand-500/30 selection:text-white flex flex-col justify-between">
      {/* Background decorations */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-[10%] w-[40rem] h-[40rem] bg-indigo-900/5 rounded-full blur-[12rem]"></div>
        <div className="absolute bottom-0 right-[10%] w-[40rem] h-[40rem] bg-purple-900/5 rounded-full blur-[12rem]"></div>
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 py-4 px-6 md:px-8 max-w-[1400px] mx-auto w-full">
        <div className="glass-card !rounded-full px-6 py-2.5 flex justify-between items-center w-full bg-[#0f0f15]/80 border border-white/5 shadow-lg backdrop-blur-md">
          <Link href="/" className="font-bold tracking-tighter text-white hover:scale-105 transition-all text-lg">
            Harsh<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Edits</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="bg-white/5 hover:bg-white/10 text-white font-bold text-xs px-5 py-2 rounded-full border border-white/10 transition-all">
              Discard Checkout
            </Link>
          </div>
        </div>
      </header>

      {/* Content Viewport */}
      <main className="pt-28 pb-20 px-6 max-w-[1000px] mx-auto w-full relative z-10 flex-1 space-y-8">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">Checkout Details</h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">Secure payment transaction gate</p>
        </div>

        {paymentError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-bold animate-pulse">
            ⚠️ {paymentError}
          </div>
        )}

        <form onSubmit={handleCheckout} className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* LEFT: Customer inputs */}
          <div className="md:col-span-7 space-y-6 bg-white/2 border border-white/5 p-6 md:p-8 rounded-3xl">
            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest border-b border-white/5 pb-2">Customer Details</h3>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Display Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none text-white focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  required
                  disabled
                  value={customerEmail}
                  className="w-full bg-dark-900/50 border border-white/5 text-gray-500 rounded-xl px-4 py-3 text-xs outline-none cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Phone / Contact Number *</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none text-white focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* RIGHT: Cart Details Summary */}
          <div className="md:col-span-5 space-y-6 bg-black/40 border border-white/5 p-6 md:p-8 rounded-3xl">
            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest border-b border-white/5 pb-2">Order Summary</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="text-white text-sm font-black block">{itemTitle}</span>
                  {!isProMembership && <span className="text-[10px] text-gray-500 block">Version: {versionName}</span>}
                </div>
                <span className="text-white text-sm font-black shrink-0">{displayPrice}</span>
              </div>

              <div className="border-t border-white/5 pt-4 space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Subtotal</span>
                  <span>{displayPrice}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Taxes / Platform Fees</span>
                  <span>Included</span>
                </div>
                <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-white/5">
                  <span>Amount Due</span>
                  <span className="text-emerald-400">{displayPrice}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-400 hover:to-indigo-500 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 transition-all duration-300 disabled:opacity-50 text-xs uppercase tracking-widest shadow-lg shadow-brand-500/20 active:scale-95 mt-4"
              >
                {processing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-lock text-[10px]"></i>
                    <span>Pay {displayPrice}</span>
                  </>
                )}
              </button>
              
              <p className="text-[9px] text-gray-600 text-center uppercase tracking-widest font-bold pt-2">
                🛡️ Verified Secure Checkout
              </p>
            </div>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-gray-600 relative z-10 w-full">
        <p>&copy; {new Date().getFullYear()} Harsh Edits. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Preparing Checkout...</p>
      </div>
    }>
      <CheckoutPageInner />
    </Suspense>
  );
}
