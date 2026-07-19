"use client";

import React, { useEffect, useState } from "react";
import { doc, collection, onSnapshot, getDoc, getDocs, updateDoc, setDoc, addDoc, query, where, Timestamp } from "firebase/firestore";
import { firestore } from "../utils/firebase";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../hooks/useCurrency";
import { Sidebar } from "../components/Sidebar";
import { Hero } from "../components/Hero";
import { BannerCarousel } from "../components/BannerCarousel";
import { CatalogGrid } from "../components/CatalogGrid";
import { ProductDrawer, ResourceItem } from "../components/ProductDrawer";
import { CheckoutModal } from "../components/CheckoutModal";
import DownloadLimitModal from "../components/DownloadLimitModal";
import { RatingModal } from "../components/RatingModal";
import { BrokenLinkModal } from "../components/BrokenLinkModal";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Toast {
  id: string;
  msg: string;
  type: "success" | "error" | "info";
}

export default function Dashboard() {
  const { currentUser, userProfile, logout } = useAuth();
  const pricing = useCurrency();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("software");
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<Record<string, any>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showPreloader, setShowPreloader] = useState(true);

  // Modal / Drawer States
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ResourceItem | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState<{ id: string | null; title: string | null; amount: number } | null>(null);

  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [ratingItem, setRatingItem] = useState<{ id: string; title: string; version: string } | null>(null);

  const [isBrokenLinkOpen, setIsBrokenLinkOpen] = useState(false);
  const [brokenLinkItem, setBrokenLinkItem] = useState<{ name: string; category: string } | null>(null);

  // App Data
  const [appData, setAppData] = useState<any>({
    adobeSoftware: [],
    plugins: [],
    scripts: [],
    assets: [],
    utilities: [],
    courses: [],
    banners: [],
    carouselSettings: { autoSlide: true, slideSpeed: 5 },
    sectionNames: {},
    siteText: {},
  });

  // Preloader fade out
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPreloader(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Fetch App Data from Firestore
  useEffect(() => {
    // 1. Listen to all approved products
    const productsQuery = query(
      collection(firestore, "products"),
      where("status", "==", "approved")
    );
    const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      const products: Record<string, any[]> = {
        adobeSoftware: [],
        plugins: [],
        scripts: [],
        assets: [],
        utilities: [],
        courses: [],
        simplePluginsList: [],
        creator_product: [],
      };
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const cat = data.Category || "plugins";
        if (products[cat]) {
          products[cat].push({ id: docSnap.id, ...data });
        }
      });
      setAppData((prev: any) => ({
        ...prev,
        ...products,
      }));
    });

    // 2. Listen to banners
    const unsubscribeBanners = onSnapshot(collection(firestore, "banners"), (snapshot) => {
      const bannersList: any[] = [];
      snapshot.forEach((docSnap) => {
        bannersList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setAppData((prev: any) => ({ ...prev, banners: bannersList }));
    });

    // 3. Listen to global configuration settings
    const configDocRef = doc(firestore, "settings", "globalConfig");
    const unsubscribeConfig = onSnapshot(configDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setAppData((prev: any) => ({
          ...prev,
          carouselSettings: data?.carousel || { autoSlide: true, slideSpeed: 5 },
          sectionNames: data?.sectionNames || {},
          siteText: data?.siteText || {},
        }));
      }
    });

    return () => {
      unsubscribeProducts();
      unsubscribeBanners();
      unsubscribeConfig();
    };
  }, []);

  // Fetch Favorites if logged in (now reads from userProfile state)
  useEffect(() => {
    if (!currentUser || !userProfile) {
      setFavorites({});
      return;
    }
    setFavorites(userProfile.favorites || {});
  }, [currentUser, userProfile]);

  const showToast = (msg: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleToggleFavorite = async (itemId: string, itemData: any, colName: string) => {
    if (!currentUser) {
      showToast("Please sign in to save favorites.", "info");
      return;
    }

    const userDocRef = doc(firestore, "users", currentUser.uid);
    const updatedFavorites = { ...favorites };
    if (favorites[itemId]) {
      delete updatedFavorites[itemId];
      await updateDoc(userDocRef, { favorites: updatedFavorites });
      showToast("Removed from Favorites", "info");
    } else {
      updatedFavorites[itemId] = {
        id: itemId,
        title: itemData.Title || itemData.title || "Unknown",
        image: itemData.ImageURL || itemData.image || "",
        downloadLink: itemData.DownloadLink || itemData.downloadLink || "#",
        type: colName,
        savedAt: Date.now(),
      };
      await updateDoc(userDocRef, { favorites: updatedFavorites });
      showToast("Added to Favorites", "success");
    }
  };

  const handleItemClick = (collectionName: string, itemId: string) => {
    // Navigate to the dedicated product details page
    router.push(`/products/${itemId}`);
  };

  const handleDownload = async (version: any | null) => {
    if (!currentUser) {
      showToast("Please log in to download resources.", "info");
      return;
    }

    if (userProfile?.isBanned) {
      showToast("Your account is currently banned.", "error");
      return;
    }

    // Anti-scraping protection
    const recentThreshold = Date.now() - 30 * 60 * 1000;
    const downloadLogsQuery = query(
      collection(firestore, "downloadLogs"),
      where("uid", "==", currentUser.uid),
      where("timestamp", ">=", Timestamp.fromMillis(recentThreshold))
    );
    const downloadLogsSnap = await getDocs(downloadLogsQuery);
    
    if (downloadLogsSnap.size >= 10) {
      const userDocRef = doc(firestore, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        isBanned: true,
        banReason: "Automated: Excessive bulk download activity (Scraping Protection).",
      });
      showToast("Your account has been banned due to suspension of scraping.", "error");
      return;
    }
    if (downloadLogsSnap.size >= 5) {
      showToast("Slow down! Too many downloads in a short period.", "info");
    }

    const title = selectedItem?.Title || "Resource";
    const versionName = version?.Name || "Direct Download";
    const rawLink = version?.Link || selectedItem?.ImageURL || "#"; // Fallback download link
    const isPro = selectedItem?.isPro || false;
    const priceVal = parseFloat(selectedItem?.price as string) || 0;
    const priceUSDVal = parseFloat(selectedItem?.priceUSD as string) || 0;
    const actualPrice = pricing.currency === "INR" ? priceVal : priceUSDVal;

    const executeDownloadLink = async () => {
      // Proceed with actual download
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

      // Trigger rating modal check
      setTimeout(async () => {
        if (currentUser && selectedItem) {
          const ratingsQuery = query(
            collection(firestore, "ratings"),
            where("uid", "==", currentUser.uid),
            where("resourceId", "==", selectedItem.id),
            where("version", "==", versionName)
          );
          const rSnap = await getDocs(ratingsQuery);
          if (rSnap.empty) {
            setRatingItem({
              id: selectedItem.id,
              title: title,
              version: versionName,
            });
            setIsRatingOpen(true);
          }
        }
      }, 1500);
    };

    // Premium logic check
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

    if (isAdmin || isPaid) {
      await executeDownloadLink();
      return;
    }

    // Free tier download limits
    const freeDownloads = userProfile?.freeDownloads || {};
    const downloadCount = Object.keys(freeDownloads).length;

    if (selectedItem && freeDownloads[selectedItem.id]) {
      await executeDownloadLink();
      return;
    }

    if (downloadCount < 2) {
      if (selectedItem) {
        const userDocRef = doc(firestore, "users", currentUser.uid);
        await updateDoc(userDocRef, {
          [`freeDownloads.${selectedItem.id}`]: Timestamp.now()
        });
      }
      await executeDownloadLink();
    } else {
      // Limit reached, open limit modal
      setIsLimitModalOpen(true);
    }
  };

  const handleCloseDetail = () => {
    setDrawerOpen(false);
    setSelectedItem(null);
    setSelectedCollection(null);
  };

  return (
    <>
      {/* Preloader */}
      {showPreloader && (
        <div id="preloader">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-white mb-6 animate-pulse">
            Harsh<span className="text-brand-500">Edits</span>
          </h1>
          <img
            src="/load.gif"
            alt="Loading..."
            className="w-24 md:w-32 object-contain mb-6 rounded-full shadow-lg shadow-brand-500/20"
          />
          <p className="text-sm font-semibold tracking-widest uppercase text-brand-500 animate-pulse">
            Loading...
          </p>
        </div>
      )}

      {/* Main Layout */}
      <div className="app-layout">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenProfile={() => setIsProfileOpen(true)}
          allProducts={[
            ...(appData.adobeSoftware || []),
            ...(appData.plugins || []),
            ...(appData.scripts || []),
            ...(appData.assets || []),
            ...(appData.utilities || []),
            ...(appData.courses || []),
            ...(appData.creator_product || [])
          ]}
        />

        {/* Main Panel */}
        <div className="main-viewport pt-20 lg:pt-8">
          {/* Top Controls bar */}
          <div className="flex items-center justify-end gap-4 mb-12">
            {!userProfile?.isPaid && userProfile?.role !== "admin" && userProfile?.role !== "sub-admin" && userProfile?.role !== "creator" ? (
              <button
                onClick={() => {
                  setCheckoutItem({
                    id: null,
                    title: "Pro Membership",
                    amount: pricing.activePrice,
                  });
                  setIsCheckoutOpen(true);
                }}
                className="premium-button font-bold px-6 py-2 rounded-xl transition-all shadow-lg text-xs relative overflow-hidden group ml-auto"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <i className="fa-solid fa-crown text-[10px]"></i>
                  Get Pro Access
                </span>
              </button>
            ) : (
              <button className="bg-white/5 border border-yellow-500/30 text-yellow-400 font-bold px-6 py-2 rounded-xl text-xs flex items-center gap-2 cursor-default ml-auto">
                <i className="fa-solid fa-crown text-[10px]"></i>
                Pro Member
              </button>
            )}
          </div>

          {/* Hero Section */}
          {activeTab !== "favorites" && activeTab !== "request-resource" && (
            <>
              <Hero
                onExploreClick={() => document.getElementById("search-input")?.focus()}
                onPremiumClick={() => {
                  setCheckoutItem({
                    id: null,
                    title: "Pro Membership",
                    amount: pricing.activePrice,
                  });
                  setIsCheckoutOpen(true);
                }}
              />
              <BannerCarousel
                banners={appData.banners}
                settings={appData.carouselSettings}
              />
            </>
          )}

          {/* Favorites view */}
          {activeTab === "favorites" && (
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-8">My Favorites</h2>
              {Object.keys(favorites).length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                    <i className="fa-solid fa-heart-crack text-gray-600 text-xl"></i>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">No Favorites Added</h3>
                  <p className="text-xs text-gray-500 mb-6">Select heart icons on products to add.</p>
                  <button
                    onClick={() => setActiveTab("software")}
                    className="accent-gradient-btn text-xs px-6 py-2.5 rounded-full font-bold"
                  >
                    Browse Catalog
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {Object.values(favorites).map((fav: any) => {
                    const itemData = {
                      id: fav.id,
                      Title: fav.title,
                      ImageURL: fav.image,
                      DownloadLink: fav.downloadLink,
                    };
                    return (
                      <CatalogGrid
                        key={fav.id}
                        data={{
                          adobeSoftware: fav.type === "adobeSoftware" ? [itemData] : [],
                          plugins: fav.type === "plugins" ? [itemData] : [],
                          scripts: fav.type === "scripts" ? [itemData] : [],
                          assets: fav.type === "assets" ? [itemData] : [],
                          utilities: fav.type === "utilities" ? [itemData] : [],
                          courses: fav.type === "courses" ? [itemData] : [],
                        }}
                        searchQuery={searchQuery}
                        currency={pricing.currency}
                        favorites={{ [fav.id]: true }}
                        onToggleFavorite={() => handleToggleFavorite(fav.id, itemData, fav.type)}
                        onItemClick={() => handleItemClick(fav.type, fav.id)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Request File tab */}
          {activeTab === "request-resource" && (
            <section className="scroll-mt-24 max-w-xl mx-auto">
              <div className="bg-dark-800 border border-white/5 rounded-3xl p-6 md:p-10">
                <h3 className="text-xl font-bold text-center mb-1 text-white">Missing a Resource?</h3>
                <p className="text-xs text-gray-500 text-center max-w-sm mx-auto mb-6">
                  Let us know what files you need, and we will upload them shortly.
                </p>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.target as any;
                    const userName = form["user-name"].value;
                    const request = form["user-request"].value;

                    try {
                      await addDoc(collection(firestore, "userMessages"), {
                        name: userName,
                        message: request,
                        email: currentUser?.email || "Anonymous",
                        type: "Request",
                        timestamp: Timestamp.now(),
                        status: "pending"
                      });
                      showToast("Request submitted successfully!", "success");
                      form.reset();
                    } catch (err) {
                      showToast("Failed to submit request.", "error");
                    }
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 mb-1">Your Name</label>
                    <input
                      type="text"
                      name="user-name"
                      required
                      className="w-full bg-dark-900 border border-white/5 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-brand-500 placeholder-gray-600"
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 mb-1">
                      Your Request/Message
                    </label>
                    <textarea
                      name="user-request"
                      rows={3}
                      required
                      className="w-full bg-dark-900 border border-white/5 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-brand-500 placeholder-gray-600 resize-none"
                      placeholder="Describe the plugin or extension name..."
                    />
                  </div>
                  <button type="submit" className="w-full accent-gradient-btn py-2.5 rounded-full text-xs font-bold shadow-md">
                    Submit Request
                  </button>
                </form>
              </div>
            </section>
          )}

          {/* Grids catalog listing */}
          {activeTab !== "favorites" && activeTab !== "request-resource" && (
            <CatalogGrid
              data={{
                adobeSoftware: appData.adobeSoftware,
                plugins: appData.plugins,
                scripts: appData.scripts,
                assets: appData.assets,
                utilities: appData.utilities,
                courses: appData.courses,
              }}
              sectionNames={appData.sectionNames}
              searchQuery={searchQuery}
              currency={pricing.currency}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              onItemClick={handleItemClick}
            />
          )}

          {/* Footer */}
          <footer className="border-t border-white/5 pt-12 pb-6 mt-20 text-xs text-gray-500">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 text-left">
              <div>
                <h4 className="text-sm font-bold text-white mb-3">
                  Harsh<span className="text-brand-500">Edits</span>
                </h4>
                <p className="leading-relaxed max-w-xs">
                  Premium, vetted creative assets and extensions created for Adobe Premiere Pro and After Effects workflows.
                </p>
              </div>
              <div>
                <h5 className="text-white font-bold mb-3 uppercase tracking-wider">Links</h5>
                <ul className="space-y-1.5 text-gray-400">
                  <li><Link href="/faq" className="hover:text-brand-400">Help & FAQ</Link></li>
                  <li><Link href="/about" className="hover:text-brand-400">About us</Link></li>
                  <li><Link href="/contact" className="hover:text-brand-400">Report Problems</Link></li>
                </ul>
              </div>
              <div>
                <h5 className="text-white font-bold mb-3 uppercase tracking-wider">Legal</h5>
                <ul className="space-y-1.5 text-gray-400">
                  <li><Link href="/terms" className="hover:text-brand-400">Terms of Service</Link></li>
                  <li><Link href="/privacy" className="hover:text-brand-400">Privacy Policy</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
              <p>&copy; {new Date().getFullYear()} Harsh Edits. All rights reserved.</p>
              <p>Designed & Developed by Harsh Edits</p>
            </div>
          </footer>
        </div>
      </div>

      {/* Profile Modal */}
      {isProfileOpen && currentUser && (
        <div className="custom-modal active" onClick={() => setIsProfileOpen(false)}>
          <div className="custom-modal-card relative text-center bg-[#0f0f15]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsProfileOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-brand-500 to-emerald-600 p-[2px] mb-3 shadow-xl">
                <div className="w-full h-full rounded-full bg-dark-900 flex items-center justify-center overflow-hidden relative">
                  <span className="text-xl font-bold text-white">
                    {userProfile?.username ? userProfile.username[0].toUpperCase() : "U"}
                  </span>
                  {userProfile?.avatarUrl && (
                    <img src={userProfile.avatarUrl} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-1">{userProfile?.username || "User Name"}</h3>
              <p className="text-gray-500 text-xs mb-6">{currentUser.email}</p>

              <div className="w-full space-y-2 mb-6">
                <div className="bg-dark-900 border border-white/5 rounded-xl p-3 flex items-center justify-between text-xs">
                  <span className="text-gray-400">Member Since</span>
                  <span className="font-semibold text-white">{userProfile?.joinedAt || "N/A"}</span>
                </div>

                <div className="bg-dark-900 border border-white/5 rounded-xl p-3 flex items-center justify-between text-xs">
                  <span className="text-gray-400">Status</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 uppercase tracking-tighter border border-yellow-500/30">
                    {userProfile?.isPaid || userProfile?.role === "admin" ? "PRO MEMBER" : "FREE TIER"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  logout();
                  setIsProfileOpen(false);
                }}
                className="w-full bg-red-500/10 hover:bg-red-600 border border-red-500/20 text-white font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-xs"
              >
                <i className="fa-solid fa-right-from-bracket"></i> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      <ProductDrawer
        isOpen={drawerOpen}
        item={selectedItem}
        collectionName={selectedCollection}
        onClose={handleCloseDetail}
        currency={pricing.currency}
        onDownload={handleDownload}
        onShowSubItems={() => {
          if (selectedItem?.hasSubItems) {
            // Trigger routing or sub-view
            showToast("Sub-items viewing is loaded", "info");
          }
        }}
        onToast={showToast}
      />

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

      {/* Rating Modal */}
      {isRatingOpen && ratingItem && (
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

      {/* Broken Link Modal */}
      {isBrokenLinkOpen && brokenLinkItem && (
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

      {/* Toast Notifications Container */}
      <div id="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            {toast.type === "success" && <i className="fa-solid fa-circle-check text-emerald-400"></i>}
            {toast.type === "error" && <i className="fa-solid fa-circle-xmark text-red-400"></i>}
            {toast.type === "info" && <i className="fa-solid fa-circle-info text-blue-400"></i>}
            <span className="text-white text-xs">{toast.msg}</span>
          </div>
        ))}
      </div>
    </>
  );
}
