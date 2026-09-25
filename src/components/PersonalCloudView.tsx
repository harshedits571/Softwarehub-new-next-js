"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, onSnapshot } from "firebase/firestore";
import { firestore } from "../utils/firebase";
import ScrollReveal from "./ScrollReveal";

interface PersonalCloudViewProps {
  currency: "INR" | "USD";
  onBuyPro: (item: { id: string; title: string; amount: number }) => void;
  onOpenTrial?: () => void;
  onToast: (msg: string, type: "success" | "error" | "info") => void;
}

export interface StorefrontPlan {
  id: string;
  name: string;
  badge?: string;
  price: number;
  originalPrice: number;
  popular?: boolean;
  isTrial?: boolean;
  enabled?: boolean;
  description: string;
  features: string[];
  cta: string;
}

export const PersonalCloudView: React.FC<PersonalCloudViewProps> = ({
  currency,
  onBuyPro,
  onOpenTrial,
  onToast,
}) => {
  // Demo State
  const [activeTab, setActiveTab] = useState<"files" | "screen" | "system" | "quickdrop" | "security">("files");
  const [volumeDiscord, setVolumeDiscord] = useState(85);
  const [volumeSpotify, setVolumeSpotify] = useState(100);
  const [volumeGame, setVolumeGame] = useState(60);
  const [videoProgress, setVideoProgress] = useState(42);
  const [activeDrive, setActiveDrive] = useState("D:");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [pricingConfig, setPricingConfig] = useState<Record<string, any> | null>(null);

  // Live real-time sync with Admin Pricing Management
  useEffect(() => {
    const unsub = onSnapshot(
      doc(firestore, "config", "personal_cloud_pricing"),
      (snap) => {
        if (snap.exists() && snap.data()?.plans) {
          setPricingConfig(snap.data().plans);
        }
      },
      (err) => {
        console.warn("Could not fetch real-time pricing config:", err);
      }
    );
    return () => unsub();
  }, []);

  const rawStarter = pricingConfig?.starter || {
    id: "starter",
    name: "Starter Edition",
    badge: "ENTRY LEVEL",
    tagline: "Ideal for accessing photos, documents, and files remotely from your phone.",
    price: 499,
    originalPrice: 1499,
    usdPrice: 9.99,
    popular: false,
    enabled: true,
    features: [
      "1 Windows PC License (Lifetime)",
      "Unlimited Personal Storage",
      "Native Desktop File Explorer",
      "QuickDrop P2P File Sharing",
      "4-Digit Master PIN Lock",
      "Lifetime Free Updates",
    ],
  };

  const rawPro = pricingConfig?.pro || {
    id: "pro",
    name: "Pro Security Edition",
    badge: "MOST POPULAR • BEST VALUE",
    tagline: "The complete powerhouse: 4K streaming, screen mirror, volume mixer & dual-secret security.",
    price: 999,
    originalPrice: 2999,
    usdPrice: 19.99,
    popular: true,
    enabled: true,
    features: [
      "2 Windows PC Licenses (Work + Home)",
      "4K Hardware-Accelerated Video Transcoder",
      "60 FPS Low-Latency Screen Mirroring",
      "Native Windows Audio Mixer (Per-App)",
      "Automated Cloudflare SSL Zero-Config Tunnel",
      "Telegram & Discord Security Bot Alerts",
      "Secret Emergency Word Access",
      "Priority VIP Customer Support",
    ],
  };

  const rawFamily = pricingConfig?.family || {
    id: "family",
    name: "Family & Power Bundle",
    badge: "3 LICENSES",
    tagline: "For power users with multiple PCs or families wanting their own private clouds.",
    price: 1499,
    originalPrice: 4499,
    usdPrice: 29.99,
    popular: false,
    enabled: true,
    features: [
      "Up to 5 Windows PC Licenses",
      "Independent PIN & Access Folders for Each Member",
      "Full 4K Video Streaming & Screen Mirroring",
      "All Pro Features Included on All 5 PCs",
      "Priority Remote Setup Assistance",
      "Commercial Lifetime License",
    ],
  };

  const allPlans: StorefrontPlan[] = [
    {
      id: "trial",
      name: "30-Day Free Trial",
      price: 0,
      originalPrice: currency === "INR" ? 499 : 9.99,
      popular: false,
      isTrial: true,
      enabled: true,
      description: "Full-featured access on 1 PC. Zero commitment, no payment details required.",
      features: [
        "Full 30-Day Unlimited Access",
        "1 PC Server Node",
        "High-Speed Remote File Access",
        "4K Movie & Media Streaming",
        "End-to-End Encrypted Tunnel",
        "Upgrade to Lifetime anytime"
      ],
      cta: "Start 30-Day Free Trial",
    },
    {
      id: "starter",
      name: rawStarter.name || "Starter Edition",
      badge: rawStarter.badge || "ENTRY LEVEL",
      price: currency === "INR" ? (rawStarter.price ?? 499) : (rawStarter.usdPrice ?? 9.99),
      originalPrice: currency === "INR" ? (rawStarter.originalPrice ?? 1499) : (rawStarter.usdPrice ? rawStarter.usdPrice * 3 : 29.99),
      description: rawStarter.tagline || rawStarter.description || "Ideal for accessing photos, documents, and files remotely from your phone.",
      features: rawStarter.features || [],
      popular: Boolean(rawStarter.popular),
      enabled: rawStarter.enabled !== false,
      cta: currency === "INR" ? `Get Starter (₹${rawStarter.price ?? 499})` : `Get Starter ($${rawStarter.usdPrice ?? 9.99})`,
    },
    {
      id: "pro",
      name: rawPro.name || "Pro Security Edition",
      badge: rawPro.badge || "MOST POPULAR • BEST VALUE",
      price: currency === "INR" ? (rawPro.price ?? 999) : (rawPro.usdPrice ?? 19.99),
      originalPrice: currency === "INR" ? (rawPro.originalPrice ?? 2999) : (rawPro.usdPrice ? rawPro.usdPrice * 3 : 59.99),
      description: rawPro.tagline || rawPro.description || "The complete powerhouse: 4K streaming, screen mirror, volume mixer & dual-secret security.",
      features: rawPro.features || [],
      popular: rawPro.popular !== undefined ? Boolean(rawPro.popular) : true,
      enabled: rawPro.enabled !== false,
      cta: currency === "INR" ? `Get Pro License (₹${rawPro.price ?? 999})` : `Get Pro License ($${rawPro.usdPrice ?? 19.99})`,
    },
    {
      id: "family",
      name: rawFamily.name || "Family & Power Bundle",
      badge: rawFamily.badge || "BEST VALUE",
      price: currency === "INR" ? (rawFamily.price ?? 1499) : (rawFamily.usdPrice ?? 29.99),
      originalPrice: currency === "INR" ? (rawFamily.originalPrice ?? 4499) : (rawFamily.usdPrice ? rawFamily.usdPrice * 3 : 89.99),
      description: rawFamily.tagline || rawFamily.description || "Total private cloud freedom across multiple family computers.",
      features: rawFamily.features || [],
      popular: Boolean(rawFamily.popular),
      enabled: rawFamily.enabled !== false,
      cta: currency === "INR" ? `Get Bundle (₹${rawFamily.price ?? 1499})` : `Get Bundle ($${rawFamily.usdPrice ?? 29.99})`,
    },
  ];

  // ONLY show enabled/live plans (hidden plans in admin dashboard are excluded)
  const plans = allPlans.filter((p) => p.enabled !== false);

  // Features exactly from website/src/components/FeatureGrid.js
  const features = [
    {
      icon: "fa-hard-drive",
      tag: "STORAGE",
      title: "Full PC Hard Drive Access",
      description: "Turn your 2TB, 4TB, or 16TB hard drives into your personal cloud. Access C:, D:, E:, Downloads, and Desktop folders directly from your phone with zero monthly fees.",
    },
    {
      icon: "fa-film",
      tag: "STREAMING",
      title: "Instant 4K Video Transcoder",
      description: "Stream massive 50GB+ 4K MKV, MP4, and HEVC video files with zero stutter. Built-in subtitle track switcher, audio channel selector, and 0.04-second instant seeking.",
    },
    {
      icon: "fa-desktop",
      tag: "MIRRORING",
      title: "60 FPS Desktop Screen Mirror",
      description: "Control your PC desktop in real time from mobile Safari or Chrome. Full multi-monitor support, virtual mouse trackpad, physical keyboard inputs, and PC power controls.",
    },
    {
      icon: "fa-sliders",
      tag: "AUDIO MIXER",
      title: "Per-App Volume Controller",
      description: "Control individual app volumes (Discord, Chrome, Games, Spotify) remotely from your phone. View live CPU/RAM metrics and terminate frozen PC programs in one tap.",
    },
    {
      icon: "fa-bolt",
      tag: "TRANSFERS",
      title: "QuickDrop Wire-Speed Sharing",
      description: "Transfer huge video folders, documents, and photos between phone and PC at wire-speed over local Wi-Fi or encrypted over the internet without file compression.",
    },
    {
      icon: "fa-shield-halved",
      tag: "SECURITY",
      title: "Zero-Knowledge Privacy Architecture",
      description: "Protected by Master PIN, Emergency Secret Word for logins on friend's laptops, auto-discarding memory sessions, and rate-limited brute-force lockout.",
    },
  ];

  // Security Deep Dive cards exactly from website/src/components/SecurityDeepDive.js
  const securityCards = [
    {
      icon: "fa-network-wired",
      title: "Direct Encrypted P2P Streaming",
      description: "All video streaming, file downloads, and screen feeds flow directly between your host computer and phone over end-to-end encrypted TLS tunnels. Zero middleman servers.",
    },
    {
      icon: "fa-key",
      title: "Dual-Secret Authentication",
      description: "Use your Master PIN for daily mobile logins. Need emergency access from a friend's computer or internet cafe when your phone is dead? Log in with your Secret Emergency Word without needing phone OTPs.",
    },
    {
      icon: "fa-microchip",
      title: "Ephemeral Memory Sessions",
      description: "Check the Public / Friend's PC box on login, and your session tokens live strictly in temporary memory (sessionStorage). Closing the browser tab instantly deletes all session data.",
    },
    {
      icon: "fa-shield-virus",
      title: "Brute-Force Rate Limiting",
      description: "Active server rate limiting guards against brute-force attacks. Repeated failed PIN or emergency word attempts trigger automatic IP lockouts.",
    },
    {
      icon: "fa-shield-halved",
      title: "Zero Open Router Ports",
      description: "Never risk open port forwarding on your home router. Personal Cloud Pro utilizes Cloudflare's encrypted quick tunnels to bypass CGNAT and dynamic IPs with full HTTPS encryption.",
    },
    {
      icon: "fa-paper-plane",
      title: "Telegram Bot Auto-Alerts",
      description: "Whenever your PC boots or restarts, your server generates a fresh SSL link and automatically sends it straight to your personal Telegram Bot or Discord channel, keeping you connected 24/7.",
    },
  ];

  // Comparison Rows exactly from website/src/components/Comparison.js
  const comparisonRows = [
    { feature: "Pricing Model", us: currency === "INR" ? "₹999 One-Time (Lifetime)" : "$19.99 One-Time", gdrive: "₹1,500 – ₹7,500 / year (Every year)", teamviewer: "₹24,000+ / year" },
    { feature: "Storage Capacity", us: "Unlimited (Full PC Hard Drives)", gdrive: "100 GB – 2 TB Cap", teamviewer: "0 GB (No file cloud)" },
    { feature: "Data Privacy", us: "100% Zero-Knowledge on Your PC", gdrive: "Scanned for ads & AI models", teamviewer: "Proprietary server relays" },
    { feature: "4K Movie Streaming", us: "Instant Transcoder & Subtitles", gdrive: "Must download first", teamviewer: "Laggy screen stream" },
    { feature: "Live Screen Mirroring", us: "60 FPS Ultra-Low Latency", gdrive: "No", teamviewer: "Yes (Expensive license)" },
    { feature: "Per-App Volume Mixer", us: "Yes (Hardware Windows Mixer)", gdrive: "No", teamviewer: "No" },
    { feature: "Mobile App Required", us: "None (Works in Safari/Chrome)", gdrive: "Requires Google App", teamviewer: "Requires heavy app" },
    { feature: "Boot on Windows Lock Screen", us: "Yes (Starts before login)", gdrive: "No", teamviewer: "Limited" },
  ];

  // FAQ items exactly from website/src/components/FAQ.js
  const faqs = [
    {
      q: "Does it work when my PC is sitting on the Windows Lock Screen?",
      a: "Yes! Personal Cloud Pro installs a native Windows Boot Task that launches automatically as soon as your computer powers on. You can access your files and stream media from your phone even while your PC is sitting on the lock screen before anyone logs in.",
    },
    {
      q: "Do I need a static IP, public IP, or router port-forwarding?",
      a: "No, zero router configuration is required. Personal Cloud Pro leverages Cloudflare's encrypted quick tunnels, which automatically punch through CGNAT, hotel Wi-Fi, and firewalls with full HTTPS encryption.",
    },
    {
      q: "Do I need to install a mobile app from Google Play or App Store?",
      a: "No app download is required! Personal Cloud Pro is a full-featured web client that runs in any browser (Safari, Chrome, Firefox, Edge). You can tap 'Add to Home Screen' to use it just like a native app.",
    },
    {
      q: "What if I need to access my files from a friend's computer without my phone?",
      a: "We built a dedicated Emergency Login system for this! Log in with your Secret Emergency Word without needing your phone for OTPs. Check the 'Public/Friend's PC' box, and your session tokens will only live in temporary memory and disappear the moment you close the tab.",
    },
    {
      q: "How does it handle massive 50GB+ 4K MKV movies?",
      a: "Personal Cloud Pro features an instant media streamer with hardware-accelerated video transcoding, subtitle rendering, and multi-track audio selection. You can seek through a 50GB file in 0.04 seconds without downloading the whole file first.",
    },
    {
      q: "What happens after I purchase a lifetime license?",
      a: "You will receive immediate access to download PersonalCloud-Pro-Setup.exe and your lifetime activation key. Setup takes under 60 seconds with our built-in First-Run Onboarding Wizard.",
    },
  ];

  const calculateTime = (pct: number) => {
    const totalSec = 10143; // 2h 49m 03s
    const currentSec = Math.floor((pct / 100) * totalSec);
    const h = Math.floor(currentSec / 3600);
    const m = Math.floor((currentSec % 3600) / 60);
    const s = currentSec % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleDownload = () => {
    onToast("Starting direct download for PersonalCloud-Pro-Setup.exe...", "info");
    const a = document.createElement("a");
    a.href = "/downloads/PersonalCloud-Pro-Setup.exe";
    a.download = "PersonalCloud-Pro-Setup.exe";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col gap-16 lg:gap-24 pb-24 text-gray-200">

      {/* ========================================================
          1. HERO SECTION (Exactly from Hero.js)
         ======================================================== */}
      <section className="relative pt-6 md:pt-10 overflow-hidden text-center">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-tr from-brand-500/20 via-blue-500/10 to-transparent blur-[120px] pointer-events-none rounded-full" />

        <div className="container mx-auto px-4 sm:px-6 max-w-6xl relative z-10">

          {/* Top Product Pill */}
          <div className="inline-flex mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-lg shadow-blue-500/10">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              STANDALONE COMMERCIAL PRO EDITION
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-white tracking-tight leading-[1.12] mb-6 max-w-5xl mx-auto">
            Your Entire PC Hard Drive. In Your Pocket.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 drop-shadow-[0_0_35px_rgba(59,130,246,0.35)]">
              Anywhere in the World.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-10 font-normal">
            Stream 4K movies with zero stutter, access 10TB+ files across all drives, and remote-control your Windows desktop from any phone browser — <strong className="text-white">zero monthly cloud fees</strong> and 100% private data ownership.
          </p>

          {/* Dual CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <button
              onClick={() => onOpenTrial && onOpenTrial()}
              className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black px-8 py-4 rounded-xl transition-all shadow-[0_0_35px_rgba(6,182,212,0.45)] hover:shadow-[0_0_45px_rgba(6,182,212,0.65)] active:scale-95 flex items-center justify-center gap-3 text-sm md:text-base border border-cyan-400/30"
            >
              <i className="fa-solid fa-bolt text-yellow-300"></i>
              <span>Start 30-Day Free Trial (₹0)</span>
              <i className="fa-solid fa-arrow-right text-xs"></i>
            </button>

            <button
              onClick={() => onBuyPro({ id: "pro", title: "Personal Cloud Pro Security Edition - Lifetime License", amount: currency === "INR" ? 999 : 19.99 })}
              className="w-full sm:w-auto bg-[#141422] hover:bg-[#1c1c30] text-white font-bold px-7 py-4 rounded-xl transition-all border border-white/10 hover:border-white/20 active:scale-95 flex items-center justify-center gap-2.5 text-sm md:text-base shadow-xl"
            >
              <i className="fa-solid fa-crown text-yellow-400"></i>
              <span>Get Lifetime Access — {currency === "INR" ? "₹999" : "$19.99"}</span>
            </button>

            <a
              href="#demo"
              className="w-full sm:w-auto text-gray-400 hover:text-white font-semibold px-5 py-4 rounded-xl transition-colors text-xs flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-play text-brand-400"></i>
              <span>Interactive Demo</span>
            </a>
          </div>

          {/* Real-world Feature Pills */}
          <div className="flex justify-center items-center gap-6 sm:gap-8 flex-wrap text-xs sm:text-sm text-gray-400 font-medium mb-12">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-check text-emerald-400 font-bold"></i>
              <span>No Monthly Subscriptions</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-check text-emerald-400 font-bold"></i>
              <span>60 FPS Desktop Screen Mirror</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-check text-emerald-400 font-bold"></i>
              <span>Works on 4G / 5G & Wi-Fi</span>
            </div>
          </div>

          {/* Ultra-Smooth 3D Device Canvas (From Hero.js) */}
          <div className="max-w-5xl mx-auto bg-[#0d121f]/90 border border-white/10 rounded-3xl p-3 shadow-[0_24px_70px_-15px_rgba(0,0,0,0.8),0_0_60px_-20px_rgba(59,130,246,0.25)]">
            {/* Titlebar */}
            <div className="bg-[#080b12] border-b border-white/5 px-4 py-3 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
                </div>
                <div className="ml-3 text-xs text-gray-400 font-mono flex items-center gap-2">
                  <i className="fa-solid fa-lock text-emerald-400 text-[10px]"></i>
                  <span>https://my-pc.trycloudflare.com</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>TLS 1.3 DIRECT P2P</span>
              </div>
            </div>

            {/* Dashboard Preview Grid */}
            <div className="bg-gradient-to-b from-[#0a0e17] to-[#0d121f] rounded-b-2xl p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
              {/* Tile 1 */}
              <div className="bg-[#121928]/80 border border-white/5 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎬</span>
                    <span className="font-bold text-sm text-white">4K Hardware Transcoding</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">0.04s SEEK</span>
                </div>
                <div className="bg-[#07090e] rounded-xl p-3 border border-white/5">
                  <div className="text-xs text-white font-semibold truncate mb-1">D:\Movies\Interstellar.2160p.HDR.mkv</div>
                  <div className="text-[10px] text-gray-400 mb-2.5">HEVC 10-Bit • 72.4 GB • Dolby Atmos Audio Track</div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="w-[58%] h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Tile 2 */}
              <div className="bg-[#121928]/80 border border-white/5 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎚️</span>
                    <span className="font-bold text-sm text-white">CoreAudio Volume Mixer</span>
                  </div>
                  <span className="text-[10px] text-blue-300 font-mono font-bold">60 FPS LIVE</span>
                </div>
                <div className="bg-[#07090e] rounded-xl p-3 border border-white/5 flex flex-col gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-300">🎧 Discord Voice</span>
                    <span className="text-white font-mono font-bold">85%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">🎵 Spotify Music</span>
                    <span className="text-emerald-400 font-mono font-bold">100%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">🎮 Game / Steam</span>
                    <span className="text-yellow-400 font-mono font-bold">60%</span>
                  </div>
                </div>
              </div>

              {/* Tile 3 */}
              <div className="bg-[#121928]/80 border border-white/5 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚡</span>
                    <span className="font-bold text-sm text-white">QuickDrop Transfer</span>
                  </div>
                  <span className="text-[10px] text-purple-300 font-mono font-bold">112 MB/s</span>
                </div>
                <div className="bg-[#07090e] rounded-xl p-3 border border-white/5">
                  <div className="text-xs text-white font-semibold truncate mb-1">📦 Wedding_Photos_Raw.zip</div>
                  <div className="text-[10px] text-gray-400 mb-2">14.8 GB • Direct Wi-Fi P2P Transfer</div>
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                    <i className="fa-solid fa-check text-[10px]"></i>
                    <span>Transferred in 2m 14s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>


      {/* ========================================================
          2. FEATURE GRID (Exactly from FeatureGrid.js)
         ======================================================== */}
      <ScrollReveal className="container mx-auto px-4 sm:px-6 max-w-6xl text-center">
        <span className="text-xs font-bold text-brand-400 uppercase tracking-widest block mb-2">BUILT FOR POWER USERS</span>
        <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">
          Everything You Need to Turn Your PC into a <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Private Powerhouse</span>
        </h2>
        <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto mb-12">
          No third-party cloud servers ever touch your files. Your computer does the heavy lifting, streaming, and encryption.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          {features.map((item, idx) => (
            <div
              key={idx}
              className="bg-[#0e121e]/90 border border-white/5 hover:border-blue-500/30 rounded-3xl p-6 flex flex-col justify-between transition-all hover:-translate-y-1 shadow-xl group"
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-brand-400 text-lg group-hover:scale-110 transition-transform">
                    <i className={`fa-solid ${item.icon}`}></i>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-blue-400 tracking-wider bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded">
                    {item.tag}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">{item.description}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-cyan-400 font-semibold">
                <span>Included in Pro Edition</span>
                <i className="fa-solid fa-check"></i>
              </div>
            </div>
          ))}
        </div>
      </ScrollReveal>


      {/* ========================================================
          3. INTERACTIVE LIVE DEMO (Exactly from InteractiveDemo.js)
         ======================================================== */}
      <ScrollReveal className="container mx-auto px-4 sm:px-6 max-w-6xl text-center">
        <div id="demo">
          <span className="text-xs font-bold text-brand-400 uppercase tracking-widest block mb-2">LIVE INTERACTIVE SHOWCASE</span>
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">
            Test the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Mobile Web Interface</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto mb-10">
            Interact with the live preview below to experience the responsive performance, 4K streaming, and audio mixer.
          </p>

          {/* Tab Navigation */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {[
              { id: "files", label: "📂 File Explorer & 4K Video" },
              { id: "screen", label: "🖥️ Screen Mirror & Controls" },
              { id: "system", label: "🎚️ App Volume Mixer & Tasks" },
              { id: "quickdrop", label: "⚡ QuickDrop File Share" },
              { id: "security", label: "🔒 Security & Emergency Word" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105"
                    : "bg-[#141422] text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Interactive Phone Shell */}
          <div className="max-w-2xl mx-auto bg-[#07090e] border-2 border-white/10 rounded-[36px] p-5 sm:p-7 shadow-2xl text-left relative overflow-hidden">
            {/* Phone Top Notch Bar */}
            <div className="flex justify-between items-center text-xs text-gray-400 border-b border-white/5 pb-3 mb-5 font-mono">
              <span className="text-white font-bold">11:58 PM</span>
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 text-[10px] font-bold">5G DIRECT</span>
                <i className="fa-solid fa-wifi text-emerald-400 text-xs"></i>
                <i className="fa-solid fa-battery-full text-white text-xs"></i>
              </div>
            </div>

            {/* TAB 1: FILES & 4K */}
            {activeTab === "files" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-2">
                    {["C:", "D:", "E:"].map((d) => (
                      <button
                        key={d}
                        onClick={() => { setActiveDrive(d); onToast(`Browsing drive ${d}\\`, "info"); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeDrive === d ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:text-white"
                          }`}
                      >
                        {d} Drive
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono" suppressHydrationWarning>{`${activeDrive}:\\Movies\\`}</span>
                </div>

                {/* Simulated Video Player */}
                <div className="bg-[#0b0f19] border border-white/10 rounded-2xl p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-white truncate">Interstellar.2160p.HDR.mkv</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded">HEVC 10-Bit • 72.4 GB</span>
                  </div>

                  <div className="w-full aspect-video rounded-xl bg-black/80 flex items-center justify-center relative overflow-hidden border border-white/5 mb-3">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-2 shadow-lg">
                        <i className="fa-solid fa-play text-lg ml-0.5"></i>
                      </div>
                      <span className="text-[11px] text-gray-400">4K Direct Streaming (Dolby Atmos 7.1)</span>
                    </div>
                  </div>

                  <div className="flex justify-between text-[10px] text-gray-400 font-mono mb-1">
                    <span>{calculateTime(videoProgress)}</span>
                    <span>02:49:03</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={videoProgress}
                    onChange={(e) => setVideoProgress(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer h-1.5 bg-white/10 rounded-lg mb-3"
                  />

                  <div className="flex gap-2">
                    <button onClick={() => setVideoProgress(Math.max(0, videoProgress - 5))} className="flex-1 bg-white/5 hover:bg-white/10 text-white text-xs py-1.5 rounded-lg">
                      -10s
                    </button>
                    <button onClick={() => setVideoProgress(Math.min(100, videoProgress + 5))} className="flex-1 bg-white/5 hover:bg-white/10 text-white text-xs py-1.5 rounded-lg">
                      +10s
                    </button>
                    <button onClick={() => onToast("Subtitles toggled: English (SDH)", "success")} className="flex-1 bg-white/5 hover:bg-white/10 text-white text-xs py-1.5 rounded-lg">
                      English (SDH)
                    </button>
                  </div>
                </div>

                {/* File list */}
                <div className="space-y-2 text-xs">
                  <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 flex justify-between">
                    <span className="text-white font-semibold">📁 Photos_2026</span>
                    <span className="text-gray-400">3,400 Items • 182 GB</span>
                  </div>
                  <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 flex justify-between">
                    <span className="text-white font-semibold">📁 Work_Projects</span>
                    <span className="text-gray-400">1,420 Items • 420 GB</span>
                  </div>
                  <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 flex justify-between">
                    <span className="text-white font-semibold">📁 Downloads</span>
                    <span className="text-gray-400">84 Items • 85 GB</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SCREEN MIRROR */}
            {activeTab === "screen" && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div className="text-sm font-bold text-white">Desktop Screen Mirror (60 FPS Ultra-Low Latency)</div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md font-mono font-bold">
                    Latency: 12ms
                  </span>
                </div>
                <div className="bg-[#05070a] rounded-2xl h-44 border border-white/10 flex flex-col items-center justify-center gap-2 text-center p-4">
                  <i className="fa-solid fa-desktop text-4xl text-blue-500/60 mb-1"></i>
                  <div className="text-xs text-white font-bold">Windows 11 Desktop (2560 x 1440)</div>
                  <div className="text-[11px] text-gray-500">Tap to click • Double tap to drag • Pinch to zoom</div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <button onClick={() => onToast("PC Screen Locked", "info")} className="bg-white/5 hover:bg-white/10 text-white text-xs py-2 rounded-xl border border-white/5 font-semibold">
                    🔒 Lock PC
                  </button>
                  <button onClick={() => onToast("PC Sleep Timer Started (30m)", "info")} className="bg-white/5 hover:bg-white/10 text-white text-xs py-2 rounded-xl border border-white/5 font-semibold">
                    ⏱️ Sleep Timer
                  </button>
                  <button onClick={() => onToast("Virtual Keyboard Toggled", "info")} className="bg-white/5 hover:bg-white/10 text-white text-xs py-2 rounded-xl border border-white/5 font-semibold">
                    ⌨️ Virtual Keyboard
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: VOLUME MIXER */}
            {activeTab === "system" && (
              <div>
                <div className="text-sm font-bold text-white mb-4">Windows CoreAudio Hardware Session Mixer</div>
                <div className="space-y-3">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-white font-semibold">🎧 Discord (Voice Call)</span>
                      <span className="text-blue-400 font-mono font-bold">{volumeDiscord}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={volumeDiscord} onChange={e => setVolumeDiscord(Number(e.target.value))} className="w-full accent-blue-500 cursor-pointer h-1.5 bg-white/10 rounded-lg" />
                  </div>

                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-white font-semibold">🎵 Spotify Music</span>
                      <span className="text-emerald-400 font-mono font-bold">{volumeSpotify}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={volumeSpotify} onChange={e => setVolumeSpotify(Number(e.target.value))} className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-white/10 rounded-lg" />
                  </div>

                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-white font-semibold">🎮 Game Audio / Steam</span>
                      <span className="text-yellow-400 font-mono font-bold">{volumeGame}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={volumeGame} onChange={e => setVolumeGame(Number(e.target.value))} className="w-full accent-yellow-500 cursor-pointer h-1.5 bg-white/10 rounded-lg" />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: QUICKDROP */}
            {activeTab === "quickdrop" && (
              <div>
                <div className="text-sm font-bold text-white mb-1">QuickDrop Wire-Speed P2P Transfer</div>
                <div className="text-xs text-gray-400 mb-4">Send gigabytes of files from your phone to PC without cables.</div>
                <div className="border-2 border-dashed border-blue-500/40 rounded-2xl p-8 text-center bg-blue-500/5">
                  <i className="fa-solid fa-cloud-arrow-up text-3xl text-blue-400 mb-2 block"></i>
                  <strong className="text-white block text-sm mb-1">Tap or Drag Files to Transfer to PC</strong>
                  <span className="text-[11px] text-gray-400">Auto-saves to PC Downloads • Wire-speed local network transfer</span>
                  <div className="mt-4">
                    <button onClick={() => onToast("Transferred 4K_Video.mov (4.2 GB) in 3.1s over P2P Wi-Fi", "success")} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all">
                      Simulate Upload
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: SECURITY */}
            {activeTab === "security" && (
              <div>
                <div className="text-sm font-bold text-white mb-2">Zero-Knowledge & Emergency Word Login</div>
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 mb-4 text-xs">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <i className="fa-solid fa-shield-halved"></i>
                    <span>100% Direct Encrypted P2P</span>
                  </div>
                  <div className="text-gray-400 mt-1">Zero central servers or telemetry. Keys reside strictly on your local computer.</div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <div className="text-gray-400 text-[10px]">Daily Phone Login</div>
                    <div className="text-white font-bold text-sm mt-0.5">4–8 Digit Master PIN</div>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <div className="text-gray-400 text-[10px]">Friend&apos;s PC / No Phone</div>
                    <div className="text-white font-bold text-sm mt-0.5">Secret Emergency Word</div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </ScrollReveal>


      {/* ========================================================
          4. SECURITY DEEP DIVE (Exactly from SecurityDeepDive.js)
         ======================================================== */}
      <ScrollReveal className="container mx-auto px-4 sm:px-6 max-w-6xl">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-brand-400 uppercase tracking-widest block mb-2">ZERO-KNOWLEDGE ARCHITECTURE</span>
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">
            Your Data Stays on <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Your Computer. Period.</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-base max-w-3xl mx-auto leading-relaxed">
            Big-tech cloud storage providers scan your personal photos, files, and documents for targeted ads and AI models. Personal Cloud Pro operates on 100% private zero-knowledge infrastructure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {securityCards.map((card, idx) => (
            <div key={idx} className="bg-[#0b0e18] border border-white/5 hover:border-blue-500/30 rounded-3xl p-6 transition-all hover:-translate-y-1 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 text-xl mb-4">
                <i className={`fa-solid ${card.icon}`}></i>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{card.title}</h3>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">{card.description}</p>
            </div>
          ))}
        </div>
      </ScrollReveal>


      {/* ========================================================
          5. COMPARISON TABLE (Exactly from Comparison.js)
         ======================================================== */}
      <ScrollReveal className="container mx-auto px-4 sm:px-6 max-w-6xl text-center">
        <span className="text-xs font-bold text-brand-400 uppercase tracking-widest block mb-2">WHY PAY ENDLESS SUBSCRIPTIONS?</span>
        <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">
          How Personal Cloud Pro <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Crushes Big Tech</span>
        </h2>
        <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto mb-10">
          Compare the cost, privacy, and feature set of Personal Cloud Pro against standard cloud drives and remote desktop tools.
        </p>

        <div className="overflow-x-auto rounded-3xl border border-white/10 bg-[#0a0d16] shadow-2xl">
          <table className="w-full text-left text-xs sm:text-sm min-w-[680px]">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/10 text-gray-400 uppercase tracking-wider font-mono text-[11px]">
                <th className="py-4 px-6">Feature</th>
                <th className="py-4 px-6 text-blue-300 font-extrabold bg-blue-500/10">Personal Cloud Pro</th>
                <th className="py-4 px-6 text-gray-400">Google Drive / Dropbox</th>
                <th className="py-4 px-6 text-gray-400">TeamViewer / AnyDesk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {comparisonRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-6 font-bold text-white">{row.feature}</td>
                  <td className="py-4 px-6 font-bold text-emerald-400 bg-blue-500/[0.04]">
                    <i className="fa-solid fa-check text-emerald-400 mr-2"></i>
                    {row.us}
                  </td>
                  <td className="py-4 px-6 text-gray-400">{row.gdrive}</td>
                  <td className="py-4 px-6 text-gray-400">{row.teamviewer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollReveal>


      {/* ========================================================
          6. PRICING SECTION (Exactly from Pricing.js)
         ======================================================== */}
      <div id="pricing-section" className="scroll-mt-24">
        <ScrollReveal className="container mx-auto px-4 sm:px-6 max-w-6xl text-center">
          <span className="text-xs font-bold text-brand-400 uppercase tracking-widest block mb-2">TRANSPARENT ONE-TIME PRICING</span>
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">
            Pay Once. <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Own Your Cloud Forever.</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto mb-12">
            Zero subscriptions. Zero hidden fees. 30-day money-back guarantee.
          </p>

          <div className={`grid grid-cols-1 ${plans.length === 2 ? "md:grid-cols-2 max-w-3xl mx-auto" : plans.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-4"} gap-6 text-left items-stretch`}>
            {plans.map((plan) => {
              const discountPercent = plan.originalPrice > plan.price && plan.price > 0
                ? Math.round(((plan.originalPrice - plan.price) / plan.originalPrice) * 100)
                : 0;

              return (
                <div
                  key={plan.id}
                  className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all shadow-xl ${plan.popular
                      ? "bg-gradient-to-b from-[#161e30] to-[#0c111c] border-2 border-blue-500/60 shadow-[0_0_40px_rgba(59,130,246,0.2)] md:-translate-y-2"
                      : "bg-[#0c0f18] border border-white/10"
                    }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className={`font-mono text-[10px] font-extrabold tracking-wider ${plan.popular ? "text-blue-400" : "text-gray-400"}`}>
                        {plan.badge}
                      </span>
                      {discountPercent > 0 && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                          SAVE {discountPercent}%
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-white mb-2">{plan.name}</h3>
                    <p className="text-gray-400 text-xs sm:text-sm min-h-[40px] leading-relaxed mb-6">{plan.description}</p>

                    <div className="flex items-baseline gap-2 mb-6">
                      <span className="text-4xl sm:text-5xl font-black text-white">
                        {currency === "INR" ? "₹" : "$"}{plan.price}
                      </span>
                      <span className="text-sm text-gray-500 line-through">
                        {currency === "INR" ? "₹" : "$"}{plan.originalPrice}
                      </span>
                      <span className="text-xs text-emerald-400 font-bold ml-1">One-Time</span>
                    </div>

                    <div className="pt-4 border-t border-white/10 mb-6">
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                        Included Features:
                      </div>
                      <ul className="space-y-2.5 text-xs text-gray-300">
                        {plan.features.map((feat: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <i className="fa-solid fa-check text-emerald-400 text-xs shrink-0 mt-0.5"></i>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <button
                    onClick={() => (plan as any).isTrial ? (onOpenTrial && onOpenTrial()) : onBuyPro({ id: `personal-cloud-${plan.id}`, title: `Personal Cloud - ${plan.name}`, amount: plan.price })}
                    className={`w-full py-3.5 rounded-xl font-black text-xs sm:text-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${plan.popular
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/30"
                        : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                      }`}
                  >
                    <span>{plan.cta}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </ScrollReveal>
      </div>

      {/* ========================================================
          7. FAQ SECTION (Exactly from FAQ.js)
         ======================================================== */}
      <ScrollReveal className="container mx-auto px-4 sm:px-6 max-w-4xl text-center">
        <span className="text-xs font-bold text-brand-400 uppercase tracking-widest block mb-2">FREQUENTLY ASKED QUESTIONS</span>
        <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">
          Got Questions? <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">We Have Answers.</span>
        </h2>
        <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto mb-10">
          Everything you need to know about the product, licensing, and security.
        </p>

        <div className="space-y-3 text-left">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  isOpen ? "bg-[#111624] border-blue-500/50" : "bg-[#0b0e18] border-white/5 hover:border-white/20"
                }`}
                onClick={() => setOpenFaq(isOpen ? null : idx)}
              >
                <div className="flex justify-between items-center gap-4">
                  <h3 className="text-sm sm:text-base font-bold text-white">{faq.q}</h3>
                  <span className={`text-blue-400 text-lg font-bold transition-transform ${isOpen ? "rotate-45" : ""}`}>
                    +
                  </span>
                </div>
                <AnimatePresence>
                  {isOpen && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="text-xs sm:text-sm text-gray-300 mt-3 pt-3 border-t border-white/5 leading-relaxed"
                    >
                      {faq.a}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </ScrollReveal>

    </div>
  );
};
