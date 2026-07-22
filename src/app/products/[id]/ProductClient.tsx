"use client";

import React, { useEffect, useState, use } from "react";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, updateDoc, addDoc, Timestamp } from "firebase/firestore";
import { firestore } from "../../../utils/firebase";
import { useAuth } from "../../../context/AuthContext";
import { useCurrency } from "../../../hooks/useCurrency";
import { ProductDrawer } from "../../../components/ProductDrawer";
import { CheckoutModal } from "../../../components/CheckoutModal";
import DownloadLimitModal from "../../../components/DownloadLimitModal";
import { RatingModal } from "../../../components/RatingModal";
import { BrokenLinkModal } from "../../../components/BrokenLinkModal";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Version {
  id?: string;
  Name: string;
  Link: string;
  price?: number;
  priceUSD?: number;
  salePrice?: number;
  inrPrice?: number;
  inrSalePrice?: number;
  stockStatus?: string;
  Description?: string;
}

interface Feature {
  title: string;
  description: string;
  imageUrl: string;
}

interface ResourceItem {
  id: string;
  Title: string;
  Description?: string;
  DownloadDescription?: string;
  ImageURL?: string;
  DownloadLink?: string;
  isPro?: boolean;
  price?: number;
  priceUSD?: number;
  compatibleWith?: string[];
  videoUrl?: string;
  presetList?: string[];
  extraImages?: string[];
  Versions?: Version[];
  features?: Feature[];
  ownerUid?: string;
  vendorId?: string;
  Category?: string;
  isFlatCreatorProduct?: boolean;
}

