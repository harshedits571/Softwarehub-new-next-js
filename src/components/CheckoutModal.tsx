"use client";

import React, { useState, useEffect } from "react";
import { doc, collection, getDoc, updateDoc, addDoc, Timestamp } from "firebase/firestore";
import { firestore } from "../utils/firebase";
import { useAuth } from "../context/AuthContext";

const COUNTRY_CODES = [
  { code: "+1", name: "US/CA" }, { code: "+7", name: "RU" }, { code: "+20", name: "EG" },
  { code: "+27", name: "ZA" }, { code: "+30", name: "GR" }, { code: "+31", name: "NL" },
  { code: "+32", name: "BE" }, { code: "+33", name: "FR" }, { code: "+34", name: "ES" },
  { code: "+36", name: "HU" }, { code: "+39", name: "IT" }, { code: "+40", name: "RO" },
  { code: "+41", name: "CH" }, { code: "+43", name: "AT" }, { code: "+44", name: "UK" },
  { code: "+45", name: "DK" }, { code: "+46", name: "SE" }, { code: "+47", name: "NO" },
  { code: "+48", name: "PL" }, { code: "+49", name: "DE" }, { code: "+51", name: "PE" },
  { code: "+52", name: "MX" }, { code: "+54", name: "AR" }, { code: "+55", name: "BR" },
  { code: "+56", name: "CL" }, { code: "+57", name: "CO" }, { code: "+58", name: "VE" },
  { code: "+60", name: "MY" }, { code: "+61", name: "AU" }, { code: "+62", name: "ID" },
  { code: "+63", name: "PH" }, { code: "+64", name: "NZ" }, { code: "+65", name: "SG" },
  { code: "+66", name: "TH" }, { code: "+81", name: "JP" }, { code: "+82", name: "KR" },
  { code: "+84", name: "VN" }, { code: "+86", name: "CN" }, { code: "+90", name: "TR" },
  { code: "+91", name: "IN" }, { code: "+92", name: "PK" }, { code: "+94", name: "LK" },
  { code: "+234", name: "NG" }, { code: "+254", name: "KE" }, { code: "+351", name: "PT" },
  { code: "+353", name: "IE" }, { code: "+358", name: "FI" }, { code: "+420", name: "CZ" },
  { code: "+852", name: "HK" }, { code: "+880", name: "BD" }, { code: "+886", name: "TW" },
  { code: "+966", name: "SA" }, { code: "+971", name: "AE" }, { code: "+977", name: "NP" }
].sort((a, b) => a.name.localeCompare(b.name));

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string | null;
  itemTitle: string | null;
  amount: number;
  currency: "INR" | "USD";
  rzpKey: string;
  onSuccess: (paymentId: string) => void;
  onAlert: (msg: string, title: string, type: "error" | "success" | "info") => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  itemId,
  itemTitle,
  amount,
  currency,
  rzpKey,
  onSuccess,
  onAlert,
}) => {
  const { currentUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");

  const [vendorId, setVendorId] = useState<string | null>(null);
  const [creatorRzpAccount, setCreatorRzpAccount] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.displayName || "");
      setEmail(currentUser.email || "");
    }
  }, [currentUser, isOpen]);

  useEffect(() => {
    if (itemId && isOpen) {
      const getVendorDetails = async () => {
        try {
          const prodSnap = await getDoc(doc(firestore, "products", itemId));
          if (prodSnap.exists()) {
            const pData = prodSnap.data();
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
        } catch (err) {
          console.error("Failed to load vendor payment details:", err);
        }
      };
      getVendorDetails();
    } else {
      setVendorId(null);
      setCreatorRzpAccount(null);
    }
  }, [itemId, isOpen]);

  if (!isOpen) return null;

  const displayPrice = currency === "USD" ? `$${amount.toFixed(2)}` : `₹${amount}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      onAlert("Please log in to make a payment", "Authentication Required", "info");
      window.location.href = "/auth";
      return;
    }

    const Razorpay = (window as any).Razorpay;
    if (!Razorpay) {
      onAlert("Razorpay SDK failed to load. Please refresh and try again.", "Error", "error");
      return;
    }

    const finalAmount = Math.round(amount * 100);
    const description = itemId ? `Access to: ${itemTitle}` : "Lifetime Pro Access Bundle";

    // 10% platform / 90% creator split
    const platformFee = amount * 0.1;
    const creatorShare = amount * 0.9;

    const options: any = {
      key: rzpKey,
      amount: finalAmount,
      currency: currency,
      name: "SoftwhereHub",
      description: description,
      image: "/assets/logo.png",
      payment_capture: 1,
      notes: {
        vendorId: vendorId || "platform",
        razorpayAccountId: creatorRzpAccount || "",
        platformCommission: platformFee.toString(),
        creatorPayout: creatorShare.toString(),
      },
      handler: async function (response: any) {
        if (response.razorpay_payment_id) {
          try {
            const paymentId = response.razorpay_payment_id;
            
            const userDocRef = doc(firestore, "users", currentUser.uid);
            const userProfileSnap = await getDoc(userDocRef);
            const userProfileData = userProfileSnap.exists() ? userProfileSnap.data() : {};
            
            const updatedPurchased = { ...(userProfileData?.purchased || {}) };
            if (itemId) {
              updatedPurchased[itemId] = true;
            }

            await updateDoc(userDocRef, {
              paymentId: paymentId,
              paidAt: Timestamp.now(),
              isPaid: itemId ? !!userProfileData?.isPaid : true,
              purchased: updatedPurchased
            });

            const transactionRef = collection(firestore, "transactions");
            await addDoc(transactionRef, {
              uid: currentUser.uid,
              email: currentUser.email || "N/A",
              userName: name || currentUser.displayName || "N/A",
              amount: amount,
              currency: currency,
              itemId: itemId || "PRO_BUNDLE",
              productId: itemId || "PRO_BUNDLE",
              itemTitle: itemTitle || "Lifetime Pro Access",
              paymentId: paymentId,
              type: itemId ? "individual" : "pro_membership",
              vendorId: vendorId || "platform",
              payoutAccountId: creatorRzpAccount || "",
              platformCommission: itemId ? platformFee : 0,
              creatorPayout: itemId ? creatorShare : 0,
              timestamp: Timestamp.now(),
            });

            const logRef = collection(firestore, "auditLogs");
            await addDoc(logRef, {
              type: "Payment",
              user: currentUser.email || "N/A",
              detail: `Paid ${currency} ${amount} for ${itemTitle || "Lifetime Pro Access"}. split: platform ${platformFee}, creator ${creatorShare}`,
              timestamp: Timestamp.now(),
            });

            onSuccess(paymentId);
            onClose();
          } catch (err) {
            console.error("Error executing payment updates:", err);
            onAlert("Payment successful, but database logs failed. Please contact support.", "DB Error", "error");
          }
        }
      },
      prefill: {
        name: name || currentUser.displayName || "",
        email: email || currentUser.email || "",
        contact: countryCode + phone,
      },
      theme: {
        color: "#4f46e5",
      },
    };

    const rzp = new Razorpay(options);
    rzp.on("payment.failed", function (response: any) {
      onAlert("Payment Failed: " + response.error.description, "Transaction Error", "error");
    });
    rzp.open();
  };

  return (
    <div className="fixed inset-0 z-[30000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-opacity duration-300">
      <div className="glass-card w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl relative bg-[#0f0f15] flex flex-col md:flex-row">
        
        {/* Left Side: Product Summary */}
        <div className="md:w-[45%] bg-gradient-to-br from-[#1a1a24] to-[#0A0A0F] p-8 md:p-10 border-r border-white/5 flex flex-col relative overflow-hidden">
          {/* Subtle bg glow */}
          <div className="absolute top-0 left-0 w-full h-full bg-indigo-500/10 blur-[100px] pointer-events-none rounded-full"></div>
          
          <button
            type="button"
            onClick={onClose}
            className="md:hidden absolute top-6 right-6 text-white/50 hover:text-white transition-colors z-10"
          >
            <i className="fa-solid fa-times text-xl"></i>
          </button>
          
          <div className="flex-1 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-8 border border-indigo-500/30">
              <i className="fa-solid fa-cart-shopping text-xl"></i>
            </div>
            
            <h3 className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-2">Order Summary</h3>
            <h2 className="text-2xl md:text-3xl font-black text-white leading-tight mb-4">
              {itemTitle || "Pro Membership Bundle"}
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-8">
              Complete your purchase securely. You will gain instant access to your digital files immediately after payment.
            </p>
          </div>

          <div className="pt-8 border-t border-white/10 relative z-10">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Total Due</p>
                <div className="text-4xl font-black text-white">{displayPrice}</div>
              </div>
              <div className="text-emerald-400 text-xs font-bold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                <i className="fa-solid fa-check mr-1"></i> Secure
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Checkout Form */}
        <div className="md:w-[55%] p-8 md:p-12 relative bg-[#0f0f15]">
          <button
            type="button"
            onClick={onClose}
            className="hidden md:block absolute top-8 right-8 text-white/30 hover:text-white transition-colors"
          >
            <i className="fa-solid fa-times text-2xl"></i>
          </button>

          <h3 className="text-xl font-bold text-white mb-8">Billing Details</h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-dark-900 border border-white/10 focus:border-indigo-500 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 outline-none transition-all shadow-sm text-sm"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-dark-900 border border-white/10 focus:border-indigo-500 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 outline-none transition-all shadow-sm text-sm"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2">Phone Number</label>
              <div className="flex bg-dark-900 border border-white/10 focus-within:border-indigo-500 rounded-xl transition-all shadow-sm overflow-hidden">
                <div className="flex items-center bg-white/5 border-r border-white/5 relative">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="bg-transparent text-gray-400 text-sm font-medium outline-none px-3 py-3.5 appearance-none cursor-pointer hover:text-white transition-colors z-10 relative"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.name + c.code} value={c.code} className="bg-dark-900 text-white">
                        {c.code} {c.name}
                      </option>
                    ))}
                  </select>
                  <i className="fa-solid fa-chevron-down text-[10px] text-gray-500 absolute right-2 pointer-events-none z-0"></i>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full bg-transparent px-4 py-3.5 text-white placeholder-gray-600 outline-none text-sm"
                  placeholder="98765 43210"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.2)] hover:shadow-[0_0_30px_rgba(79,70,229,0.4)] active:scale-[0.98] mt-4 flex justify-center items-center gap-2"
            >
              <span>Pay {displayPrice} Securely</span>
              <i className="fa-solid fa-arrow-right text-xs"></i>
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-white/5 text-center flex flex-wrap items-center justify-center gap-4 text-gray-500 text-[10px]">
            <div className="flex items-center gap-1.5 font-medium">
              <i className="fa-brands fa-cc-visa text-lg text-gray-400"></i>
              <i className="fa-brands fa-cc-mastercard text-lg text-gray-400"></i>
              <i className="fa-brands fa-google-pay text-lg text-gray-400"></i>
              <i className="fa-brands fa-apple-pay text-lg text-gray-400"></i>
            </div>
            <div className="flex items-center gap-1 font-medium">
              <i className="fa-solid fa-lock text-emerald-500"></i> 256-bit Encrypted
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
