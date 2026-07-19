"use client";

import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, deleteDoc, updateDoc, writeBatch, setDoc, getDoc, addDoc } from "firebase/firestore";
import { firestore } from "../../../utils/firebase";

interface BannerVersion {
  name: string;
  link: string;
}

interface BannerDetailView {
  title: string;
  subtitle: string;
  description: string;
  versions?: BannerVersion[];
}

interface BannerItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageURL: string;
  buttonText?: string;
  buttonURL?: string;
  order: number;
  active: boolean;
  workflowVideoBg?: boolean;
  detailView?: BannerDetailView;
}

export default function BannerManager() {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Carousel Autoplay Settings States
  const [autoSlide, setAutoSlide] = useState(true);
  const [slideSpeed, setSlideSpeed] = useState(5);
  const [savingSettings, setSavingSettings] = useState(false);

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerSubtitle, setBannerSubtitle] = useState("");
  const [bannerDescription, setBannerDescription] = useState("");
  const [bannerImageURL, setBannerImageURL] = useState("");
  const [bannerBtnText, setBannerBtnText] = useState("");
  const [bannerBtnURL, setBannerBtnURL] = useState("");
  const [bannerActive, setBannerActive] = useState(true);
  const [bannerVideoBg, setBannerVideoBg] = useState(false);

  // Detail View Form Fields
  const [detailTitle, setDetailTitle] = useState("");
  const [detailSubtitle, setDetailSubtitle] = useState("");
  const [detailDescription, setDetailDescription] = useState("");
  const [detailVersions, setDetailVersions] = useState<BannerVersion[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch Carousel Settings from Firestore
      const settingsSnap = await getDoc(doc(firestore, "settings", "globalConfig"));
      if (settingsSnap.exists()) {
        const val = settingsSnap.data()?.carousel || {};
        setAutoSlide(val.autoSlide !== false);
        setSlideSpeed(val.slideSpeed || 5);
      }

      // Fetch Banners from Firestore
      const bannersSnap = await getDocs(collection(firestore, "banners"));
      const list: BannerItem[] = [];
      bannersSnap.forEach((docSnap) => {
        list.push({
          id: docSnap.id,
          ...(docSnap.data() as Omit<BannerItem, "id">),
        });
      });
      // Sort by order
      list.sort((a, b) => a.order - b.order);
      setBanners(list);
    } catch (err) {
      console.error("Error loading banners/settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveCarouselSettings = async () => {
    setSavingSettings(true);
    try {
      const configDocRef = doc(firestore, "settings", "globalConfig");
      const snap = await getDoc(configDocRef);
      const currentData = snap.exists() ? snap.data() : {};
      
      await setDoc(configDocRef, {
        ...currentData,
        carousel: {
          autoSlide,
          slideSpeed,
        }
      }, { merge: true });

      alert("Carousel settings saved successfully.");
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      alert("Error: " + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleMove = async (id: string, direction: "up" | "down") => {
    const idx = banners.findIndex((b) => b.id === id);
    if (idx === -1) return;

    const list = [...banners];
    if (direction === "up" && idx > 0) {
      const temp = list[idx];
      list[idx] = list[idx - 1];
      list[idx - 1] = temp;
    } else if (direction === "down" && idx < list.length - 1) {
      const temp = list[idx];
      list[idx] = list[idx + 1];
      list[idx + 1] = temp;
    } else {
      return;
    }

    // Apply new order index
    list.forEach((b, i) => {
      b.order = i;
    });

    setBanners(list);

    try {
      const batch = writeBatch(firestore);
      list.forEach((b) => {
        const ref = doc(firestore, "banners", b.id);
        batch.update(ref, { order: b.order });
      });
      await batch.commit();
    } catch (err) {
      console.error("Reordering failed:", err);
      alert("Failed to save reorder. Reverting...");
      loadData();
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete banner "${title}"?`)) return;

    try {
      await deleteDoc(doc(firestore, "banners", id));
      alert("Banner deleted successfully.");
      loadData();
    } catch (err: any) {
      console.error("Failed to delete banner:", err);
      alert("Error: " + err.message);
    }
  };

  const openFormModal = (banner: BannerItem | null = null) => {
    if (banner) {
      setEditingId(banner.id);
      setBannerTitle(banner.title);
      setBannerSubtitle(banner.subtitle || "");
      setBannerDescription(banner.description || "");
      setBannerImageURL(banner.imageURL || "");
      setBannerBtnText(banner.buttonText || "");
      setBannerBtnURL(banner.buttonURL || "");
      setBannerActive(banner.active);
      setBannerVideoBg(banner.workflowVideoBg || false);

      setDetailTitle(banner.detailView?.title || "");
      setDetailSubtitle(banner.detailView?.subtitle || "");
      setDetailDescription(banner.detailView?.description || "");
      setDetailVersions(banner.detailView?.versions || []);
    } else {
      setEditingId(null);
      setBannerTitle("");
      setBannerSubtitle("");
      setBannerDescription("");
      setBannerImageURL("");
      setBannerBtnText("");
      setBannerBtnURL("");
      setBannerActive(true);
      setBannerVideoBg(false);

      setDetailTitle("");
      setDetailSubtitle("");
      setDetailDescription("");
      setDetailVersions([]);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle || !bannerImageURL) {
      alert("Title and Image URL are required!");
      return;
    }

    let order = 0;
    if (!editingId && banners.length > 0) {
      order = Math.max(...banners.map((b) => b.order)) + 1;
    } else if (editingId) {
      const existing = banners.find((b) => b.id === editingId);
      order = existing ? existing.order : 0;
    }

    const data: Omit<BannerItem, "id"> = {
      title: bannerTitle,
      subtitle: bannerSubtitle,
      description: bannerDescription,
      imageURL: bannerImageURL,
      buttonText: bannerBtnText,
      buttonURL: bannerBtnURL,
      order,
      active: bannerActive,
      workflowVideoBg: bannerVideoBg,
      detailView: {
        title: detailTitle,
        subtitle: detailSubtitle,
        description: detailDescription,
        versions: detailVersions.filter((v) => v.name && v.link),
      },
    };

    try {
      if (editingId) {
        await setDoc(doc(firestore, "banners", editingId), data, { merge: true });
        alert("Banner updated successfully!");
      } else {
        await addDoc(collection(firestore, "banners"), data);
        alert("Banner added successfully!");
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error("Failed to save banner:", err);
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="space-y-8 text-white animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Highlight Banners Manager</h2>
          <p className="text-gray-400 text-xs mt-1">Configure slide banner highlights and autoplay speed</p>
        </div>
        <button
          onClick={() => openFormModal(null)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 shrink-0"
        >
          Add New Banner
        </button>
      </div>

      {/* Carousel Autoplay Settings Panel */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-gray-300">⚙️ Carousel Slider Settings</h3>
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="autoSlideCheck"
              checked={autoSlide}
              onChange={(e) => setAutoSlide(e.target.checked)}
              className="w-4 h-4 accent-indigo-500 cursor-pointer"
            />
            <label htmlFor="autoSlideCheck" className="text-xs text-gray-300 font-bold cursor-pointer">
              Enable Auto-Slide Carousel
            </label>
          </div>

          <div className="flex-1 flex items-center gap-3">
            <span className="text-xs text-gray-400 font-bold w-24">Transition Time:</span>
            <input
              type="range"
              min={2}
              max={10}
              step={1}
              value={slideSpeed}
              onChange={(e) => setSlideSpeed(Number(e.target.value))}
              className="flex-1 h-1.5 bg-dark-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <span className="text-xs font-bold text-indigo-400 w-10 text-right">{slideSpeed}s</span>
          </div>

          <button
            onClick={handleSaveCarouselSettings}
            disabled={savingSettings}
            className="bg-white/5 hover:bg-indigo-600 hover:text-white border border-white/10 text-indigo-400 rounded-xl px-5 py-2.5 text-xs font-bold transition-all disabled:opacity-50 shrink-0"
          >
            {savingSettings ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Banners List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="text-xs font-semibold">Loading banners...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {banners.length > 0 ? (
            banners.map((banner, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === banners.length - 1;
              return (
                <div
                  key={banner.id}
                  className="glass-card hover:border-indigo-500/30 p-4 rounded-2xl flex items-center justify-between gap-6 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    {/* Reorder Buttons */}
                    <div className="flex flex-col items-center gap-1.5 text-gray-500">
                      <button
                        onClick={() => handleMove(banner.id, "up")}
                        disabled={isFirst}
                        className={`hover:text-white transition-all ${isFirst ? "opacity-20 cursor-not-allowed" : ""}`}
                      >
                        ▲
                      </button>
                      <span className="text-[10px] opacity-40">MOVE</span>
                      <button
                        onClick={() => handleMove(banner.id, "down")}
                        disabled={isLast}
                        className={`hover:text-white transition-all ${isLast ? "opacity-20 cursor-not-allowed" : ""}`}
                      >
                        ▼
                      </button>
                    </div>

                    {/* Image Preview */}
                    <div className="w-20 h-12 rounded-lg overflow-hidden shrink-0 bg-dark-900 border border-white/10 relative">
                      <img src={banner.imageURL} alt={banner.title} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 right-0 bg-black/80 text-white text-[9px] px-1 py-0.5 rounded-tl font-bold">
                        #{idx + 1}
                      </div>
                    </div>

                    {/* Details */}
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">
                        {banner.title}
                      </h4>
                      <div className="flex gap-2 text-[10px] mt-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full border ${
                            banner.active
                              ? "bg-green-500/10 border-green-500/20 text-green-400"
                              : "bg-gray-500/10 border-gray-500/20 text-gray-400"
                          }`}
                        >
                          {banner.active ? "Active" : "Inactive"}
                        </span>
                        {banner.detailView?.title && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                            Landing Page Active
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => openFormModal(banner)}
                      className="bg-white/5 hover:bg-indigo-600 hover:text-white border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-indigo-400 transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(banner.id, banner.title)}
                      className="bg-red-500/10 hover:bg-red-600 hover:text-white border border-red-500/20 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-red-400 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-20 text-gray-500 glass-card border-dashed rounded-2xl">
              <span className="text-3xl block mb-2">🖼️</span>
              <p className="text-xs font-semibold">No banners configured yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Banner Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="glass-card rounded-3xl w-full max-w-4xl p-6 md:p-8 max-h-[90vh] overflow-y-auto custom-scrollbar relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-lg p-2"
            >
              ✕
            </button>
            <h3 className="text-lg font-black mb-6 tracking-tight">
              {editingId ? "Modify Banner Properties" : "Add New Highlight Banner"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Image Preview & Field */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 font-bold">Banner Image URL</label>
                    <input
                      type="url"
                      required
                      value={bannerImageURL}
                      onChange={(e) => setBannerImageURL(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 font-bold">Banner Title</label>
                      <input
                        type="text"
                        required
                        value={bannerTitle}
                        onChange={(e) => setBannerTitle(e.target.value)}
                        placeholder="e.g. Creative Flow Plugin"
                        className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 font-bold">Banner Subtitle</label>
                      <input
                        type="text"
                        value={bannerSubtitle}
                        onChange={(e) => setBannerSubtitle(e.target.value)}
                        placeholder="e.g. Free Download"
                        className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview Box */}
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-bold">Slide Preview</label>
                  <div className="w-full h-32 rounded-xl bg-dark-900 border border-white/10 overflow-hidden flex items-center justify-center relative">
                    {bannerImageURL ? (
                      <img src={bannerImageURL} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-gray-500 font-bold uppercase">No Image URL</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold">Carousel Description</label>
                <textarea
                  rows={2}
                  value={bannerDescription}
                  onChange={(e) => setBannerDescription(e.target.value)}
                  placeholder="Slide description details..."
                  className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Call to Action Button */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-bold">Button CTA Label</label>
                  <input
                    type="text"
                    value={bannerBtnText}
                    onChange={(e) => setBannerBtnText(e.target.value)}
                    placeholder="e.g. Download Now"
                    className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-bold">Button Target Link URL</label>
                  <input
                    type="text"
                    value={bannerBtnURL}
                    onChange={(e) => setBannerBtnURL(e.target.value)}
                    placeholder="e.g. #plugins (or custom page slug)"
                    className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex gap-6 items-center">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="bannerActiveCheck"
                    checked={bannerActive}
                    onChange={(e) => setBannerActive(e.target.checked)}
                    className="w-4 h-4 accent-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="bannerActiveCheck" className="text-xs text-gray-300 font-bold cursor-pointer">
                    Set Active (Visible in Slide Show)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="bannerVideoBgCheck"
                    checked={bannerVideoBg}
                    onChange={(e) => setBannerVideoBg(e.target.checked)}
                    className="w-4 h-4 accent-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="bannerVideoBgCheck" className="text-xs text-gray-300 font-bold cursor-pointer">
                    Enable Video Background overlay
                  </label>
                </div>
              </div>

              {/* Landing Page detailView Section */}
              <div className="space-y-4 border-t border-white/5 pt-6">
                <h4 className="text-xs font-bold text-indigo-400">Custom Landing Page Details (Optional)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-400 font-bold">Landing Page Header Title</label>
                    <input
                      type="text"
                      value={detailTitle}
                      onChange={(e) => setDetailTitle(e.target.value)}
                      placeholder="e.g. Special Offer Bundle"
                      className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-2.5 text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-400 font-bold">Landing Page Subtitle</label>
                    <input
                      type="text"
                      value={detailSubtitle}
                      onChange={(e) => setDetailSubtitle(e.target.value)}
                      className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-2.5 text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-gray-400 font-bold">Landing Page Detailed Info Text</label>
                  <textarea
                    rows={3}
                    value={detailDescription}
                    onChange={(e) => setDetailDescription(e.target.value)}
                    placeholder="Describe what resources the landing page delivers..."
                    className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none resize-none"
                  />
                </div>

                {/* Landing page versions/links download list */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-bold">Resource Downloads Links list</span>
                    <button
                      type="button"
                      onClick={() => setDetailVersions([...detailVersions, { name: "", link: "" }])}
                      className="text-indigo-400 hover:text-indigo-300 font-bold text-[10px]"
                    >
                      + Add Link Row
                    </button>
                  </div>

                  {detailVersions.map((v, i) => (
                    <div key={i} className="flex gap-4 items-center bg-dark-900/50 p-3 rounded-xl border border-white/5">
                      <input
                        type="text"
                        placeholder="Label (e.g. Download Mac v1.2)"
                        required
                        value={v.name}
                        onChange={(e) => {
                          const copy = [...detailVersions];
                          copy[i].name = e.target.value;
                          setDetailVersions(copy);
                        }}
                        className="bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none w-1/3"
                      />
                      <input
                        type="url"
                        placeholder="Link URL"
                        required
                        value={v.link}
                        onChange={(e) => {
                          const copy = [...detailVersions];
                          copy[i].link = e.target.value;
                          setDetailVersions(copy);
                        }}
                        className="bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => setDetailVersions(detailVersions.filter((_, idx) => idx !== i))}
                        className="text-red-500 hover:text-red-400 text-sm px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-6 border-t border-white/10 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-8 py-3 rounded-xl transition-all shadow-lg active:scale-95"
                >
                  Save Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
