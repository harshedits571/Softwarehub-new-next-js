"use client";

import React, { useState, useEffect } from "react";
import { doc, collection, getDoc, updateDoc, setDoc, addDoc, Timestamp } from "firebase/firestore";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  linkWithCredential,
  EmailAuthProvider,
  updatePassword
} from "firebase/auth";
import { auth, firestore } from "../utils/firebase";
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
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");

  const [vendorId, setVendorId] = useState<string | null>(null);
  const [creatorRzpAccount, setCreatorRzpAccount] = useState<string | null>(null);
  const [purchasedLicense, setPurchasedLicense] = useState<{
    key: string;
    email: string;
    password?: string;
    plan: string;
    maxMachines: number;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    if (currentUser) {
      if (!name) setName(currentUser.displayName || "");
      if (!email) setEmail(currentUser.email || "");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = (email || currentUser?.email || "").trim().toLowerCase();
    if (!cleanEmail) {
      onAlert("Please enter a valid email address.", "Email Required", "error");
      return;
    }

    if (!name.trim()) {
      onAlert("Please enter your full name.", "Name Required", "error");
      return;
    }

    if (!password || password.length < 6) {
      onAlert("Please create an App Password with at least 6 characters. You will need this to sign into the Windows PC application.", "Password Required", "error");
      return;
    }

    if (!phone.trim()) {
      onAlert("Please enter your phone number.", "Phone Required", "error");
      return;
    }

    let authenticatedUser = currentUser;
    setAuthLoading(true);

    // 1. Account Creation or Password Binding
    try {
      if (!authenticatedUser) {
        // Create new account with email & password
        try {
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          authenticatedUser = cred.user;
          if (name.trim()) {
            await updateProfile(authenticatedUser, { displayName: name.trim() });
          }
          await setDoc(doc(firestore, "users", authenticatedUser.uid), {
            name: name.trim(),
            email: cleanEmail,
            phone: countryCode + phone.trim(),
            appPassword: password,
            status: "active",
            role: "customer",
            createdAt: Timestamp.now(),
            joinedAt: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
          }, { merge: true });
        } catch (signupErr: any) {
          if (signupErr.code === "auth/email-already-in-use") {
            try {
              const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
              authenticatedUser = cred.user;
            } catch (signInErr: any) {
              setAuthLoading(false);
              onAlert("An account with this email already exists. Please verify your password or sign in first.", "Account Exists", "error");
              return;
            }
          } else {
            setAuthLoading(false);
            onAlert(signupErr.message || "Failed to create account.", "Sign Up Error", "error");
            return;
          }
        }
      } else {
        // User is already logged in (e.g. via Google or session)
        // Bind the password to their Firebase Auth account so they can use Email & Password in desktop app
        try {
          if (authenticatedUser.email) {
            try {
              await linkWithCredential(authenticatedUser, EmailAuthProvider.credential(authenticatedUser.email, password));
            } catch (linkErr: any) {
              if (linkErr.code === "auth/provider-already-linked" || linkErr.code === "auth/credential-already-in-use") {
                await updatePassword(authenticatedUser, password);
              }
            }
          }
        } catch (pwErr) {
          console.warn("Could not link Firebase auth password, stored in Firestore profile instead:", pwErr);
        }

        // Always save to Firestore user profile
        await setDoc(doc(firestore, "users", authenticatedUser.uid), {
          name: name.trim() || authenticatedUser.displayName || "Customer",
          email: cleanEmail,
          phone: countryCode + phone.trim(),
          appPassword: password,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      }
    } catch (authErr: any) {
      setAuthLoading(false);
      onAlert(authErr.message || "Authentication failed. Please check your credentials.", "Auth Error", "error");
      return;
    }
    setAuthLoading(false);

    // Ensure Razorpay script is loaded
    if (!(window as any).Razorpay) {
      await new Promise<void>((resolve) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => resolve();
        document.body.appendChild(script);
      });
    }
    const Razorpay = (window as any).Razorpay;
    if (!Razorpay) {
      onAlert("Razorpay SDK failed to load. Please refresh and try again.", "Error", "error");
      return;
    }

    const description = itemId ? `Access to: ${itemTitle}` : "Lifetime Pro Access Bundle";

    // Strict Personal Cloud product determination (ONLY triggers for Personal Cloud items)
    const isPersonalCloud =
      Boolean(itemId && String(itemId).toLowerCase().startsWith("personal-cloud")) ||
      Boolean(itemId && String(itemId).toLowerCase().includes("personal_cloud")) ||
      Boolean(itemTitle && String(itemTitle).toLowerCase().includes("personal cloud"));

    const isProMembership = !isPersonalCloud && (!itemId || itemId === "PRO_BUNDLE" || String(itemTitle).toLowerCase().includes("pro membership"));

    const planType = isPersonalCloud
      ? String(itemId || itemTitle).toLowerCase().includes("family")
        ? "family"
        : String(itemId || itemTitle).toLowerCase().includes("starter")
        ? "starter"
        : "pro"
      : "pro";

    const userEmail = cleanEmail;
    const customerPhone = countryCode + phone.trim();
    const cleanLeadId = userEmail.replace(/[^a-zA-Z0-9]/g, "_") || `lead_${Date.now()}`;
    const leadRef = doc(firestore, "leads", cleanLeadId);

    // Automatically record Lead ONLY for Personal Cloud purchases
    if (isPersonalCloud) {
      try {
        await setDoc(
          leadRef,
          {
            id: cleanLeadId,
            name: name || authenticatedUser?.displayName || "Customer",
            email: userEmail,
            phone: customerPhone,
            plan: planType,
            leadStatus: "Interested",
            paymentStatus: "Pending",
            amountPaid: 0,
            registrationDate: Timestamp.now(),
            source: "Personal Cloud Checkout",
            activityHistory: [
              {
                action: "Clicked Proceed to Pay (Checkout Initiated)",
                status: "Interested",
                plan: planType,
                amount: amount,
                timestamp: new Date().toISOString(),
              },
            ],
          },
          { merge: true }
        );
      } catch (leadInitErr) {
        console.warn("Could not save initial Interested lead state:", leadInitErr);
      }
    }

    try {
      // Create order server-side
      const orderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amount,
          currency: currency,
          productId: itemId || "PRO_BUNDLE",
          productTitle: itemTitle || (isPersonalCloud ? "Personal Cloud Pro" : "Pro Membership"),
          customerEmail: userEmail,
          customerName: name || authenticatedUser?.displayName || "",
          creatorLinkedAccountId: creatorRzpAccount || null,
          platformCommissionPercent: 10,
        }),
      });

      const orderData = await orderRes.json();

      if (!orderData.success || !orderData.id) {
        throw new Error(orderData.error || "Failed to create Razorpay order");
      }

      const options: any = {
        key: rzpKey,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.id,
        name: "SoftwareHubs",
        description: description,
        image: "/assets/logo.png",
        handler: async function (response: any) {
          if (response.razorpay_payment_id) {
            try {
              // Verify payment signature
              const verifyRes = await fetch("/api/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  productId: itemId || "PRO_BUNDLE",
                  userEmail: userEmail,
                  amount: amount,
                  currency: currency,
                }),
              });

              const verifyData = await verifyRes.json();
              if (!verifyData.success) {
                throw new Error(verifyData.error || "Payment verification failed");
              }

              const paymentId = response.razorpay_payment_id;
              const orderId = response.razorpay_order_id;

              // === CASE 1: PERSONAL CLOUD PURCHASE (Generates license key & Personal Cloud docs) ===
              if (isPersonalCloud) {
                const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                const p = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
                const generatedKey = `PCLOUD-${p()}-${p()}-${p()}-${p()}`;
                const maxMac = planType === "family" ? 5 : planType === "pro" ? 3 : 1;

                // Write to licenses collection
                try {
                  const licRef = doc(firestore, "licenses", generatedKey);
                  await setDoc(licRef, {
                    id: generatedKey,
                    key: generatedKey,
                    licenseKey: generatedKey,
                    customerEmail: userEmail,
                    customerName: name || authenticatedUser?.displayName || "Customer",
                    userId: authenticatedUser?.uid || null,
                    plan: planType,
                    maxMachines: maxMac,
                    activatedMachines: 0,
                    amount: amount,
                    currency: currency,
                    paymentId: paymentId,
                    orderId: orderId || null,
                    status: "active",
                    issueDate: Timestamp.now(),
                    createdAt: Timestamp.now(),
                    expiryDate: "Lifetime",
                    devices: [],
                  });

                  if (authenticatedUser) {
                    await setDoc(doc(firestore, "users", authenticatedUser.uid), {
                      personalCloud: {
                        plan: planType,
                        licenseKey: generatedKey,
                        maxMachines: maxMac,
                        appPassword: password, // Store password so desktop app activates 100% reliably
                        activatedAt: Timestamp.now(),
                      },
                      [`licenses.${generatedKey}`]: {
                        licenseKey: generatedKey,
                        plan: planType,
                        createdAt: Date.now(),
                      },
                    }, { merge: true });
                  }
                } catch (licErr) {
                  console.error("Failed to write license to Firestore:", licErr);
                }

                // Update lead status to Verified
                try {
                  const leadSnap = await getDoc(leadRef);
                  const existingHistory = leadSnap.exists() && Array.isArray(leadSnap.data()?.activityHistory)
                    ? leadSnap.data().activityHistory
                    : [];

                  await setDoc(
                    leadRef,
                    {
                      leadStatus: "Verified",
                      paymentStatus: "Paid",
                      purchaseDate: Timestamp.now(),
                      amountPaid: amount,
                      paymentId: paymentId,
                      orderId: orderId || null,
                      licenseKey: generatedKey,
                      userId: authenticatedUser?.uid || null,
                      activityHistory: [
                        ...existingHistory,
                        {
                          action: "Payment Verified via Razorpay",
                          status: "Verified",
                          paymentId: paymentId,
                          orderId: orderId || null,
                          amount: amount,
                          licenseKey: generatedKey,
                          timestamp: new Date().toISOString(),
                        },
                      ],
                    },
                    { merge: true }
                  );
                } catch (leadUpdateErr) {
                  console.warn("Could not update lead status to Verified:", leadUpdateErr);
                }

                // Write payment record to Personal Cloud payments collection
                try {
                  const invNum = `INV-${paymentId.slice(-8).toUpperCase()}`;
                  await setDoc(doc(firestore, "payments", paymentId), {
                    id: paymentId,
                    paymentId: paymentId,
                    orderId: orderId || null,
                    customerName: name || authenticatedUser?.displayName || "Customer",
                    customerEmail: userEmail,
                    customerPhone: customerPhone,
                    userId: authenticatedUser?.uid || null,
                    planId: planType,
                    planName: `Personal Cloud ${planType.toUpperCase()}`,
                    amount: amount,
                    currency: currency,
                    gateway: "razorpay",
                    gatewayStatus: "captured",
                    transactionDate: Timestamp.now(),
                    invoiceNumber: invNum,
                    refundStatus: "none",
                    licenseKey: generatedKey,
                  });
                } catch (payDocErr) {
                  console.warn("Could not write payment to payments collection:", payDocErr);
                }

                // Also log general transaction
                try {
                  await addDoc(collection(firestore, "transactions"), {
                    uid: authenticatedUser?.uid || null,
                    email: userEmail,
                    userName: name || authenticatedUser?.displayName || "Customer",
                    amount: amount,
                    currency: currency,
                    itemId: itemId || `personal-cloud-${planType}`,
                    itemTitle: itemTitle || `Personal Cloud ${planType.toUpperCase()}`,
                    paymentId: paymentId,
                    orderId: orderId || null,
                    type: "personal_cloud",
                    vendorId: "platform",
                    gateway: "razorpay",
                    status: "captured",
                    licenseKey: generatedKey,
                    timestamp: Timestamp.now(),
                  });
                } catch (txErr) {}

                setPurchasedLicense({
                  key: generatedKey,
                  email: userEmail,
                  password: password,
                  plan: planType,
                  maxMachines: maxMac,
                });
                onSuccess(paymentId);
                return;
              }

              // === CASE 2: WEBSITE PRO MEMBERSHIP (₹10) OR SOFTWARE/PLUGIN PURCHASE ===
              // (Grants access ONLY to download software & plugins on the website - NO Personal Cloud license generated)
              if (authenticatedUser) {
                const userDocRef = doc(firestore, "users", authenticatedUser.uid);
                const userSnap = await getDoc(userDocRef);
                const userData = userSnap.exists() ? userSnap.data() : {};
                const updatedPurchased = { ...(userData?.purchased || {}) };

                if (isProMembership) {
                  updatedPurchased["PRO_BUNDLE"] = true;
                } else if (itemId) {
                  updatedPurchased[itemId] = true;
                }

                await setDoc(userDocRef, {
                  isPaid: isProMembership ? true : (userData.isPaid || false),
                  purchased: updatedPurchased,
                  paymentId: paymentId,
                  paidAt: Timestamp.now(),
                  updatedAt: Timestamp.now(),
                }, { merge: true });
              }

              // Log transaction for website revenue / creator payouts
              try {
                await addDoc(collection(firestore, "transactions"), {
                  uid: authenticatedUser?.uid || null,
                  email: userEmail,
                  userName: name || authenticatedUser?.displayName || "Customer",
                  amount: amount,
                  currency: currency,
                  itemId: isProMembership ? "PRO_BUNDLE" : (itemId || "software_item"),
                  itemTitle: itemTitle || (isProMembership ? "Pro Membership" : "Software Access"),
                  paymentId: paymentId,
                  orderId: orderId || null,
                  type: isProMembership ? "pro_membership" : "individual",
                  vendorId: vendorId || "platform",
                  payoutAccountId: creatorRzpAccount || "",
                  gateway: "razorpay",
                  status: "captured",
                  timestamp: Timestamp.now(),
                });
              } catch (txErr) {
                console.warn("Could not log store transaction:", txErr);
              }

              // Update customer store spend stats
              try {
                const custDocRef = doc(firestore, "customers", userEmail);
                const custSnap = await getDoc(custDocRef);
                const custData = custSnap.exists() ? custSnap.data() : {};
                const spent = (custData?.totalSpent || 0) + amount;
                const orders = (custData?.ordersCount || 0) + 1;

                await setDoc(custDocRef, {
                  phone: customerPhone,
                  name: name || authenticatedUser?.displayName || "Customer",
                  totalSpent: spent,
                  ordersCount: orders,
                  lastOrderDate: Timestamp.now(),
                  firstOrderDate: custData?.firstOrderDate || Timestamp.now(),
                }, { merge: true });
              } catch (custErr) {}

              onSuccess(paymentId);
              onClose();
            } catch (err) {
              console.error("Error executing payment updates:", err);
              onAlert("Payment successful, but database logs failed. Please contact support.", "DB Error", "error");
            }
          }
        },
        prefill: {
          name: name || authenticatedUser?.displayName || "",
          email: userEmail,
          contact: customerPhone,
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
    } catch (err: any) {
      console.error("Checkout initiation failed:", err);
      onAlert(err.message || "Failed to initialize checkout.", "Error", "error");
    }
  };

  if (purchasedLicense) {
    return (
      <div className="fixed inset-0 z-[30000] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
        <div className="bg-[#0e0e18] border-2 border-indigo-500/50 w-full max-w-lg rounded-3xl p-6 sm:p-8 relative shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 text-2xl border border-emerald-500/30">
            <i className="fa-solid fa-circle-check"></i>
          </div>

          <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full mb-3 inline-block">
            PAYMENT SUCCESSFUL • ACCOUNT READY
          </span>

          <h2 className="text-2xl font-black text-white mb-2">Personal Cloud Account Ready</h2>
          <p className="text-xs text-gray-400 mb-6">
            Your SoftwareHubs account is activated. Use your <b>Email & Password</b> below to log into the Windows PC app and mobile gateway!
          </p>

          <div className="bg-[#141424] border border-white/10 rounded-2xl p-4 mb-5 text-left space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Desktop Login Email:</span>
              <span className="text-white font-bold">{purchasedLicense.email}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Desktop App Password:</span>
              <span className="text-emerald-400 font-bold">•••••••• (Your Created Password)</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Active Plan:</span>
              <span className="text-emerald-400 font-bold uppercase">{purchasedLicense.plan} (Lifetime)</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Device Quota:</span>
              <span className="text-indigo-300 font-bold">{purchasedLicense.maxMachines} PC{purchasedLicense.maxMachines > 1 ? "s" : ""}</span>
            </div>

            <div className="pt-2 border-t border-white/10">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Backup License Key:</div>
              <div className="flex items-center justify-between bg-black/50 border border-indigo-500/30 rounded-xl px-3 py-2">
                <span className="font-mono text-xs font-bold text-indigo-300">
                  {purchasedLicense.key}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(purchasedLicense.key);
                    setCopiedKey(true);
                    setTimeout(() => setCopiedKey(false), 2500);
                  }}
                  className="bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 px-2 py-0.5 rounded text-[10px] font-bold"
                >
                  {copiedKey ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <a
              href="/cloud"
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white font-black text-sm py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <span>🚀 Open Personal Cloud Gateway</span>
              <i className="fa-solid fa-arrow-right text-xs"></i>
            </a>

            <a
              href="/downloads/PersonalCloud-Pro-Setup.exe"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-download"></i>
              <span>Download Desktop Installer (.exe)</span>
            </a>

            <button
              type="button"
              onClick={() => {
                setPurchasedLicense(null);
                onClose();
              }}
              className="w-full bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold py-2.5 rounded-xl transition-colors"
            >
              Done & Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[30000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-opacity duration-300">
      <div className="glass-card w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl relative bg-[#0f0f15] flex flex-col md:flex-row">
        
        {/* Left Side: Product Summary */}
        <div className="md:w-[45%] bg-gradient-to-br from-[#1a1a24] to-[#0A0A0F] p-8 md:p-10 border-r border-white/5 flex flex-col relative overflow-hidden">
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
              <i className="fa-solid fa-shield-halved text-xl"></i>
            </div>
            
            <h3 className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-2">Order & Account Setup</h3>
            <h2 className="text-2xl md:text-3xl font-black text-white leading-tight mb-4">
              {itemTitle || "Personal Cloud Pro"}
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Fill in your details and create your <b>Personal Cloud App Password</b>. You will use your email and this password to sign into the Windows PC software!
            </p>

            <div className="space-y-2 text-xs text-gray-400">
              <div className="flex items-center gap-2 text-emerald-400">
                <i className="fa-solid fa-check"></i>
                <span>Lifetime license with zero monthly fees</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <i className="fa-solid fa-check"></i>
                <span>Automatic 1-click cloud gateway on softwarehubs.in</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <i className="fa-solid fa-check"></i>
                <span>Instant PC login with Email & Password</span>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 relative z-10">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Total Due</p>
                <div className="text-4xl font-black text-white">{displayPrice}</div>
              </div>
              <div className="text-emerald-400 text-xs font-bold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                <i className="fa-solid fa-check mr-1"></i> Lifetime
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Profile Creation & Checkout Form */}
        <div className="md:w-[55%] p-8 md:p-10 relative bg-[#0f0f15] max-h-[90vh] overflow-y-auto">
          <button
            type="button"
            onClick={onClose}
            className="hidden md:block absolute top-8 right-8 text-white/30 hover:text-white transition-colors"
          >
            <i className="fa-solid fa-times text-2xl"></i>
          </button>

          <div className="mb-6">
            <h3 className="text-xl font-bold text-white mb-1">
              Personal Cloud Profile Setup
            </h3>
            <p className="text-xs text-gray-400">
              {currentUser ? "Verify your info & create your PC desktop password below." : "Enter your details to create your account & desktop login credentials."}
            </p>
          </div>

          {currentUser && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 mb-5 flex items-center justify-between text-xs">
              <span className="text-emerald-300 font-medium">
                Connected SoftwareHubs Account: <b>{currentUser.email}</b>
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded">
                Verified
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[#0a0d14] border border-white/10 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none text-sm transition-all"
                placeholder="e.g. Harsh Kumar"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5">Registered Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#0a0d14] border border-white/10 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none text-sm transition-all"
                placeholder="yourname@gmail.com"
              />
              <span className="text-[11px] text-gray-500 mt-1 block">
                This email will be your login ID in the Windows app.
              </span>
            </div>

            {/* MANDATORY FOR ALL: Set Personal Cloud App Password */}
            <div className="bg-gradient-to-r from-indigo-950/40 to-purple-950/40 border border-indigo-500/30 rounded-2xl p-4">
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-extrabold text-indigo-300 flex items-center gap-1.5">
                  <span>🔑</span>
                  <span>Create App Password (For PC Login) *</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-200 font-medium"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-[#0a0d14] border border-indigo-500/40 focus:border-indigo-400 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none text-sm transition-all"
                placeholder="Set a password for your PC app (min. 6 characters)"
              />
              <span className="text-[11px] text-indigo-200/70 mt-1.5 block leading-relaxed">
                👉 <b>Important:</b> You will type this password into the <b>Personal Cloud Pro</b> app on your Windows PC to unlock your server!
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5">Phone Number (For WhatsApp Updates & Invoices) *</label>
              <div className="flex bg-[#0a0d14] border border-white/10 focus-within:border-indigo-500 rounded-xl transition-all overflow-hidden">
                <div className="flex items-center bg-white/5 border-r border-white/5 relative">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="bg-transparent text-gray-400 text-sm font-medium outline-none px-3 py-3 appearance-none cursor-pointer hover:text-white transition-colors z-10 relative"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.name + c.code} value={c.code} className="bg-[#0a0d14] text-white">
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
                  className="w-full bg-transparent px-4 py-3 text-white placeholder-gray-600 outline-none text-sm"
                  placeholder="98765 43210"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-black text-sm py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] mt-5 flex justify-center items-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50"
            >
              {authLoading ? (
                <span>Setting up account...</span>
              ) : (
                <>
                  <span>Proceed to Payment ({displayPrice})</span>
                  <i className="fa-solid fa-arrow-right text-xs"></i>
                </>
              )}
            </button>
          </form>
          
          <div className="mt-6 pt-5 border-t border-white/5 text-center flex flex-wrap items-center justify-center gap-4 text-gray-500 text-[10px]">
            <div className="flex items-center gap-1.5 font-medium">
              <i className="fa-brands fa-cc-visa text-lg text-gray-400"></i>
              <i className="fa-brands fa-cc-mastercard text-lg text-gray-400"></i>
              <i className="fa-brands fa-google-pay text-lg text-gray-400"></i>
            </div>
            <div className="flex items-center gap-1 font-medium">
              <i className="fa-solid fa-lock text-emerald-500"></i> SSL 256-bit Secure
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
