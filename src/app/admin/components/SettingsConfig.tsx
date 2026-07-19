"use client";

import React, { useEffect, useState } from "react";
import { ref, get, set } from "firebase/database";
import { db, firestore } from "../../../utils/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export default function SettingsConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toasts, setToasts] = useState<{ id: string; msg: string; type: "success" | "error" | "info" }[]>([]);
  const showToast = (msg: string, type: "success" | "error" | "info" = "info") => {
    const toastId = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id: toastId, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 4000);
  };

  // Migration States
  const [migrating, setMigrating] = useState(false);
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
  const [migrationProgress, setMigrationProgress] = useState(0);

  // Site Identity & Socials
  const [discordUrl, setDiscordUrl] = useState("");
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState("");
  const [siteName1, setSiteName1] = useState("Harsh");
  const [siteName2, setSiteName2] = useState("Edits");

  // Section Names
  const [adobeSoftwareName, setAdobeSoftwareName] = useState("");
  const [pluginsName, setPluginsName] = useState("");
  const [scriptsName, setScriptsName] = useState("");
  const [assetsName, setAssetsName] = useState("");
  const [utilitiesName, setUtilitiesName] = useState("");
  const [coursesName, setCoursesName] = useState("");
  const [simplePluginsName, setSimplePluginsName] = useState("");

  // Site Hero & Announcement Text
  const [heroTitle1, setHeroTitle1] = useState("");
  const [heroTitle2, setHeroTitle2] = useState("");
  const [heroDescription, setHeroDescription] = useState("");
  const [pluginsPackTitle, setPluginsPackTitle] = useState("");
  const [pluginsPackDescription, setPluginsPackDescription] = useState("");
  const [pluginsListTitle, setPluginsListTitle] = useState("");
  const [pluginsListDescription, setPluginsListDescription] = useState("");
  const [missingResourceTitle, setMissingResourceTitle] = useState("");
  const [missingResourceDescription, setMissingResourceDescription] = useState("");

  // Pricing & Credentials
  const [proPrice, setProPrice] = useState(10);
  const [proPriceUSD, setProPriceUSD] = useState(0.99);
  const [rzpKey, setRzpKey] = useState("");

  const loadSettings = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(firestore, "settings", "globalConfig"));
      if (snap.exists()) {
        const data = snap.data();

        // Identity
        setDiscordUrl(data.global?.discordUrl || "");
        setQrCodeImageUrl(data.global?.qrCodeImageUrl || "");
        setSiteName1(data.global?.siteName1 || "Harsh");
        setSiteName2(data.global?.siteName2 || "Edits");

        // Section Labels
        const names = data.sectionNames || {};
        setAdobeSoftwareName(names.adobeSoftware || "");
        setPluginsName(names.plugins || "");
        setScriptsName(names.scripts || "");
        setAssetsName(names.assets || "");
        setUtilitiesName(names.utilities || "");
        setCoursesName(names.courses || "");
        setSimplePluginsName(names.simplePluginsList || "");

        // Site text
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

        // Pricing
        const pricing = data.pricing || {};
        setProPrice(pricing.proPrice || 10);
        setProPriceUSD(pricing.proPriceUSD || 0.99);
        setRzpKey(pricing.rzpKey || "");
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const global = {
        discordUrl,
        qrCodeImageUrl,
        siteName1,
        siteName2,
      };

      const sectionNames = {
        adobeSoftware: adobeSoftwareName,
        plugins: pluginsName,
        scripts: scriptsName,
        assets: assetsName,
        utilities: utilitiesName,
        courses: coursesName,
        simplePluginsList: simplePluginsName,
      };

      const siteText = {
        heroTitle1,
        heroTitle2,
        heroDescription,
        pluginsPackTitle,
        pluginsPackDescription,
        pluginsListTitle,
        pluginsListDescription,
        missingResourceTitle,
        missingResourceDescription,
      };

      const pricing = {
        proPrice,
        proPriceUSD,
        rzpKey,
        currency: "INR",
      };

      await setDoc(doc(firestore, "settings", "globalConfig"), {
        global,
        sectionNames,
        siteText,
        pricing
      });

      showToast("Branding and pricing configuration saved successfully!", "success");
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      showToast("Failed to save settings: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const addLog = (msg: string) => {
    setMigrationLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleMigrateToFirestore = async () => {
    if (!window.confirm("Are you sure you want to migrate all data from Realtime Database to Cloud Firestore? This will overwrite matching documents in Firestore.")) {
      return;
    }
    setMigrating(true);
    setMigrationProgress(0);
    setMigrationLogs([]);
    addLog("Starting client-side database migration...");

    try {
      // 1. Settings
      addLog("Migrating global settings...");
      const settingsSnap = await get(ref(db, "settings"));
      if (settingsSnap.exists()) {
        await setDoc(doc(firestore, "settings", "globalConfig"), settingsSnap.val());
        addLog("✅ Global settings migrated successfully.");
      }
      setMigrationProgress(10);

      // 2. Users
      addLog("Fetching user profiles...");
      const usersSnap = await get(ref(db, "users"));
      if (usersSnap.exists()) {
        const usersData = usersSnap.val();
        const uids = Object.keys(usersData);
        addLog(`Found ${uids.length} users to migrate.`);
        for (let i = 0; i < uids.length; i++) {
          const uid = uids[i];
          const cleanProfile = JSON.parse(JSON.stringify(usersData[uid]));
          try {
            await setDoc(doc(firestore, "users", uid), cleanProfile);
          } catch (err: any) {
            addLog(`❌ Failed writing user [${uid}]: ${err.message}`);
            throw err;
          }
        }
        addLog(`✅ Migrated ${uids.length} user profiles.`);
      }
      setMigrationProgress(30);

      // 3. Transactions
      addLog("Fetching transaction history...");
      const txSnap = await get(ref(db, "transactions"));
      if (txSnap.exists()) {
        const txData = txSnap.val();
        const txIds = Object.keys(txData);
        addLog(`Found ${txIds.length} transactions to migrate.`);
        for (let i = 0; i < txIds.length; i++) {
          const txId = txIds[i];
          const cleanTx = JSON.parse(JSON.stringify(txData[txId]));
          await setDoc(doc(firestore, "transactions", txId), cleanTx);
        }
        addLog(`✅ Migrated ${txIds.length} transaction records.`);
      }
      setMigrationProgress(50);

      // 4. Products (Adobe Software, Plugins, Scripts, Creative Assets, Utilities, Video Courses, Lists)
      const categories = [
        "adobeSoftware",
        "plugins",
        "scripts",
        "assets",
        "utilities",
        "courses",
        "simplePluginsList"
      ];
      addLog("Fetching all product listings...");
      let totalProducts = 0;
      for (const cat of categories) {
        addLog(`Migrating category: ${cat}...`);
        const catSnap = await get(ref(db, cat));
        if (catSnap.exists()) {
          const items = catSnap.val();
          const itemIds = Object.keys(items);
          for (let i = 0; i < itemIds.length; i++) {
            const itemId = itemIds[i];
            const cleanItem = JSON.parse(JSON.stringify({
              ...items[itemId],
              Category: cat,
              status: items[itemId].status || "approved"
            }));
            await setDoc(doc(firestore, "products", itemId), cleanItem);
            totalProducts++;
          }
          addLog(`✅ Migrated ${itemIds.length} products from ${cat}.`);
        }
      }
      addLog(`✅ Total products migrated: ${totalProducts}`);
      setMigrationProgress(75);

      // 5. Ratings, Messages, Broken Links, Audit Logs
      addLog("Migrating feedback ratings...");
      const ratingsSnap = await get(ref(db, "ratings"));
      if (ratingsSnap.exists()) {
        const ratingsData = ratingsSnap.val();
        let ratingCount = 0;
        for (const itemId in ratingsData) {
          const versions = ratingsData[itemId];
          for (const versionKey in versions) {
            const versionNode = versions[versionKey];
            for (const ratingId in versionNode) {
              const rating = versionNode[ratingId];
              const cleanRating = JSON.parse(JSON.stringify({
                ...rating,
                resourceId: itemId,
                version: versionKey.replace(/_/g, ".")
              }));
              await setDoc(doc(firestore, "ratings", ratingId), cleanRating);
              ratingCount++;
            }
          }
        }
        addLog(`✅ Migrated ${ratingCount} rating feedbacks.`);
      }

      addLog("Migrating broken link reports...");
      const reportsSnap = await get(ref(db, "brokenLinkReports"));
      if (reportsSnap.exists()) {
        const reportsData = reportsSnap.val();
        for (const reportId in reportsData) {
          await setDoc(doc(firestore, "brokenLinkReports", reportId), JSON.parse(JSON.stringify(reportsData[reportId])));
        }
        addLog(`✅ Migrated broken link reports.`);
      }

      addLog("Migrating support messages...");
      const msgSnap = await get(ref(db, "messageRequests"));
      if (msgSnap.exists()) {
        const msgData = msgSnap.val();
        for (const msgId in msgData) {
          await setDoc(doc(firestore, "userMessages", msgId), JSON.parse(JSON.stringify(msgData[msgId])));
        }
        addLog(`✅ Migrated support messages.`);
      }

      addLog("Migrating activity audit logs...");
      const logsSnap = await get(ref(db, "auditLogs"));
      if (logsSnap.exists()) {
        const logsData = logsSnap.val();
        for (const logId in logsData) {
          await setDoc(doc(firestore, "auditLogs", logId), JSON.parse(JSON.stringify(logsData[logId])));
        }
        addLog(`✅ Migrated audit logs.`);
      }

      setMigrationProgress(100);
      addLog("🎉 DATABASE MIGRATION TO FIRESTORE COMPLETED SUCCESSFULLY!");
      alert("Database migrated successfully!");
    } catch (err: any) {
      console.error(err);
      addLog(`❌ Error: ${err.message}`);
      alert("Migration failed: " + err.message);
    } finally {
      setMigrating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-semibold">Loading system settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white animate-fade-in max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Global Configurations</h2>
        <p className="text-gray-400 text-xs mt-1">Configure pricing values, branding taglines, and category names</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: Site Identity & Socials */}
        <div className="glass-card p-6 rounded-2xl space-y-6">
          <h3 className="text-sm font-bold text-indigo-400 border-b border-white/5 pb-2">
            🎨 Branding & Identity Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">Site Brand Title Line 1</label>
              <input
                type="text"
                value={siteName1}
                onChange={(e) => setSiteName1(e.target.value)}
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">Site Brand Title Line 2</label>
              <input
                type="text"
                value={siteName2}
                onChange={(e) => setSiteName2(e.target.value)}
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">Discord Community Invite URL</label>
              <input
                type="url"
                value={discordUrl}
                onChange={(e) => setDiscordUrl(e.target.value)}
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">UPI QR Code Image Link (Optional)</label>
              <input
                type="url"
                value={qrCodeImageUrl}
                onChange={(e) => setQrCodeImageUrl(e.target.value)}
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Premium Pricing */}
        <div className="glass-card p-6 rounded-2xl space-y-6">
          <h3 className="text-sm font-bold text-emerald-400 border-b border-white/5 pb-2">
            💳 Premium Memberships Pricing
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">Lifetime Pro Price (INR)</label>
              <input
                type="number"
                value={proPrice}
                onChange={(e) => setProPrice(Number(e.target.value))}
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">Lifetime Pro Price (USD)</label>
              <input
                type="number"
                step="0.01"
                value={proPriceUSD}
                onChange={(e) => setProPriceUSD(Number(e.target.value))}
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">Razorpay Key ID</label>
              <input
                type="text"
                value={rzpKey}
                onChange={(e) => setRzpKey(e.target.value)}
                placeholder="rzp_live_..."
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Custom Category Titles */}
        <div className="glass-card p-6 rounded-2xl space-y-6">
          <h3 className="text-sm font-bold text-blue-400 border-b border-white/5 pb-2">
            🏷️ Category Section Names
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { id: "adobeSoftware", label: "Adobe Software", state: adobeSoftwareName, set: setAdobeSoftwareName },
              { id: "plugins", label: "After Effects Plugins", state: pluginsName, set: setPluginsName },
              { id: "scripts", label: "Scripts & Extensions", state: scriptsName, set: setScriptsName },
              { id: "assets", label: "Creative Assets", state: assetsName, set: setAssetsName },
              { id: "utilities", label: "Utilities", state: utilitiesName, set: setUtilitiesName },
              { id: "courses", label: "Video Courses", state: coursesName, set: setCoursesName },
              { id: "simplePluginsList", label: "100+ Plugins List", state: simplePluginsName, set: setSimplePluginsName },
            ].map((col) => (
              <div key={col.id} className="space-y-2">
                <label className="text-xs text-gray-400 font-bold">{col.label} Section Label</label>
                <input
                  type="text"
                  value={col.state}
                  onChange={(e) => col.set(e.target.value)}
                  className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Site Hero & Announcement Taglines */}
        <div className="glass-card p-6 rounded-2xl space-y-6">
          <h3 className="text-sm font-bold text-purple-400 border-b border-white/5 pb-2">
            📢 Homepage Taglines & Details Text
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">Hero Title Line 1</label>
              <input
                type="text"
                value={heroTitle1}
                onChange={(e) => setHeroTitle1(e.target.value)}
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">Hero Title Line 2</label>
              <input
                type="text"
                value={heroTitle2}
                onChange={(e) => setHeroTitle2(e.target.value)}
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-bold">Hero Tagline Description details</label>
            <input
              type="text"
              value={heroDescription}
              onChange={(e) => setHeroDescription(e.target.value)}
              className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">Plugins Package Panel Header</label>
              <input
                type="text"
                value={pluginsPackTitle}
                onChange={(e) => setPluginsPackTitle(e.target.value)}
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">Plugins Package Panel Details</label>
              <input
                type="text"
                value={pluginsPackDescription}
                onChange={(e) => setPluginsPackDescription(e.target.value)}
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">100+ Plugins Table Header</label>
              <input
                type="text"
                value={pluginsListTitle}
                onChange={(e) => setPluginsListTitle(e.target.value)}
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">100+ Plugins Table Details</label>
              <input
                type="text"
                value={pluginsListDescription}
                onChange={(e) => setPluginsListDescription(e.target.value)}
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">Request Resource Section Header</label>
              <input
                type="text"
                value={missingResourceTitle}
                onChange={(e) => setMissingResourceTitle(e.target.value)}
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold">Request Resource Section Details</label>
              <input
                type="text"
                value={missingResourceDescription}
                onChange={(e) => setMissingResourceDescription(e.target.value)}
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-10 py-3.5 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {saving ? "Saving Configuration..." : "Save Settings"}
          </button>
        </div>
      </form>

      {/* Database Migration Section */}
      <div className="glass-card p-6 rounded-2xl mt-10 space-y-6 border border-amber-500/20 hover:border-amber-500/30 transition-all">
        <h3 className="text-sm font-bold text-amber-400 border-b border-white/5 pb-2">
          🗄️ Database Migration (RTDB to Cloud Firestore)
        </h3>
        <p className="text-gray-400 text-xs">
          Use this tool to copy all user profiles, product listings, transaction logs, ratings, and support requests from the Firebase Realtime Database to the new Cloud Firestore instance. This is required for the Multi-Creator Marketplace upgrade.
        </p>

        {!migrating && migrationProgress === 0 ? (
          <button
            type="button"
            onClick={handleMigrateToFirestore}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-amber-600/10"
          >
            Start Migration to Firestore
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between text-xs font-bold text-gray-300">
              <span>{migrating ? "Migration in progress..." : "Migration completed"}</span>
              <span>{migrationProgress}%</span>
            </div>
            <div className="w-full bg-dark-900 h-2 rounded-full overflow-hidden border border-white/5">
              <div
                className="bg-amber-500 h-full transition-all duration-300"
                style={{ width: `${migrationProgress}%` }}
              ></div>
            </div>
            {migrationLogs.length > 0 && (
              <div className="bg-black/40 border border-white/5 rounded-xl p-4 font-mono text-[10px] text-amber-350/90 h-48 overflow-y-auto space-y-1 custom-scrollbar">
                {migrationLogs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </div>
            )}
          </div>
        )}
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
    </div>
  );
}
