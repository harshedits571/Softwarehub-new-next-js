"use client";

import React, { useEffect, useState } from "react";
import { getDoc, doc, setDoc } from "firebase/firestore";
import { firestore } from "../../../utils/firebase";

export default function SettingsConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Site Identity
  const [discordUrl, setDiscordUrl] = useState("");
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState("");

  // Section Order / Visibility (Default static list for UI layout matching)
  const [sections, setSections] = useState([
    { id: "adobeSoftware", icon: "🎨", title: "Adobe Software", sub: "Premium CC Apps", visible: true },
    { id: "plugins", icon: "🔌", title: "Plugins", sub: "VFX & Editing Add-ons", visible: true },
    { id: "scripts", icon: "📜", title: "Scripts & Extensions", sub: "Workflow Automation", visible: true },
    { id: "assets", icon: "📦", title: "Assets", sub: "Overlays, LUTS, Sound FX", visible: true },
    { id: "utilities", icon: "🛠️", title: "Utilities & Other Software", sub: "Essential Tools", visible: true },
    { id: "courses", icon: "🎓", title: "Courses", sub: "Video Masterclasses", visible: true },
    { id: "simplePluginsList", icon: "📋", title: "100+ Plugins List", sub: "Quick Downloads", visible: true },
  ]);

  // Section Names
  const [adobeSoftwareName, setAdobeSoftwareName] = useState("");
  const [pluginsName, setPluginsName] = useState("");
  const [scriptsName, setScriptsName] = useState("");
  const [assetsName, setAssetsName] = useState("");
  const [utilitiesName, setUtilitiesName] = useState("");
  const [coursesName, setCoursesName] = useState("");
  const [simplePluginsName, setSimplePluginsName] = useState("");

  // Site Text
  const [heroTitle1, setHeroTitle1] = useState("");
  const [heroTitle2, setHeroTitle2] = useState("");
  const [heroDescription, setHeroDescription] = useState("");
  const [pluginsPackTitle, setPluginsPackTitle] = useState("");
  const [pluginsPackDescription, setPluginsPackDescription] = useState("");
  const [pluginsListTitle, setPluginsListTitle] = useState("");
  const [pluginsListDescription, setPluginsListDescription] = useState("");
  const [missingResourceTitle, setMissingResourceTitle] = useState("");
  const [missingResourceDescription, setMissingResourceDescription] = useState("");

  // Pricing
  const [proPrice, setProPrice] = useState(10);
  const [proPriceUSD, setProPriceUSD] = useState(0.99);
  const [rzpKey, setRzpKey] = useState("");

  // Auth Settings
  const [authForgotTitle, setAuthForgotTitle] = useState("");
  const [authForgotMessage, setAuthForgotMessage] = useState("");
  const [authForgotBtnText, setAuthForgotBtnText] = useState("");
  const [authForgotBtnUrl, setAuthForgotBtnUrl] = useState("");

  const [toasts, setToasts] = useState<{ id: string; msg: string; type: "success" | "error" | "info" }[]>([]);
  const showToast = (msg: string, type: "success" | "error" | "info" = "info") => {
    const toastId = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id: toastId, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 4000);
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(firestore, "settings", "globalConfig"));
      if (snap.exists()) {
        const data = snap.data();
        
        setDiscordUrl(data.global?.discordUrl || "");
        setQrCodeImageUrl(data.global?.qrCodeImageUrl || "");

        const names = data.sectionNames || {};
        setAdobeSoftwareName(names.adobeSoftware || "");
        setPluginsName(names.plugins || "");
        setScriptsName(names.scripts || "");
        setAssetsName(names.assets || "");
        setUtilitiesName(names.utilities || "");
        setCoursesName(names.courses || "");
        setSimplePluginsName(names.simplePluginsList || "");

        const text = data.siteText || {};
        setHeroTitle1(text.heroTitle1 || "");
        setHeroTitle2(text.heroTitle2 || "");
        setHeroDescription(text.heroDescription || "");
        setPluginsPackTitle(text.pluginsPackTitle || "");
        setPluginsPackDescription(text.pluginsPackDescription || "");
        setPluginsListTitle(text.pluginsListTitle || "");
        setPluginsListDescription(text.pluginsListDescription || "");
        setMissingResourceTitle(text.missingResourceTitle || "");
        setMissingResourceDescription(text.missingResourceDescription || "");

        const pricing = data.pricing || {};
        setProPrice(pricing.proPrice || 10);
        setProPriceUSD(pricing.proPriceUSD || 0.99);
        setRzpKey(pricing.rzpKey || "");

        const authSet = data.authSettings || {};
        setAuthForgotTitle(authSet.forgotTitle || "");
        setAuthForgotMessage(authSet.forgotMessage || "");
        setAuthForgotBtnText(authSet.forgotBtnText || "");
        setAuthForgotBtnUrl(authSet.forgotBtnUrl || "");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(firestore, "settings", "globalConfig"), {
        global: { discordUrl, qrCodeImageUrl, siteName1: "Harsh", siteName2: "Edits" }
      }, { merge: true });
      showToast("Identity settings saved!", "success");
    } catch (err: any) {
      showToast("Error saving: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(firestore, "settings", "globalConfig"), {
        sectionNames: {
          adobeSoftware: adobeSoftwareName,
          plugins: pluginsName,
          scripts: scriptsName,
          assets: assetsName,
          utilities: utilitiesName,
          courses: coursesName,
          simplePluginsList: simplePluginsName,
        },
        siteText: {
          heroTitle1, heroTitle2, heroDescription,
          pluginsPackTitle, pluginsPackDescription,
          pluginsListTitle, pluginsListDescription,
          missingResourceTitle, missingResourceDescription,
        },
        pricing: { proPrice, proPriceUSD, rzpKey, currency: "INR" }
      }, { merge: true });
      showToast("Content configuration saved!", "success");
    } catch (err: any) {
      showToast("Error saving: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAuth = async () => {
    setSaving(true);
    try {
      await setDoc(doc(firestore, "settings", "globalConfig"), {
        authSettings: {
          forgotTitle: authForgotTitle,
          forgotMessage: authForgotMessage,
          forgotBtnText: authForgotBtnText,
          forgotBtnUrl: authForgotBtnUrl,
        }
      }, { merge: true });
      showToast("Auth settings saved!", "success");
    } catch (err: any) {
      showToast("Error saving: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (id: string) => {
    setSections(sections.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>
        ))}
      </div>

      {/* Top Grid: settings & Order */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Col: Links & Identity */}
        <div className="glass-card p-8 border border-indigo-500/20 h-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-2xl shadow-lg">
              🔗
            </div>
            <div>
              <h4 className="text-2xl font-bold text-white">Site Identity & Links</h4>
              <p className="text-sm text-gray-400">Manage external links and QR code</p>
            </div>
          </div>

          <form onSubmit={handleSaveIdentity} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Discord Invite URL</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">🎮</span>
                </div>
                <input 
                  type="url" 
                  placeholder="https://discord.gg/..." 
                  value={discordUrl}
                  onChange={(e) => setDiscordUrl(e.target.value)}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none premium-transition" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">QR Code Image</label>
              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                  placeholder="enter image URL or select from assets..."
                  value={qrCodeImageUrl}
                  onChange={(e) => setQrCodeImageUrl(e.target.value)}
                />
                <button type="button" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 rounded-lg transition-colors whitespace-nowrap flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  Assets
                </button>
              </div>

              {/* QR Preview Box */}
              <div className="w-64 h-64 mx-auto bg-gray-900/50 rounded-xl border-2 border-dashed border-gray-700 flex items-center justify-center overflow-hidden relative group hover:border-indigo-500 transition-colors">
                {qrCodeImageUrl ? (
                  <img src={qrCodeImageUrl} className="w-full h-full object-contain" alt="QR Preview" />
                ) : (
                  <div className="text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4c1 0 2 1 2 2v6c0 1-1 2-2 2H6c-1 0-2-1-2-2v-6c0-1 1-2 2-2h6z"></path>
                    </svg>
                    <span className="text-sm">QR Code Preview</span>
                  </div>
                )}
              </div>
            </div>

            <button type="submit" disabled={saving} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl premium-transition shadow-lg shadow-blue-500/20 transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {saving ? "Saving..." : "Save Identity Settings"}
            </button>
          </form>
        </div>

        {/* Right Col: Section Order */}
        <div className="glass-card p-8 border border-purple-500/20 h-full flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-2xl shadow-lg">
              🔀
            </div>
            <div>
              <h4 className="text-2xl font-bold text-white">Section Order</h4>
              <p className="text-sm text-gray-400">Drag items to rearrange homepage</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-3">
              {sections.map((sec) => (
                <div key={sec.id} className="flex items-center gap-4 bg-gray-800/50 p-4 rounded-xl border border-gray-700 hover:border-purple-500/50 transition-colors group cursor-move">
                  <div className="text-gray-500 group-hover:text-purple-400 cursor-grab">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16"></path></svg>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center text-xl shadow-inner group-hover:bg-purple-500/20 transition-colors">
                    {sec.icon}
                  </div>
                  <div className="flex-1">
                    <h5 className="text-white font-bold text-sm leading-tight group-hover:text-purple-300 transition-colors">{sec.title}</h5>
                    <p className="text-xs text-gray-400">{sec.sub}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={sec.visible} onChange={() => toggleSection(sec.id)} />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3 rounded-xl premium-transition shadow-lg flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              <span>Save Order</span>
            </button>
            <button className="bg-gray-700 hover:bg-gray-600 text-white font-bold px-4 rounded-xl transition-colors flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Section Names & Site Text Config */}
      <div className="glass-card p-8 border border-blue-500/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-2xl shadow-lg">📝</div>
          <div>
            <h4 className="text-2xl font-bold text-white">Content Configuration</h4>
            <p className="text-sm text-gray-400">Manage section names and site text</p>
          </div>
        </div>

        <form onSubmit={handleSaveContent} className="space-y-8">
          {/* Section Names */}
          <div>
            <h5 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-gray-700 pb-2">
              Section Display Names
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Adobe Software</label>
                <input type="text" placeholder="Adobe Software" value={adobeSoftwareName} onChange={e => setAdobeSoftwareName(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Plugins</label>
                <input type="text" placeholder="Plugins" value={pluginsName} onChange={e => setPluginsName(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Scripts</label>
                <input type="text" placeholder="Scripts & Extensions" value={scriptsName} onChange={e => setScriptsName(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Assets</label>
                <input type="text" placeholder="Assets" value={assetsName} onChange={e => setAssetsName(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Utilities</label>
                <input type="text" placeholder="Utilities" value={utilitiesName} onChange={e => setUtilitiesName(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Courses</label>
                <input type="text" placeholder="Courses" value={coursesName} onChange={e => setCoursesName(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">100+ Plugins List</label>
                <input type="text" placeholder="100+ Plugins List" value={simplePluginsName} onChange={e => setSimplePluginsName(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
          </div>

          {/* Site Text */}
          <div>
            <h5 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-gray-700 pb-2">
              Site Text Content
            </h5>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800/20 p-5 rounded-xl border border-gray-700/50">
                <h6 className="text-sm font-bold text-indigo-400 mb-4 uppercase tracking-wider">Hero Section</h6>
                <div className="space-y-3">
                  <input type="text" placeholder="Title Line 1" value={heroTitle1} onChange={e => setHeroTitle1(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                  <input type="text" placeholder="Title Line 2" value={heroTitle2} onChange={e => setHeroTitle2(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                  <textarea rows={2} placeholder="Hero Description" value={heroDescription} onChange={e => setHeroDescription(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none"></textarea>
                </div>
              </div>

              <div className="bg-gray-800/20 p-5 rounded-xl border border-gray-700/50">
                <h6 className="text-sm font-bold text-purple-400 mb-4 uppercase tracking-wider">100+ Plugins Pack</h6>
                <div className="space-y-3">
                  <input type="text" placeholder="Title" value={pluginsPackTitle} onChange={e => setPluginsPackTitle(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                  <textarea rows={2} placeholder="Description" value={pluginsPackDescription} onChange={e => setPluginsPackDescription(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none"></textarea>
                </div>
              </div>

              <div className="bg-gray-800/20 p-5 rounded-xl border border-gray-700/50">
                <h6 className="text-sm font-bold text-blue-400 mb-4 uppercase tracking-wider">Plugins List Page</h6>
                <div className="space-y-3">
                  <input type="text" placeholder="Page Title" value={pluginsListTitle} onChange={e => setPluginsListTitle(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                  <textarea rows={2} placeholder="Description" value={pluginsListDescription} onChange={e => setPluginsListDescription(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none"></textarea>
                </div>
              </div>

              <div className="bg-gray-800/20 p-5 rounded-xl border border-gray-700/50">
                <h6 className="text-sm font-bold text-green-400 mb-4 uppercase tracking-wider">Missing Resource</h6>
                <div className="space-y-3">
                  <input type="text" placeholder="Title" value={missingResourceTitle} onChange={e => setMissingResourceTitle(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                  <textarea rows={2} placeholder="Description" value={missingResourceDescription} onChange={e => setMissingResourceDescription(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none"></textarea>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Settings */}
          <div className="mt-8 pt-8 border-t border-gray-700">
            <h5 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-gray-700 pb-2">
              💰 Pricing & Payment Configuration
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gray-800/20 p-5 rounded-xl border border-gray-700/50">
                <label className="block text-sm font-medium text-gray-400 mb-2">Pro Access Price (INR)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <input type="number" placeholder="10" value={proPrice} onChange={e => setProPrice(Number(e.target.value))} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-8 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-bold" />
                </div>
                <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-widest">For Indian Visitors</p>
              </div>
              <div className="bg-gray-800/20 p-5 rounded-xl border border-gray-700/50">
                <label className="block text-sm font-medium text-gray-400 mb-2">Pro Access Price (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input type="number" placeholder="0.99" step="0.01" value={proPriceUSD} onChange={e => setProPriceUSD(Number(e.target.value))} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-8 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-bold" />
                </div>
                <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-widest">For Foreign Visitors</p>
              </div>
              <div className="bg-gray-800/20 p-5 rounded-xl border border-gray-700/50">
                <label className="block text-sm font-medium text-gray-400 mb-2">Razorpay Public Key</label>
                <input type="text" placeholder="rzp_live_..." value={rzpKey} onChange={e => setRzpKey(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-widest">Live or Test Key</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" disabled={saving} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-3 px-8 rounded-xl premium-transition shadow-lg shadow-blue-500/20 transform hover:-translate-y-0.5 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {saving ? "Saving..." : "Save Content Configuration"}
            </button>
          </div>
        </form>
      </div>

      {/* Authentication Settings */}
      <div className="mt-8 pt-8 border-t border-gray-700">
        <h3 className="text-2xl font-bold text-white mb-6">Authentication Settings (Auth Page)</h3>
        <div className="glass-card p-6 border border-indigo-500/20">
          <h5 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-gray-700 pb-2">
            Forgot Password Modal
          </h5>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Modal Title</label>
              <input type="text" placeholder="e.g. Reset Password" value={authForgotTitle} onChange={e => setAuthForgotTitle(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Modal Message</label>
              <textarea rows={3} placeholder="e.g. Please contact the administrator via WhatsApp to reset your password." value={authForgotMessage} onChange={e => setAuthForgotMessage(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none"></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Wrapper Button Text</label>
              <input type="text" placeholder="e.g. Contact Admin" value={authForgotBtnText} onChange={e => setAuthForgotBtnText(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Action Button URL</label>
              <input type="text" placeholder="e.g. https://wa.me/..." value={authForgotBtnUrl} onChange={e => setAuthForgotBtnUrl(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button type="button" onClick={handleSaveAuth} disabled={saving} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-2 px-6 rounded-lg premium-transition shadow-lg shadow-purple-500/20 transform hover:-translate-y-0.5">
              {saving ? "Saving..." : "Save Auth Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