export default function ProductDetailsClient({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const router = useRouter();
  const { currentUser, userProfile } = useAuth();
  const pricing = useCurrency();

  const [product, setProduct] = useState<ResourceItem | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Image Slideshow
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [images, setImages] = useState<string[]>([]);

  // Variants/Versions

  // Ratings
  const [ratingSummary, setRatingSummary] = useState<{
    average?: number;
    count?: number;
    versions?: Record<string, { average: number; count: number }>;
  } | null>(null);

  // Favorites & Toasts
  const [favorites, setFavorites] = useState<Record<string, any>>({});
  const [toasts, setToasts] = useState<{ id: string; msg: string; type: "success" | "error" | "info" }[]>([]);

  // Payment/Review Modal States
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState<{ id: string | null; title: string | null; amount: number } | null>(null);

  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [ratingItem, setRatingItem] = useState<{ id: string; title: string; version: string } | null>(null);

  const [isBrokenLinkOpen, setIsBrokenLinkOpen] = useState(false);
  const [brokenLinkItem, setBrokenLinkItem] = useState<{ name: string; category: string } | null>(null);

  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);

  const showToast = (msg: string, type: "success" | "error" | "info" = "info") => {
    const toastId = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id: toastId, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 4000);
  };

  useEffect(() => {
    if (userProfile) {
      setFavorites(userProfile.favorites || {});
    } else {
      setFavorites({});
    }
  }, [userProfile]);

  useEffect(() => {
    if (!id) return;

    // 1. Fetch Product details
    const docRef = doc(firestore, "products", id);
    const unsubscribeProduct = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const { id: _id, ...data } = snapshot.data() as ResourceItem;
        setProduct({ ...data, id: snapshot.id });

        // Set Images slideshow array
        const list: string[] = [];
        if (data.ImageURL) list.push(data.ImageURL);
        if (data.extraImages && Array.isArray(data.extraImages)) {
          list.push(...data.extraImages);
        }
        setImages(list);
      } else {
        setProduct(null);
      }
      setLoading(false);
    });

    // 2. Fetch rating summaries
    const ratingsCol = collection(firestore, "ratings");
    const qRatings = query(ratingsCol, where("resourceId", "==", id));
    const unsubscribeRatings = onSnapshot(qRatings, (snapshot) => {
      if (!snapshot.empty) {
        let total = 0;
        const count = snapshot.size;
        const versionsMap: Record<string, { total: number; count: number }> = {};
        
        snapshot.forEach((docSnap) => {
          const ratingData = docSnap.data();
          const stars = Number(ratingData.stars || ratingData.rating || 5);
          total += stars;

          const rawVersion = ratingData.version || "Direct Download";
          const safeVName = rawVersion.replace(/[.#$\[\]]/g, "_");
          if (!versionsMap[safeVName]) {
            versionsMap[safeVName] = { total: 0, count: 0 };
          }
          versionsMap[safeVName].total += stars;
          versionsMap[safeVName].count += 1;
        });

        const versionsResult: Record<string, { average: number; count: number }> = {};
        for (const key in versionsMap) {
          versionsResult[key] = {
            average: versionsMap[key].total / versionsMap[key].count,
            count: versionsMap[key].count
          };
        }

        setRatingSummary({
          average: total / count,
          count: count,
          versions: versionsResult
        });
      } else {
        setRatingSummary(null);
      }
    });

    return () => {
      unsubscribeProduct();
      unsubscribeRatings();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Loading product detail details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center text-white text-center p-6">
        <span className="text-4xl mb-4">🛍️</span>
        <h2 className="text-xl font-bold mb-2">Resource Not Found</h2>
        <p className="text-xs text-gray-500 max-w-sm mb-6 leading-relaxed">
          The requested package could not be retrieved. It may have been unlisted or removed.
        </p>
        <Link href="/" className="bg-white/5 hover:bg-white/10 text-white font-bold text-xs px-6 py-2.5 rounded-full border border-white/10 transition-all">
          Browse Catalog Directory
        </Link>
      </div>
    );
  }

  const categoryMap: Record<string, string> = {
    adobeSoftware: "Adobe Software",
    plugins: "Plugins",
    scripts: "Scripts & Extensions",
    assets: "Asset Pack",
    courses: "Premium Course",
    utilities: "Utilities",
  };

  const displayCategory = product.Category ? categoryMap[product.Category] || product.Category : "Resource";

  // Calculate pricing values
  const priceVal = parseFloat(product.price as any) || 0;
  const priceUSDVal = parseFloat(product.priceUSD as any) || 0;
  
  // Versions
  const versionsList = product.Versions ? Object.values(product.Versions) : [];

  const activePrice = pricing.currency === "INR" ? priceVal : priceUSDVal;

  const handleToggleFavorite = async () => {
    if (!currentUser) {
      showToast("Please sign in to add favorites", "info");
      return;
    }

    const updatedFavs = { ...favorites };
    if (updatedFavs[product.id]) {
      delete updatedFavs[product.id];
      showToast("Removed from favorites", "info");
    } else {
      updatedFavs[product.id] = {
        title: product.Title || "Untitled",
        type: product.Category || "plugins",
        image: product.ImageURL || "/assets/SM.png",
      };
      showToast("Added to favorites!", "success");
    }

    setFavorites(updatedFavs);
    try {
      await updateDoc(doc(firestore, "users", currentUser.uid), {
        favorites: updatedFavs,
      });
    } catch (e) {
      console.error("Failed to sync favorites:", e);
    }
  };

  const handleDownload = async (version: any = null) => {
    if (!currentUser) {
      showToast("Sign in required to download packages", "info");
      router.push(`/auth?redirect=/products/${product.id}`);
      return;
    }

    const targetVariant = version || (product.Versions && product.Versions[0]);
    const versionName = targetVariant?.Name || "Latest";
    const rawLink = targetVariant?.Link || product.DownloadLink || "#";

    // Helper: open download link + log to downloadLogs
    const executeDownloadLink = async () => {
      const win = window.open(rawLink, "_blank");
      if (win) win.focus();

      // Log download details
      await addDoc(collection(firestore, "downloadLogs"), {
        uid: currentUser.uid,
        email: currentUser.email || "Anonymous",
        resourceId: product.id,
        resourceTitle: product.Title,
        versionName: versionName,
        timestamp: Timestamp.now(),
        ownerUid: product.ownerUid || product.vendorId || "platform",
      });

      const userDocRef = doc(firestore, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        lastDownload: {
          resourceTitle: product.Title,
          versionName: versionName,
          timestamp: Timestamp.now(),
        }
      });
    };

    // Helper: create a ₹0 transaction for free product acquisitions 
    // so it shows up in Creator Sales & Admin CRM
    const logFreeOrder = async () => {
      try {
        await addDoc(collection(firestore, "transactions"), {
          uid: currentUser.uid,
          email: currentUser.email || "N/A",
          userName: currentUser.displayName || "N/A",
          amount: 0,
          currency: "INR",
          itemId: product.id,
          productId: product.id,
          itemTitle: product.Title,
          paymentId: "FREE_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
          type: "individual",
          vendorId: product.vendorId || product.ownerUid || "platform",
          payoutAccountId: "",
          platformCommission: 0,
          creatorPayout: 0,
          timestamp: Timestamp.now(),
        });

        // Mark as free-downloaded so we don't double-log
        const userDocRef = doc(firestore, "users", currentUser.uid);
        await updateDoc(userDocRef, {
          [`freeDownloads.${product.id}`]: Timestamp.now(),
        });
      } catch (err: any) {
        console.error("Failed to log free order:", err);
      }
    };

    const isAdmin = userProfile?.role === "admin" || userProfile?.role === "sub-admin" || userProfile?.role === "creator";
    const isPaid = userProfile?.isPaid || !!userProfile?.purchased?.["PRO_BUNDLE"] || isAdmin;
    const alreadyPurchased = !!userProfile?.purchased?.[product.id];
    const alreadyFreeDownloaded = !!userProfile?.freeDownloads?.[product.id];

    // PAID PRODUCT: send to checkout if not purchased yet
    if (activePrice > 0) {
      if (!alreadyPurchased && !isAdmin) {
        setCheckoutItem({
          id: product.id,
          title: product.Title,
          amount: activePrice,
        });
        setIsCheckoutOpen(true);
        return;
      }
      // Already purchased or admin — just download
      await executeDownloadLink();
      return;
    }

    // FREE PRODUCT (activePrice === 0):
    // Log a ₹0 order if never logged before (for creator CRM + payouts)
    try {
      const q = query(
        collection(firestore, "transactions"),
        where("uid", "==", currentUser.uid),
        where("productId", "==", product.id)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        await logFreeOrder();
      }
    } catch (err) {
      console.error("Failed to check existing free transaction:", err);
    }

    // Admins/paid users skip the free-download limit
    if (isAdmin || isPaid) {
      await executeDownloadLink();
      return;
    }

    // Free download limit check for regular users
    const freeDownloads = userProfile?.freeDownloads || {};
    const downloadCount = Object.keys(freeDownloads).length;

    if (downloadCount <= 2) {
      await executeDownloadLink();
    } else {
      setIsLimitModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-gray-300 relative overflow-x-hidden selection:bg-brand-500/30 selection:text-white flex flex-col justify-between">
      {/* Background decorations */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-[10%] w-[40rem] h-[40rem] bg-indigo-900/5 rounded-full blur-[12rem]"></div>
        <div className="absolute bottom-0 right-[10%] w-[40rem] h-[40rem] bg-purple-900/5 rounded-full blur-[12rem]"></div>
      </div>
      
      {(() => {
        const isCreatorProduct = product?.isFlatCreatorProduct || (product?.ownerUid && product?.ownerUid !== "platform");
        return (
          <>

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
          <div className="flex items-center gap-4">
            <Link href="/" className="font-bold tracking-tighter text-white hover:scale-105 transition-all text-lg">
              Harsh<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Edits</span>
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-6 font-medium text-xs text-gray-400">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/faq" className="hover:text-white transition-colors">FAQ</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/" className="bg-white/5 hover:bg-white/10 text-white font-bold text-xs px-5 py-2 rounded-full border border-white/10 transition-all">
              Back to Hub
            </Link>
          </div>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="pt-28 pb-20 px-6 max-w-[1400px] mx-auto w-full relative z-10 flex-1 space-y-12">
        {/* Breadcrumb path */}
        <div className="flex items-center gap-2 text-xs text-gray-500 font-bold uppercase tracking-widest">
          <Link href="/" className="hover:text-white transition-colors">Catalog</Link>
          <span>/</span>
          <span className="text-gray-400">{displayCategory}</span>
          <span>/</span>
          <span className="text-white truncate">{product.Title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* LEFT: Slideshow & Gallery */}
          <div className="lg:col-span-7 space-y-6">
            <div className="aspect-video w-full rounded-[2.5rem] overflow-hidden border border-white/10 bg-dark-900 shadow-2xl relative">
              {images.length > 0 ? (
                <img
                  src={images[activeImageIndex]}
                  alt={product.Title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">No image preview</div>
              )}
            </div>

            {/* Thumbnail selector */}
            {images.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2 select-none scrollbar-hide">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-24 aspect-video rounded-xl overflow-hidden border shrink-0 transition-all ${
                      activeImageIndex === idx ? "border-indigo-500 scale-105" : "border-white/10 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Showcase Video Embed */}
            {product.videoUrl && (
              <div className="space-y-4 border-t border-white/5 pt-6">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Video Showcase Demo</h4>
                <div className="aspect-video w-full rounded-[2rem] overflow-hidden border border-white/5 bg-black">
                  <iframe
                    src={product.videoUrl.replace("watch?v=", "embed/")}
                    title="Product Trailer Showcase"
                    className="w-full h-full border-none"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Price card & Checkout actions */}
          <div className="lg:col-span-5 space-y-6 bg-black/40 border border-white/5 p-6 md:p-8 rounded-[2.5rem] shadow-2xl backdrop-blur-xl">
            <div>
              <span className="bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-md border border-indigo-500/20">
                {displayCategory}
              </span>
              <h1 className="text-3xl md:text-4xl font-black text-white mt-4 tracking-tight leading-tight">
                {product.Title}
              </h1>

              {/* Rating stars review summary */}
              {ratingSummary && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex text-yellow-500 gap-0.5">
                    {Array(5)
                      .fill(0)
                      .map((_, i) => (
                        <i
                          key={i}
                          className={`${
                            i < Math.round(ratingSummary.average || 0) ? "fa-solid" : "fa-regular"
                          } fa-star text-[10px]`}
                        ></i>
                      ))}
                  </div>
                  <span className="text-yellow-400 font-bold text-xs">
                    {ratingSummary.average?.toFixed(1)}
                  </span>
                  <span className="text-gray-500 text-xs">({ratingSummary.count} reviews)</span>
                </div>
              )}
            </div>

            {/* Price Tag Details */}
            {isCreatorProduct && activePrice > 0 && (
              <div className="border-t border-white/5 pt-6 space-y-4">
                <div className="flex items-baseline gap-4">
                  <span className="text-4xl font-black text-emerald-400">
                    {pricing.currency === "USD" ? `$${activePrice.toFixed(2)}` : `₹${activePrice}`}
                  </span>
                  {product.isPro && (
                    <span className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-[9px] font-black px-2.5 py-1 rounded shadow">
                      💎 ULTIMATE PRO
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Description Details (Collapsible) */}
            <details className="mb-6 border-b border-white/10 pb-6" open>
              <summary className="font-bold text-white cursor-pointer outline-none text-lg">
                Description
              </summary>
              <p className="text-sm md:text-base text-gray-300 leading-relaxed mt-4 whitespace-pre-wrap">
                {product.Description || "Exclusive premium resource curated for high-quality editing workflows."}
              </p>
            </details>

            {/* Versions (Downloads) */}
            <div className="pt-4 mb-8">
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">
                {versionsList.length > 0
                  ? `${versionsList.length} Version${versionsList.length > 1 ? "s" : ""} Available`
                  : "Downloads"}
              </h3>

              {versionsList.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {versionsList.map((version, index) => {
                    const safeVName = version.Name.replace(/[.#$\[\]]/g, "_");
                    const verRating = ratingSummary?.versions?.[safeVName];

                    return (
                      <div
                        key={index}
                        className="group/vcard relative p-1 rounded-[2rem] bg-gradient-to-br from-white/10 to-transparent hover:from-indigo-500/30 transition-all duration-500 shadow-xl overflow-hidden"
                      >
                        <div className="relative z-10 p-6 rounded-[1.9rem] bg-[#0A0A0F] h-full flex flex-col">
                          <div className="flex justify-between items-start mb-4">
                            <div className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-widest border border-indigo-500/20">
                              REV-{index + 1}
                            </div>
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-500 group-hover/vcard:text-indigo-400 transition-colors">
                              <i className="fa-solid fa-cloud-arrow-down text-xs"></i>
                            </div>
                          </div>

                          <div className="mb-5">
                            <h5 className="text-white font-black text-xl mb-1.5 leading-tight group-hover/vcard:text-indigo-200 transition-colors">
                              {version.Name}
                            </h5>
                            <p className="text-gray-500 text-[11px] leading-relaxed">
                              {version.Description || "Official High-Speed Cloud Mirror"}
                            </p>

                            {/* Version Rating */}
                            <div className="mt-2 flex justify-between items-center">
                              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-500/10 rounded-md border border-yellow-500/20 w-fit">
                                <i className="fa-solid fa-star text-[8px] text-yellow-400"></i>
                                <span className="text-yellow-400 font-bold text-[9px]">
                                  {verRating?.average ? verRating.average.toFixed(1) : "0.0"}
                                </span>
                                <span className="text-gray-500 text-[9px]">
                                  ({verRating?.count || 0} reviews)
                                </span>
                              </div>
                              {isCreatorProduct && (
                                <span className="text-xs font-black text-emerald-400">
                                  {pricing.currency === "USD" ? `$${(version.priceUSD || version.price || priceUSDVal).toFixed(2)}` : `₹${(version.inrPrice || version.price || priceVal)}`}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => handleDownload(version)}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-4 rounded-[1.2rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-3 transform group-hover/vcard:scale-[1.02] active:scale-95"
                          >
                            <i className="fa-solid fa-bolt-lightning text-[10px]"></i>
                            {!isCreatorProduct
                              ? "UNLOCK & DOWNLOAD"
                              : ((!version.price && !product?.price) || Number(version.price || product?.price || 0) === 0) 
                              ? "Download for Free"
                              : (product?.id && userProfile?.purchased?.[product.id]) || userProfile?.role === "admin" || userProfile?.role === "creator"
                              ? "Download"
                              : "Buy Now"}
                          </button>
                        </div>
                        <div className="absolute inset-0 bg-indigo-500/20 blur-2xl opacity-0 group-hover/vcard:opacity-100 transition-opacity pointer-events-none"></div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => handleDownload()}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black rounded-2xl flex justify-center items-center gap-3 transition-all duration-300 hover:scale-[1.02] active:scale-95 text-[10px] shadow-[0_10px_30px_rgba(255,255,255,0.15)] uppercase tracking-widest"
                  >
                    <i className="fa-solid fa-bolt-lightning text-[10px]"></i>
                    {!isCreatorProduct
                      ? "UNLOCK & DOWNLOAD"
                      : (!product?.price || Number(product?.price) === 0) 
                      ? "Download for Free"
                      : (product?.id && userProfile?.purchased?.[product.id]) || userProfile?.role === "admin" || userProfile?.role === "creator"
                      ? "Download"
                      : "Buy Now"}
                  </button>
                </div>
              )}
            </div>

            {/* Action buttons footer */}
            <div className="pt-2">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleToggleFavorite}
                  className={`py-3 rounded-xl border text-xs font-bold flex justify-center items-center gap-2 transition-all ${
                    favorites[product.id]
                      ? "bg-red-500/10 border-red-500/30 text-red-400"
                      : "bg-white/5 border-white/5 text-gray-400 hover:text-white"
                  }`}
                >
                  <i className="fa-solid fa-heart"></i>
                  <span>Favorite</span>
                </button>
                <button
                  onClick={() => setIsBrokenLinkOpen(true)}
                  className="py-3 bg-white/5 border border-white/5 hover:border-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-bold flex justify-center items-center gap-2 transition-all"
                >
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <span>Report Bug</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM: Included presets list */}
        {product.presetList && product.presetList.length > 0 && (
          <div className="pt-12 border-t border-white/5">
            <div className="bg-white/2 border border-white/5 p-6 md:p-10 rounded-[2.5rem] space-y-6 max-w-4xl mx-auto backdrop-blur-sm">
              <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-widest border-b border-white/5 pb-4 text-center">What's Included in this package</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm md:text-base text-gray-300 pt-4">
                {product.presetList.map((preset, idx) => (
                  <li key={idx} className="flex items-start gap-3 bg-[#0A0A0F] p-4 rounded-xl border border-white/5">
                    <span className="text-indigo-400 mt-0.5">✓</span>
                    <span>{preset}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Features Zig-Zag Layout */}
        {product.features && product.features.length > 0 && (
          <div className="pt-24 pb-12 max-w-6xl mx-auto border-t border-white/5 mt-8 space-y-32">
            {product.features.map((feature, idx) => {
              const isEven = idx % 2 === 0;
              return (
                <div
                  key={idx}
                  className={`grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24 items-center animate-in fade-in slide-in-from-bottom-10 duration-1000 ${
                    isEven ? "" : "md:[direction:rtl]"
                  }`}
                >
                  <div className="relative aspect-video rounded-[2rem] overflow-hidden shadow-2xl bg-[#0a0a0a] border border-white/5 md:[direction:ltr]">
                    {feature.imageUrl ? (
                      <img src={feature.imageUrl} alt={feature.title} className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">No Showcase Image</div>
                    )}
                  </div>
                  <div className="flex flex-col gap-6 md:[direction:ltr]">
                    <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">{feature.title}</h2>
                    <p className="text-base lg:text-lg text-gray-400 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-gray-600 relative z-10 w-full">
        <p>&copy; {new Date().getFullYear()} Harsh Edits. All rights reserved.</p>
      </footer>

      {/* Checkout Modal */}
      {isCheckoutOpen && checkoutItem && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          itemId={checkoutItem.id}
          itemTitle={checkoutItem.title}
          amount={checkoutItem.amount}
          currency={pricing.currency}
          rzpKey={pricing.rzpKey}
          onSuccess={(paymentId) => {
            showToast("Payment Successful! Access Unlocked.", "success");
            setIsCheckoutOpen(false);
          }}
          onAlert={(msg, title, type) => {
            showToast(msg, type === "error" ? "error" : "info");
          }}
        />
      )}

      {/* Download Limit Modal */}
      <DownloadLimitModal
        isOpen={isLimitModalOpen}
        onClose={() => setIsLimitModalOpen(false)}
        onUpgrade={() => {
          setCheckoutItem({
            id: null,
            title: "Pro Membership",
            amount: pricing.activePrice,
          });
          setIsCheckoutOpen(true);
        }}
      />

      {ratingItem && (
        <RatingModal
          isOpen={isRatingOpen}
          onClose={() => {
            setIsRatingOpen(false);
            setRatingItem(null);
          }}
          itemId={ratingItem.id}
          itemTitle={ratingItem.title}
          versionName={ratingItem.version}
          onToast={showToast}
        />
      )}

      {brokenLinkItem && (
        <BrokenLinkModal
          isOpen={isBrokenLinkOpen}
          onClose={() => {
            setIsBrokenLinkOpen(false);
            setBrokenLinkItem(null);
          }}
          resourceName={brokenLinkItem.name}
          category={brokenLinkItem.category}
          onToast={showToast}
        />
      )}
          </>
        );
      })()}
    </div>
  );
}
