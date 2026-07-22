"use client";

import React, { useEffect, useState } from "react";
import { doc, collection, onSnapshot, getDoc, getDocs, updateDoc, setDoc, addDoc, query, where, Timestamp, limit } from "firebase/firestore";
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
import ScrollReveal from "../components/ScrollReveal";
import { CountUp, Marquee } from "../components/AnimatedElements";
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

  const [activeTab, setActiveTab] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<Record<string, any>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showPreloader, setShowPreloader] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    // We now fetch products based on the activeTab to save reads!
    // This is handled in a separate useEffect below.

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
      unsubscribeBanners();
      unsubscribeConfig();
    };
  }, []);

  // Fetch Trending Items for Home Page
  useEffect(() => {
    if (activeTab === "home") {
      const fetchTrending = async () => {
        try {
          const q = query(
            collection(firestore, "products"),
            where("status", "==", "approved"),
            limit(20) // Fetch up to 20 to shuffle from
          );
          const snap = await getDocs(q);
          const items: any[] = [];
          snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
          
          // Shuffle and pick 3
          const shuffled = items.sort(() => 0.5 - Math.random());
          setAppData((prev: any) => ({ ...prev, trending: shuffled.slice(0, 3) }));
        } catch (err) {
          console.error("Failed to load trending items", err);
        }
      };
      if (!appData.trending || appData.trending.length === 0) {
        fetchTrending();
      }

      const fetchCreators = async () => {
        try {
          const q = query(
            collection(firestore, "users"),
            where("role", "==", "creator"),
            where("isCreatorApproved", "==", true),
            limit(15) // Fetch up to 15 to shuffle
          );
          const snap = await getDocs(q);
          const items: any[] = [];
          snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
          
          // Shuffle and pick 3
          const shuffled = items.sort(() => 0.5 - Math.random());
          setAppData((prev: any) => ({ ...prev, featuredCreators: shuffled.slice(0, 3) }));
        } catch (err) {
          console.error("Failed to load featured creators", err);
        }
      };
      if (!appData.featuredCreators || appData.featuredCreators.length === 0) {
        fetchCreators();
      }
    }
  }, [activeTab]);

  // Fetch Category Data Based on Active Tab
  useEffect(() => {
    const tabToCategoryMap: Record<string, string> = {
      software: "adobeSoftware",
      plugins: "plugins",
      scripts: "scripts",
      assets: "assets",
      utilities: "utilities",
      courses: "courses",
      community: "creator_product"
    };

    const categoryKey = tabToCategoryMap[activeTab];
    if (!categoryKey) return;

    // Use onSnapshot for live updates, but ONLY for the currently viewed category!
    const q = query(
      collection(firestore, "products"),
      where("status", "==", "approved"),
      where("Category", "==", categoryKey)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      
      setAppData((prev: any) => ({
        ...prev,
        [categoryKey]: items
      }));
    });

    return () => unsubscribe();
  }, [activeTab]);

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

    showToast("Generating secure download link...", "info");
    
    try {
      const priceVal = parseFloat(selectedItem?.price as string) || 0;
      const priceUSDVal = parseFloat(selectedItem?.priceUSD as string) || 0;
      const actualPrice = pricing.currency === "INR" ? priceVal : priceUSDVal;

      const isAdmin = userProfile?.role === "admin" || userProfile?.role === "sub-admin" || userProfile?.role === "creator";
      const isPaid = userProfile?.isPaid || !!userProfile?.purchased?.["PRO_BUNDLE"] || isAdmin;

      const freeDownloads = userProfile?.freeDownloads || {};
      const downloadCount = Object.keys(freeDownloads).length;
      const isNewFreeDownload = actualPrice === 0 && selectedItem && !freeDownloads[selectedItem.id];
      
      if (isNewFreeDownload && !isAdmin && !isPaid && downloadCount >= 2) {
        setIsLimitModalOpen(true);
        return;
      }

      const idToken = await currentUser.getIdToken();
      const title = selectedItem?.Title || "Resource";
      const versionName = version?.Name || "Direct Download";
      
      const res = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          itemId: selectedItem?.id,
          versionName: versionName,
          resourceTitle: title,
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        showToast(data.error || "Download failed. Please try again.", "error");
        return;
      }
      
      if (data.warning) {
        showToast(data.warning, "info");
      }
      
      const rawLink = data.url;
      const win = window.open(rawLink, "_blank");
      if (win) {
        win.focus();
      } else {
        showToast("Popup blocked! Please allow popups to download.", "error");
        window.location.href = rawLink; // Fallback
      }

      // Background local checks (transactions & ratings)
      (async () => {
        try {
          const userDocRef = doc(firestore, "users", currentUser.uid);

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

        // Log a ₹0 order for free products so it appears in Creator Sales & CRM
        if (actualPrice === 0 && selectedItem) {
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
              vendorId: selectedItem.ownerUid || (selectedItem as any).vendorId || "platform",
              payoutAccountId: "",
              platformCommission: 0,
              creatorPayout: 0,
              timestamp: Timestamp.now(),
            });
          }
        }

        // Update free download count
        if (isNewFreeDownload && !isAdmin && !isPaid) {
          await updateDoc(userDocRef, {
            [`freeDownloads.${selectedItem.id}`]: Timestamp.now()
          });
        }
      } catch (err) {
        console.error("Background logging failed:", err);
      }
    })();
    } catch (err) {
      console.error(err);
      showToast("Download failed due to an error.", "error");
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
          <h1 className="text-5xl md:text-6xl font-bold tracking-normal text-white mb-6 animate-pulse">
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
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
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
        <div className="main-viewport pt-4 lg:pt-8">
          {/* Top Controls bar (Sticky on Mobile) */}
          <div className="sticky top-0 lg:relative z-30 flex items-center justify-between gap-4 mb-8 lg:mb-12 py-4 lg:py-0 bg-[#07070a]/90 lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none border-b border-white/5 lg:border-none -mx-6 px-6 lg:mx-0 lg:px-0">
            <div className="flex items-center gap-2 lg:hidden">
              <button 
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5 active:scale-95 transition-all"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <span className="text-base font-black text-white tracking-normal select-none">
                Harsh<span className="text-brand-500">Edits</span>
              </span>
            </div>
            
            {!userProfile?.isPaid && !userProfile?.purchased?.["PRO_BUNDLE"] && userProfile?.role !== "admin" && userProfile?.role !== "sub-admin" && userProfile?.role !== "creator" ? (
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

          {/* Home / Landing Page Section */}
          {activeTab === "home" && (
            <div className="flex flex-col gap-12 lg:gap-24 pb-24">
              
              {/* Premium Hero with Reveal */}
              <ScrollReveal direction="up">
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
              </ScrollReveal>

              {/* Infinite Marquee */}
              <ScrollReveal delay={0.2}>
                <Marquee />
              </ScrollReveal>

              {/* Trending Arsenal Gallery */}
              <ScrollReveal className="container mx-auto px-6 max-w-6xl mt-8">
                <div className="flex flex-col md:flex-row items-end justify-between mb-8 gap-4">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-black text-white mb-2">Trending Arsenal</h2>
                    <p className="text-gray-400 text-sm">The most downloaded premium tools this week.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab("software")}
                    className="text-brand-500 hover:text-brand-400 text-sm font-bold flex items-center gap-2 group"
                  >
                    View All Catalog <i className="fa-solid fa-arrow-right transition-transform group-hover:translate-x-1"></i>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {(appData.trending || []).map((item: any) => {
                    const img = item.ImageURL || item.image || item.imageUrls?.[0] || "";
                    const category = item.Category || "Asset";
                    
                    let bgCol = "bg-blue-500/20";
                    let textCol = "bg-blue-500";
                    if(category === "plugins") { bgCol = "bg-brand-500/20"; textCol = "bg-brand-500 text-black"; }
                    if(category === "scripts") { bgCol = "bg-purple-500/20"; textCol = "bg-purple-500 text-white"; }
                    if(category === "adobeSoftware") { bgCol = "bg-red-500/20"; textCol = "bg-red-500 text-white"; }

                    return (
                      <div 
                        key={item.id} 
                        className="group relative rounded-3xl overflow-hidden bg-[#111] border border-white/5 aspect-[4/3] cursor-pointer shadow-lg" 
                        onClick={() => handleItemClick(category, item.id)}
                      >
                        {img && <img src={img} alt={item.Title} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10 pointer-events-none"></div>
                        <div className={`absolute inset-0 ${bgCol} opacity-0 group-hover:opacity-100 transition-opacity z-10`}></div>
                        <div className="absolute bottom-0 left-0 p-6 z-20 w-full transform translate-y-4 group-hover:translate-y-0 transition-transform">
                          <div className="flex items-center gap-2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className={`${textCol} text-[10px] font-black uppercase px-2 py-1 rounded-sm shadow-lg`}>{category.replace("adobeSoftware", "Software")}</span>
                          </div>
                          <h3 className="text-xl font-black text-white mb-1 line-clamp-1 group-hover:text-brand-400 transition-colors">{item.Title || item.title}</h3>
                          <p className="text-gray-400 text-xs line-clamp-2">{item.Description || item.description || "Premium editing resource."}</p>
                        </div>
                      </div>
                    )
                  })}
                  
                  {(!appData.trending || appData.trending.length === 0) && (
                    <div className="col-span-3 text-center py-20 text-gray-500">
                      <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
                      <span className="text-xs font-bold uppercase tracking-widest">Loading arsenal...</span>
                    </div>
                  )}
                </div>
              </ScrollReveal>

              {/* Banners & Featured Content */}
              <ScrollReveal>
                <BannerCarousel
                  banners={appData.banners}
                  settings={appData.carouselSettings}
                />
              </ScrollReveal>

              {/* Creator Spotlight */}
              <ScrollReveal className="w-full bg-[#050505] border-y border-white/5 py-24 relative overflow-hidden mt-12">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-500/10 blur-[100px] pointer-events-none rounded-full"></div>
                
                <div className="container mx-auto px-6 max-w-6xl relative z-10">
                  <div className="text-center mb-16">
                    <span className="text-brand-500 text-xs font-black tracking-widest uppercase mb-4 block">The Community</span>
                    <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Verified Creators</h2>
                    <p className="text-gray-400 text-sm max-w-2xl mx-auto">
                      HarshEdits is powered by industry professionals. Discover storefronts from top-tier editors producing exclusive assets.
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-12 md:gap-24 mb-12">
                    {(appData.featuredCreators || []).map((creator: any, idx: number) => {
                      const details = creator.creatorDetails || {};
                      const displayName = details.displayName || creator.name || "Anonymous Creator";
                      const bio = details.bio || "Verified marketplace merchant.";
                      const avatar = details.avatarUrl || "";
                      const initials = displayName.substring(0, 2).toUpperCase();

                      // Cycle through 3 different styling themes
                      let theme = { outer: "from-brand-500 to-purple-600 shadow-brand-500/20", inner: "text-brand-500" };
                      let translate = "";
                      if (idx === 1) {
                        theme = { outer: "from-blue-500 to-brand-500 shadow-blue-500/20", inner: "text-blue-500" };
                        translate = "md:-translate-y-4";
                      } else if (idx === 2) {
                        theme = { outer: "from-purple-500 to-pink-500 shadow-purple-500/20", inner: "text-purple-500" };
                      }

                      return (
                        <div key={creator.id} className="flex flex-col items-center text-center max-w-[200px]">
                          <Link href={`/creator/${creator.id}`} className={`w-${idx === 1 ? '32 h-32' : '24 h-24'} rounded-full bg-gradient-to-tr ${theme.outer} p-1 mb-4 shadow-lg transform ${translate} hover:scale-105 transition-transform`}>
                            <div className="w-full h-full bg-[#111] rounded-full border-2 border-black flex items-center justify-center font-bold overflow-hidden text-2xl">
                              {avatar ? (
                                <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
                              ) : (
                                <span className={theme.inner}>{initials}</span>
                              )}
                            </div>
                          </Link>
                          <Link href={`/creator/${creator.id}`} className="hover:text-brand-400 transition-colors">
                            <h3 className={`${idx === 1 ? 'text-xl font-black' : 'text-lg font-bold'} text-white mb-1`}>{displayName}</h3>
                          </Link>
                          <p className={`${idx === 1 ? 'text-sm' : 'text-xs'} text-gray-500 line-clamp-2`}>{bio}</p>
                        </div>
                      );
                    })}
                    
                    {(!appData.featuredCreators || appData.featuredCreators.length === 0) && (
                      <div className="w-full text-center py-10 text-gray-500">
                        Loading featured creators...
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <Link href="/creators" className="bg-white text-black hover:bg-gray-200 transition-colors font-bold px-8 py-3 rounded-full text-sm flex items-center gap-2">
                      Explore All Storefronts
                    </Link>
                  </div>
                </div>
              </ScrollReveal>

              {/* The HarshEdits Advantage */}
              <ScrollReveal className="container mx-auto px-6 max-w-6xl mt-12 mb-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-black text-white mb-6 leading-tight">Elevate Your Edits <br/>Without the Effort.</h2>
                    
                    <div className="space-y-8">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#111] border border-white/10 flex items-center justify-center shrink-0">
                          <i className="fa-solid fa-check-double text-brand-500"></i>
                        </div>
                        <div>
                          <h4 className="text-white font-bold mb-1">Curated Quality</h4>
                          <p className="text-gray-400 text-sm leading-relaxed">Every preset, plugin, and script is rigorously tested by industry professionals before hitting our shelves.</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#111] border border-white/10 flex items-center justify-center shrink-0">
                          <i className="fa-solid fa-gauge-high text-brand-500"></i>
                        </div>
                        <div>
                          <h4 className="text-white font-bold mb-1">Workflow Multiplier</h4>
                          <p className="text-gray-400 text-sm leading-relaxed">Cut your editing time in half with automated scripts and one-click assets designed to eliminate tedious tasks.</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#111] border border-white/10 flex items-center justify-center shrink-0">
                          <i className="fa-solid fa-download text-brand-500"></i>
                        </div>
                        <div>
                          <h4 className="text-white font-bold mb-1">Instant Pipeline</h4>
                          <p className="text-gray-400 text-sm leading-relaxed">No complicated setups. Purchase and download directly into your editing software's ecosystem instantly.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute -inset-4 bg-gradient-to-r from-brand-500/20 to-purple-600/20 blur-3xl rounded-full opacity-50"></div>
                    <div className="bg-[#0a0a0f] border border-white/10 rounded-3xl p-2 relative shadow-2xl">
                       <div className="bg-[#111] rounded-2xl aspect-[4/5] md:aspect-square flex flex-col items-center justify-center p-8 text-center border border-white/5 relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent"></div>
                         
                         {/* Glowing Icon */}
                         <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-brand-500/20 to-purple-600/20 mb-8 flex items-center justify-center border border-brand-500/30 shadow-[0_0_30px_rgba(168,85,247,0.2)] relative">
                           <div className="absolute inset-0 bg-brand-500/10 rounded-full animate-ping opacity-50"></div>
                           <i className="fa-solid fa-wand-magic-sparkles text-4xl text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] z-10"></i>
                         </div>
                         
                         {/* UI Abstract Lines */}
                         <div className="w-3/4 h-4 bg-gradient-to-r from-brand-500/50 to-purple-500/50 rounded-full mb-4 shadow-[0_0_15px_rgba(168,85,247,0.3)]"></div>
                         <div className="w-1/2 h-3 bg-white/10 rounded-full mb-10"></div>
                         
                         {/* UI Abstract Blocks */}
                         <div className="flex gap-4 w-full max-w-xs">
                           <div className="h-12 flex-1 bg-brand-500/20 border border-brand-500/50 rounded-xl flex items-center justify-center">
                             <div className="w-1/2 h-2 bg-brand-500 rounded-full"></div>
                           </div>
                           <div className="h-12 flex-1 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
                             <div className="w-1/2 h-2 bg-white/20 rounded-full"></div>
                           </div>
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {/* Massive Pro Bundle Banner OR Welcome Back Banner */}
              <ScrollReveal className="container mx-auto px-6 max-w-6xl mt-12">
                {userProfile?.isPaid || userProfile?.purchased?.["PRO_BUNDLE"] || userProfile?.role === "admin" || userProfile?.role === "sub-admin" || userProfile?.role === "creator" ? (
                  <div className="bg-gradient-to-br from-brand-500/10 to-[#141420] border border-brand-500/20 rounded-[40px] p-8 md:p-16 relative overflow-hidden shadow-2xl group">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/10 blur-[120px] rounded-full pointer-events-none transition-transform duration-1000 group-hover:scale-110"></div>
                    
                    <div className="relative z-10 max-w-2xl">
                      <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-6">
                        <i className="fa-solid fa-crown text-2xl text-brand-500 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]"></i>
                      </div>
                      <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">You have the <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-purple-400">Pro Pipeline.</span></h2>
                      <p className="text-gray-400 text-sm md:text-base leading-relaxed mb-8 max-w-lg">
                        Welcome back to HarshEdits Pro. You currently have unlimited access to every premium asset, plugin, and script in the entire marketplace.
                      </p>
                      
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <button 
                          onClick={() => setActiveTab("plugins")}
                          className="bg-white hover:bg-gray-200 text-black font-black px-8 py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95 flex items-center gap-2"
                        >
                          Explore Premium Arsenal <i className="fa-solid fa-arrow-right"></i>
                        </button>
                        <span className="text-xs font-bold text-brand-400 tracking-widest uppercase">PRO STATUS ACTIVE</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-[#0a0a0f] to-[#141420] border border-white/10 rounded-[40px] p-8 md:p-16 relative overflow-hidden shadow-2xl group">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-yellow-500/10 blur-[120px] rounded-full pointer-events-none transition-transform duration-1000 group-hover:scale-110"></div>
                    
                    <div className="relative z-10 max-w-2xl">
                      <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-6">
                        <i className="fa-solid fa-crown text-2xl text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]"></i>
                      </div>
                      <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">Unlock the Ultimate <br/>Creator Pipeline.</h2>
                      <p className="text-gray-400 text-sm md:text-base leading-relaxed mb-8 max-w-lg">
                        Stop buying individual assets. Get unlimited lifetime access to our entire library of premium plugins, scripts, and cinematic tools with the Pro Membership.
                      </p>
                      
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <button 
                          onClick={() => {
                            setCheckoutItem({
                              id: null,
                              title: "Pro Membership",
                              amount: pricing.activePrice,
                            });
                            setIsCheckoutOpen(true);
                          }}
                          className="bg-yellow-500 hover:bg-yellow-400 text-black font-black px-8 py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.5)] active:scale-95 flex items-center gap-2"
                        >
                          Get Pro Access Now <i className="fa-solid fa-arrow-right"></i>
                        </button>
                        <span className="text-xs font-bold text-gray-500 tracking-widest uppercase">One-Time Payment</span>
                      </div>
                    </div>
                  </div>
                )}
              </ScrollReveal>
            </div>
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
              activeTab={activeTab}
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
                  {userProfile?.avatarUrl ? (
                    <img src={userProfile.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-white">
                      {(currentUser?.displayName || userProfile?.username || "U")[0].toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-1">{currentUser?.displayName || userProfile?.username || "User Name"}</h3>
              <p className="text-gray-500 text-xs mb-6">{currentUser.email}</p>

              <div className="w-full space-y-2 mb-6">
                <div className="bg-dark-900 border border-white/5 rounded-xl p-3 flex items-center justify-between text-xs">
                  <span className="text-gray-400">Member Since</span>
                  <span className="font-semibold text-white">
                    {userProfile?.joinedAt || (currentUser?.metadata?.creationTime ? new Date(currentUser.metadata.creationTime).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : "N/A")}
                  </span>
                </div>

                <div className="bg-dark-900 border border-white/5 rounded-xl p-3 flex items-center justify-between text-xs">
                  <span className="text-gray-400">Status</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 uppercase tracking-tighter border border-yellow-500/30">
                    {userProfile?.isPaid || !!userProfile?.purchased?.["PRO_BUNDLE"] || userProfile?.role === "admin" ? "PRO MEMBER" : "FREE TIER"}
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
