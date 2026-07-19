"use client";

import React, { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { firestore, storage } from "../../../utils/firebase";

interface CreatorProfileProps {
  currentUser: any;
  userProfile: any;
  onRefresh: () => void;
}

export default function CreatorProfile({ currentUser, userProfile, onRefresh }: CreatorProfileProps) {
  const details = userProfile?.creatorDetails || {};

  const [displayName, setDisplayName] = useState(details.displayName || "");
  const [bio, setBio] = useState(details.bio || "");
  const [supportEmail, setSupportEmail] = useState(details.supportEmail || "");
  const [avatarUrl, setAvatarUrl] = useState(details.avatarUrl || "");
  const [bannerUrl, setBannerUrl] = useState(details.bannerUrl || "");
  
  const storefront = userProfile?.storefront || {};
  const [themeColor, setThemeColor] = useState(storefront.themeColor || "#4f46e5");
  const [thankYouMessage, setThankYouMessage] = useState(storefront.thankYouMessage || "");
  const [twitter, setTwitter] = useState(storefront.socialLinks?.twitter || "");
  const [instagram, setInstagram] = useState(storefront.socialLinks?.instagram || "");
  const [youtube, setYoutube] = useState(storefront.socialLinks?.youtube || "");

  const payment = details.paymentDetails || {};
  const [razorpayAccountId, setRazorpayAccountId] = useState(payment.razorpayAccountId || "");
  const [stripeAccountId, setStripeAccountId] = useState(payment.stripeAccountId || "");
  
  // Bank details & UPI states
  const [bankName, setBankName] = useState(payment.bankName || "");
  const [accountHolderName, setAccountHolderName] = useState(payment.accountHolderName || "");
  const [accountNumber, setAccountNumber] = useState(payment.accountNumber || "");
  const [ifscCode, setIfscCode] = useState(payment.ifscCode || "");
  const [upiId, setUpiId] = useState(payment.upiId || "");

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [saving, setSaving] = useState(false);

  const [toasts, setToasts] = useState<{ id: string; msg: string; type: "success" | "error" | "info" }[]>([]);
  const showToast = (msg: string, type: "success" | "error" | "info" = "info") => {
    const toastId = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id: toastId, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 4000);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "banner") => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 2 MB Size Validation
    if (file.size > 2 * 1024 * 1024) {
      showToast("Image size exceeds 2 MB limit! Please optimize your image.", "error");
      return;
    }

    if (type === "avatar") setUploadingAvatar(true);
    if (type === "banner") setUploadingBanner(true);

    try {
      const fileRef = storageRef(storage, `creators/${currentUser.uid}/${type}_${Date.now()}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      if (type === "avatar") setAvatarUrl(url);
      if (type === "banner") setBannerUrl(url);
      showToast("Image uploaded successfully!", "success");
    } catch (err: any) {
      console.error("Image upload failed:", err);
      showToast("Failed to upload image: " + err.message, "error");
    } finally {
      setUploadingAvatar(false);
      setUploadingBanner(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let finalRazorpayAccountId = razorpayAccountId;

      // If bank details are filled but no Razorpay linked account exists yet, create one
      if (accountNumber && ifscCode && accountHolderName && !razorpayAccountId) {
        try {
          const res = await fetch("/api/create-linked-account", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: currentUser.email || supportEmail,
              phone: currentUser.phoneNumber || "",
              legalBusinessName: displayName || accountHolderName,
              accountHolderName,
              accountNumber,
              ifscCode,
            }),
          });

          const data = await res.json();

          if (data.success && data.accountId) {
            finalRazorpayAccountId = data.accountId;
            setRazorpayAccountId(data.accountId);
            showToast("✅ Bank account linked with Razorpay successfully! Payouts will be automatic.", "success");
          } else {
            console.warn("Razorpay linking failed:", data.error);
            showToast("⚠️ Bank details saved locally, but Razorpay linking failed: " + (data.error || "Unknown error"), "error");
          }
        } catch (linkErr: any) {
          console.warn("Razorpay API call failed:", linkErr);
          showToast("⚠️ Bank details saved locally, but could not reach Razorpay servers.", "error");
        }
      }

      const docRef = doc(firestore, "users", currentUser.uid);
      await updateDoc(docRef, {
        creatorDetails: {
          displayName,
          bio,
          supportEmail,
          avatarUrl,
          bannerUrl,
          paymentDetails: {
            razorpayAccountId: finalRazorpayAccountId,
            stripeAccountId,
            bankName,
            accountHolderName,
            accountNumber,
            ifscCode,
            upiId,
          },
        },
        storefront: {
          themeColor,
          thankYouMessage,
          bio,
          bannerUrl,
          socialLinks: { twitter, instagram, youtube },
        }
      });
      showToast("Storefront details updated successfully!", "success");
      onRefresh();
    } catch (err: any) {
      console.error("Error saving details:", err);
      showToast("Error saving details: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-white">
      <div>
        <h3 className="text-lg font-bold text-white">🏪 Creator Storefront Settings</h3>
        <p className="text-gray-400 text-xs mt-1">Configure your public store details, banners, and payouts configuration</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
          <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest border-b border-white/5 pb-2">Profile & Branding</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Avatar Upload */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">Avatar / Logo Image (2 MB Limit)</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500 flex items-center justify-center font-bold text-white overflow-hidden shrink-0 border border-white/10 relative">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>A</span>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "avatar")}
                  className="text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-white/5 file:text-indigo-400 hover:file:bg-white/10"
                />
              </div>
            </div>

            {/* Banner Upload */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">Store Header Banner (2 MB Limit)</label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center font-bold text-white overflow-hidden shrink-0 border border-white/10 relative">
                  {bannerUrl ? (
                    <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] uppercase font-bold opacity-45">No Banner</span>
                  )}
                  {uploadingBanner && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "banner")}
                  className="text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-white/5 file:text-indigo-400 hover:file:bg-white/10"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">Display Storefront Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. John's VFX Shop"
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">Support Contact Email</label>
              <input
                type="email"
                required
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="support@yourbrand.com"
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-bold">Creator Biography / Intro Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell customers about your assets bundles, editing experience, and design style..."
              className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 resize-none text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-bold">Post-Purchase Custom "Thank You" Message</label>
            <textarea
              rows={3}
              value={thankYouMessage}
              onChange={(e) => setThankYouMessage(e.target.value)}
              placeholder="Thank you for purchasing! Leave a personal message, discord invite, or instructions for the buyer here..."
              className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 resize-none text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">Store Theme Color (Hex)</label>
              <div className="flex gap-4 items-center">
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="w-12 h-12 rounded-xl bg-dark-900 border border-white/10 p-1 cursor-pointer"
                />
                <input
                  type="text"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  placeholder="#4f46e5"
                  className="flex-1 bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 text-white uppercase"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">Twitter URL</label>
              <input
                type="url"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="https://twitter.com/..."
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">Instagram URL</label>
              <input
                type="url"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="https://instagram.com/..."
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">YouTube URL</label>
              <input
                type="url"
                value={youtube}
                onChange={(e) => setYoutube(e.target.value)}
                placeholder="https://youtube.com/..."
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 text-white"
              />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
          <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest border-b border-white/5 pb-2">Payout Configuration (Revenue Splits)</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">Razorpay Route Linked Account ID (e.g. `acc_Hsv28s192` for splits)</label>
              <input
                type="text"
                value={razorpayAccountId}
                onChange={(e) => setRazorpayAccountId(e.target.value)}
                placeholder="acc_..."
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">Stripe Connect Account ID (International Payouts)</label>
              <input
                type="text"
                value={stripeAccountId}
                onChange={(e) => setStripeAccountId(e.target.value)}
                placeholder="acct_..."
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 text-white"
              />
            </div>
          </div>

          <div className="border-t border-white/5 pt-4 space-y-6">
            <h5 className="text-xs font-bold text-gray-300">Bank Details / UPI for Manual Routing</h5>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold">Account Holder Name</label>
                <input
                  type="text"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank"
                  className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold">Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 5010029381928"
                  className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold">IFSC Code</label>
                <input
                  type="text"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value)}
                  placeholder="e.g. HDFC0000123"
                  className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 text-white"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs text-gray-400 font-bold">UPI ID (Alternative Payout Mode)</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. johndoe@upi"
                  className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 text-white"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-white/5">
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 text-sm shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <i className="fa-solid fa-floppy-disk"></i>
            )}
            {saving ? "Saving Changes..." : "Save Storefront Details"}
          </button>
        </div>

        {/* Toast Notifier */}
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
          {toasts.map((t) => (
            <div key={t.id} className={`px-4 py-3 rounded-xl text-xs font-bold shadow-lg animate-fade-in flex items-center gap-3 border ${
              t.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              t.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
              'bg-blue-500/10 text-blue-400 border-blue-500/20'
            }`}>
              <i className={`fa-solid ${t.type === 'success' ? 'fa-check-circle' : t.type === 'error' ? 'fa-triangle-exclamation' : 'fa-info-circle'}`}></i>
              {t.msg}
            </div>
          ))}
        </div>
      </form>
    </div>
  );
}
