"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, updateDoc, addDoc, Timestamp } from "firebase/firestore";
import { firestore } from "../../../utils/firebase";
import { useAuth } from "../../../context/AuthContext";
import { useCurrency } from "../../../hooks/useCurrency";
import { CatalogCard, ResourceItem } from "../../../components/CatalogCard";
import { ProductDrawer } from "../../../components/ProductDrawer";
import { CheckoutModal } from "../../../components/CheckoutModal";
import { RatingModal } from "../../../components/RatingModal";
import { BrokenLinkModal } from "../../../components/BrokenLinkModal";
import Link from "next/link";

interface Creator {
  uid: string;
  name?: string;
  email?: string;
  creatorDetails?: {
    bio?: string;
    displayName?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    supportEmail?: string;
  };
  storefront?: {
    themeColor?: string;
    bannerUrl?: string;
    bio?: string;
    socialLinks?: {
      twitter?: string;
      instagram?: string;
      youtube?: string;
    };
  };
}

export default function CreatorStorefront() {
  const params = useParams();
  const uid = params.uid as string;
  const router = useRouter();

  const { currentUser, userProfile } = useAuth();
  const pricing = useCurrency();

  const [creator, setCreator] = useState<Creator | null>(null);
  const [products, setProducts] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [favorites, setFavorites] = useState<Record<string, any>>({});
  const [toasts, setToasts] = useState<{ id: string; msg: string; type: "success" | "error" | "info" }[]>([]);

  // Drawer / Modal States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState<{ id: string | null; title: string | null; amount: number } | null>(null);

  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [ratingItem, setRatingItem] = useState<{ id: string; title: string; version: string } | null>(null);

  const [isBrokenLinkOpen, setIsBrokenLinkOpen] = useState(false);
  const [brokenLinkItem, setBrokenLinkItem] = useState<{ name: string; category: string } | null>(null);

  const showToast = (msg: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    if (!uid) return;

    const loadCreatorAndProducts = async () => {
      setLoading(true);
      try {
        // 1. Fetch Creator Profile
        const creatorSnap = await getDoc(doc(firestore, "users", uid));
        if (creatorSnap.exists()) {
          const cData = creatorSnap.data();
          setCreator({
            uid: creatorSnap.id,
            ...cData,
          });
        }

        // 2. Fetch Creator's Products
        const q = query(
          collection(firestore, "products"),
          where("ownerUid", "==", uid),
          where("status", "==", "approved")
        );
        const pSnap = await getDocs(q);
        const list: ResourceItem[] = [];
        pSnap.forEach((docSnap) => {
          list.push({
            id: docSnap.id,
            ...docSnap.data(),
          } as ResourceItem);
        });
        setProducts(list);
      } catch (err) {
        console.error("Error loading creator store:", err);
      } finally {
        setLoading(false);
      }
    };

    loadCreatorAndProducts();
  }, [uid]);

  // Fetch Favorites if logged in
  useEffect(() => {
    if (userProfile) {
      setFavorites(userProfile.favorites || {});
    } else {
      setFavorites({});
    }
  }, [userProfile]);

  const handleToggleFavorite = async (itemId: string, item: any, category: string) => {
    if (!currentUser) {
      showToast("Please sign in to add favorites", "info");
      return;
    }

    const newFavs = { ...favorites };
    if (newFavs[itemId]) {
        delete newFavs[itemId];
        showToast("Removed from favorites", "info");
    } else {
        newFavs[itemId] = {
          title: item.Title || "Untitled",
          type: category,
          image: item.ImageURL || "/assets/SM.png",
        };
        showToast("Added to favorites!", "success");
    }

    setFavorites(newFavs);
    try {
      await updateDoc(doc(firestore, "users", currentUser.uid), {
        favorites: newFavs,
      });
    } catch (e) {
      console.error("Failed to sync favorites:", e);
    }
  };

  const handleItemClick = (item: any) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const handleDownload = async (version: any | null) => {
    if (!currentUser) {
      showToast("Sign in required to download packages", "info");
      router.push("/auth");
      return;
    }

    const title = selectedItem?.Title || "Resource";
    const versionName = version?.Name || "Latest";
    const rawLink = version?.Link || selectedItem?.DownloadLink || "";

    const priceVal = parseFloat(selectedItem?.price as string) || 0;
    const priceUSDVal = parseFloat(selectedItem?.priceUSD as string) || 0;
    const actualPrice = pricing.currency === "INR" ? priceVal : priceUSDVal;

    const executeDownloadLink = async () => {
      const win = window.open(rawLink, "_blank");
      if (win) win.focus();

      // Log download details
      const logData = {
        uid: currentUser.uid,
        email: currentUser.email || "Anonymous",
        resourceId: selectedItem?.id || "unknown",
        resourceTitle: title,
        versionName: versionName,
        timestamp: Timestamp.now(),
        ownerUid: selectedItem?.ownerUid || selectedItem?.vendorId || "platform",
      };

      await addDoc(collection(firestore, "downloadLogs"), logData);

      const userDocRef = doc(firestore, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        lastDownload: {
          resourceTitle: title,
          versionName: versionName,
          timestamp: Timestamp.now(),
        }
      });
    };

    const isAdmin = userProfile?.role === "admin" || userProfile?.role === "sub-admin" || userProfile?.role === "creator";
    const isPaid = userProfile?.isPaid || isAdmin;

    if (actualPrice > 0 && selectedItem) {
      const hasPurchased = userProfile?.purchased?.[selectedItem.id];
      if (!hasPurchased && !isAdmin) {
        setCheckoutItem({
          id: selectedItem.id,
          title: title,
          amount: actualPrice,
        });
        setIsCheckoutOpen(true);
        return;
      }
    }

    // Log a ₹0 order for free products so it appears in Creator Sales & CRM
    if (actualPrice === 0 && selectedItem) {
      try {
        const q = query(
          collection(firestore, "transactions"),
          where("uid", "==", currentUser.uid),
          where("productId", "==", selectedItem.id)
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          await addDoc(collection(firestore, "transactions"), {
            uid: currentUser.uid,
            email: currentUser.email || "N/A",
            userName: currentUser.displayName || "N/A",
            amount: 0,
            currency: pricing.currency,
            itemId: selectedItem.id,
            productId: selectedItem.id,
            itemTitle: selectedItem.Title,
            paymentId: "FREE_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
            type: "individual",
            vendorId: selectedItem.ownerUid || selectedItem.vendorId || "platform",
            payoutAccountId: "",
            platformCommission: 0,
            creatorPayout: 0,
            timestamp: Timestamp.now(),
          });
        }
      } catch (err) {
        console.error("Failed to check or log existing free transaction:", err);
      }
    }

    if (isAdmin || isPaid) {
      await executeDownloadLink();
      return;
    }

    // Unlimited free downloads for Creator Storefront
    if (selectedItem && !userProfile?.freeDownloads?.[selectedItem.id]) {
      const userDocRef = doc(firestore, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        [`freeDownloads.${selectedItem.id}`]: Timestamp.now()
      });
    }
    await executeDownloadLink();
  };

  const categories = [
    { id: "all", label: "All Items" },
    { id: "adobeSoftware", label: "Adobe Software" },
    { id: "plugins", label: "Plugins" },
    { id: "scripts", label: "Scripts & Extensions" },
    { id: "assets", label: "Assets" },
    { id: "utilities", label: "Utilities" },
    { id: "courses", label: "Courses" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Loading storefront listings...</p>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center text-white p-6 text-center">
        <span className="text-4xl mb-4">🏪</span>
        <h2 className="text-xl font-bold tracking-tight mb-2">Profile Not Found</h2>
        <p className="text-xs text-gray-500 max-w-sm mb-6 leading-relaxed">
          The requested creator profile does not exist or has not been activated.
        </p>
        <Link href="/creators" className="bg-white/5 hover:bg-white/10 text-white font-bold text-xs px-6 py-2.5 rounded-full border border-white/10 transition-all">
          View Creators Directory
        </Link>
      </div>
    );
  }

  const details = creator.creatorDetails || {};
  const displayName = details.displayName || creator.name || "Anonymous Creator";
  const bio = details.bio || "Certified SoftwhereHub merchant partner.";
  const avatar = details.avatarUrl || "";
  const banner = details.bannerUrl || "";

  const storefront = creator.storefront || {};
  const themeColor = storefront.themeColor || "#4f46e5"; // Default Indigo
  const themeStyle = { "--brand": themeColor } as React.CSSProperties;

  return (
    <div style={themeStyle} className="min-h-screen bg-[#050508] text-gray-300 relative overflow-hidden selection:bg-[var(--brand)] selection:text-white flex flex-col justify-between">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-[10%] w-[40rem] h-[40rem] rounded-full blur-[12rem] opacity-20" style={{ backgroundColor: themeColor }}></div>
        <div className="absolute bottom-0 right-[10%] w-[40rem] h-[40rem] rounded-full blur-[12rem] opacity-10" style={{ backgroundColor: themeColor }}></div>
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

      {/* Content Viewport */}
      <main className="pt-28 pb-20 px-6 max-w-[1400px] mx-auto w-full relative z-10 flex-1 space-y-12">
        {/* Profile Card Hero */}
        <div className="glass-card rounded-[2.5rem] overflow-hidden bg-[#0A0A0F]/80 border border-white/5 shadow-2xl relative">
          {storefront.bannerUrl || banner ? (
            <div className="w-full h-44 md:h-64 overflow-hidden relative">
              <img src={storefront.bannerUrl || banner} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/50 to-transparent"></div>
            </div>
          ) : (
            <div className="w-full h-44 border-b border-white/5 opacity-30" style={{ background: `linear-gradient(to right, #0A0A0F, ${themeColor})` }}></div>
          )}

          <div className="p-6 md:p-10 flex flex-col md:flex-row items-center md:items-start gap-8 -mt-16 md:-mt-24 relative z-10 border-b border-white/5">
            {/* Avatar image container */}
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-[2rem] flex items-center justify-center font-bold text-white shadow-2xl overflow-hidden shrink-0 border-4 border-[#07070a]" style={{ backgroundColor: themeColor }}>
              {avatar ? (
                <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl md:text-5xl">{displayName[0].toUpperCase()}</span>
              )}
            </div>

            {/* Info details */}
            <div className="flex-1 text-center md:text-left space-y-3 mt-4 md:mt-24">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight">{displayName}</h2>
                <span className="text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-inner border" style={{ backgroundColor: `${themeColor}20`, borderColor: `${themeColor}40`, color: themeColor }}>
                  ✓ Verified Creator
                </span>
              </div>
              <p className="text-sm md:text-base text-gray-400 leading-relaxed font-light max-w-3xl">{storefront.bio || bio}</p>
              
              {/* Social Links */}
              {storefront.socialLinks && (
                <div className="flex items-center justify-center md:justify-start gap-4 pt-2">
                  {storefront.socialLinks.twitter && (
                    <a href={storefront.socialLinks.twitter} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white transition-colors">
                      <i className="fa-brands fa-twitter text-lg"></i>
                    </a>
                  )}
                  {storefront.socialLinks.instagram && (
                    <a href={storefront.socialLinks.instagram} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white transition-colors">
                      <i className="fa-brands fa-instagram text-lg"></i>
                    </a>
                  )}
                  {storefront.socialLinks.youtube && (
                    <a href={storefront.socialLinks.youtube} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white transition-colors">
                      <i className="fa-brands fa-youtube text-lg"></i>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Dashboard metrics widgets */}
            <div className="flex gap-4 md:mt-24 w-full md:w-auto justify-center">
              <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-center shrink-0">
                <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider block">Listings</span>
                <span className="text-lg font-black text-white mt-1 block">{products.length}</span>
              </div>
              {details.supportEmail && (
                <a
                  href={`mailto:${details.supportEmail}`}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl px-5 py-3 text-center flex flex-col justify-center transition-all cursor-pointer"
                >
                  <span className="text-[10px] uppercase font-black tracking-wider block text-gray-400">Support</span>
                  <span className="text-xs font-bold mt-1 block" style={{ color: themeColor }}>Contact Shop</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Removed Categories Bar */}

        {/* Listings Grid */}
        <div className="space-y-6">
          <h3 className="text-base font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <span>🛍️</span> Product Collections ({products.length})
          </h3>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((p) => (
                <CatalogCard
                  key={p.id}
                  item={p}
                  collectionName={(p as any).Category || "plugins"}
                  currency={pricing.currency}
                  isFavorite={!!favorites[p.id]}
                  onToggleFavorite={() => handleToggleFavorite(p.id, p, (p as any).Category || "plugins")}
                  onClick={() => handleItemClick(p)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-24 text-gray-500 glass-card border-dashed border-white/10 rounded-[2rem] bg-white/2">
              <span className="text-4xl block mb-2">🛍️</span>
              <p className="text-xs font-bold uppercase tracking-wider">No matching assets found.</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-gray-600 relative z-10 w-full">
        <p>&copy; {new Date().getFullYear()} Harsh Edits. All rights reserved.</p>
      </footer>

      {/* Drawer and Checkout Components */}
      {selectedItem && (
        <ProductDrawer
          isOpen={drawerOpen}
          item={selectedItem}
          collectionName={selectedItem.Category || "plugins"}
          onClose={() => setDrawerOpen(false)}
          currency={pricing.currency}
          onDownload={handleDownload}
          onShowSubItems={() => {}}
          onToast={showToast}
        />
      )}

      {checkoutItem && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => {
            setIsCheckoutOpen(false);
            setCheckoutItem(null);
          }}
          itemId={checkoutItem.id}
          itemTitle={checkoutItem.title}
          amount={checkoutItem.amount}
          currency={pricing.currency}
          rzpKey={pricing.rzpKey || ""}
          onSuccess={() => {
            showToast("Transaction Successful!", "success");
            setIsCheckoutOpen(false);
            setCheckoutItem(null);
          }}
          onAlert={(msg, title, type) => {
            showToast(msg, type === "error" ? "error" : "info");
          }}
        />
      )}

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
    </div>
  );
}
