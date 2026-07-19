"use client";

import React, { useEffect, useState } from "react";
import { collection, doc, getDocs, getDoc, setDoc, addDoc, deleteDoc, query, where, Timestamp } from "firebase/firestore";
import { firestore } from "../../../utils/firebase";
import { User } from "firebase/auth";

interface ProductManagerProps {
  category: string;
  currentUser: User | null;
  isSubAdmin: boolean;
  importedItem?: any;
  clearImportedItem?: () => void;
}

interface Version {
  Name: string;
  Link: string;
}

interface Feature {
  title: string;
  description: string;
  imageUrl: string;
}

interface SubItem {
  Title: string;
  Link: string;
  isPro?: boolean;
}

interface ProductItem {
  id?: string;
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
  features?: Feature[];
  hasSubItems?: boolean;
  subItemsButtonText?: string;
  subItemsPageTitle?: string;
  subItemsPageDescription?: string;
  subItems?: SubItem[];
  Versions?: Version[];
  ownerUid?: string;
  vendorId?: string;
}

const CATEGORY_NAMES: Record<string, string> = {
  adobeSoftware: "Adobe Software",
  plugins: "Plugins",
  scripts: "Scripts & Extensions",
  assets: "Assets",
  utilities: "Utilities & Other Software",
  courses: "Courses",
  simplePluginsList: "100+ Plugins List",
};

export default function ProductManager({ category, currentUser, isSubAdmin, importedItem, clearImportedItem }: ProductManagerProps) {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Field States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [downloadDescription, setDownloadDescription] = useState("");
  const [imageURL, setImageURL] = useState("");
  const [downloadLink, setDownloadLink] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [price, setPrice] = useState(0);
  const [priceUSD, setPriceUSD] = useState(0);
  const [compatibleWith, setCompatibleWith] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [presetListInput, setPresetListInput] = useState("");
  const [extraImagesInput, setExtraImagesInput] = useState("");
  const [features, setFeatures] = useState<Feature[]>([]);
  const [hasSubItems, setHasSubItems] = useState(false);
  const [subItemsButtonText, setSubItemsButtonText] = useState("");
  const [subItemsPageTitle, setSubItemsPageTitle] = useState("");
  const [subItemsPageDescription, setSubItemsPageDescription] = useState("");
  const [subItems, setSubItems] = useState<SubItem[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [targetCollection, setTargetCollection] = useState(category);

  const [toasts, setToasts] = useState<{ id: string; msg: string; type: "success" | "error" | "info" }[]>([]);
  const showToast = (msg: string, type: "success" | "error" | "info" = "info") => {
    const toastId = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id: toastId, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 4000);
  };

  // Load items from Firebase
  const loadItems = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(firestore, "products"),
        where("Category", "==", category)
      );
      const snap = await getDocs(q);
      const list: ProductItem[] = [];
      snap.forEach((docSnap) => {
        list.push({
          id: docSnap.id,
          ...(docSnap.data() as ProductItem),
        });
      });
      setItems(list);
    } catch (err) {
      console.error("Error loading products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    setTargetCollection(category);

    if (importedItem && importedItem.collection === category) {
      openFormModal(importedItem);
      if (clearImportedItem) clearImportedItem();
    }
  }, [category, importedItem]);

  const logActivity = async (action: string, col: string, itemName: string) => {
    try {
      if (!currentUser) return;
      await addDoc(collection(firestore, "auditLogs"), {
        adminEmail: currentUser.email || "Unknown Admin",
        action,
        collection: col,
        itemName,
        timestamp: Timestamp.now(),
      });
    } catch (err) {
      console.error("Failed to log activity:", err);
    }
  };

  // Delete product
  const handleDelete = async (id: string, itemTitle: string) => {
    if (isSubAdmin) {
      showToast("Access Denied: Sub-admins are not allowed to delete items.", "error");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${itemTitle}"?`)) return;

    try {
      const docRef = doc(firestore, "products", id);
      await deleteDoc(docRef);
      await logActivity("Deleted Item", category, itemTitle);
      showToast("Item deleted successfully.", "success");
      loadItems();
    } catch (err: any) {
      console.error("Error deleting item:", err);
      showToast("Failed to delete item: " + err.message, "error");
    }
  };

  // Open modal for Create/Edit
  const openFormModal = (item: ProductItem | null = null) => {
    if (item) {
      setEditingId(item.id || null);
      setTitle(item.Title);
      setDescription(item.Description || "");
      setDownloadDescription(item.DownloadDescription || "");
      setImageURL(item.ImageURL || "");
      setDownloadLink(item.DownloadLink || "");
      setIsPro(item.isPro || false);
      setPrice(item.price || 0);
      setPriceUSD(item.priceUSD || 0);
      setCompatibleWith(item.compatibleWith || []);
      setVideoUrl(item.videoUrl || "");
      setPresetListInput(item.presetList ? item.presetList.join("\n") : "");
      setExtraImagesInput(item.extraImages ? item.extraImages.join("\n") : "");
      setFeatures(item.features || []);
      setHasSubItems(item.hasSubItems || false);
      setSubItemsButtonText(item.subItemsButtonText || "");
      setSubItemsPageTitle(item.subItemsPageTitle || "");
      setSubItemsPageDescription(item.subItemsPageDescription || "");
      setSubItems(item.subItems || []);
      setVersions(item.Versions || []);
      setTargetCollection(category);
    } else {
      setEditingId(null);
      setTitle("");
      setDescription("");
      setDownloadDescription("");
      setImageURL("");
      setDownloadLink("");
      setIsPro(false);
      setPrice(0);
      setPriceUSD(0);
      setCompatibleWith([]);
      setVideoUrl("");
      setPresetListInput("");
      setExtraImagesInput("");
      setFeatures([]);
      setHasSubItems(false);
      setSubItemsButtonText("");
      setSubItemsPageTitle("");
      setSubItemsPageDescription("");
      setSubItems([]);
      setVersions([]);
      setTargetCollection(category);
    }
    setIsModalOpen(true);
  };

  // Submit Product Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      alert("Product Title is required.");
      return;
    }

    const presetList = presetListInput
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t);
    const extraImages = extraImagesInput
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t);

    const data: ProductItem = {
      Title: title,
      price,
      priceUSD,
      isPro,
      compatibleWith,
      videoUrl,
      presetList,
      extraImages,
      features: features.filter((f) => f.title || f.description || f.imageUrl),
    };

    if (hasSubItems) {
      data.hasSubItems = true;
      data.subItemsButtonText = subItemsButtonText;
      data.subItemsPageTitle = subItemsPageTitle;
      data.subItemsPageDescription = subItemsPageDescription;
      data.subItems = subItems;
    } else {
      data.hasSubItems = false;
      data.subItems = undefined;
    }

    if (targetCollection === "simplePluginsList") {
      data.DownloadLink = downloadLink;
    } else if (targetCollection === "assets" || targetCollection === "courses") {
      data.Description = description;
      data.DownloadDescription = downloadDescription;
      data.ImageURL = imageURL;
      data.DownloadLink = downloadLink;
    } else {
      data.Description = description;
      data.DownloadDescription = downloadDescription;
      data.ImageURL = imageURL;
      data.Versions = versions;
    }

    try {
      // Clean undefined fields from data object for Firebase compatibility
      const cleanData = JSON.parse(JSON.stringify(data));
      cleanData.Category = targetCollection;
      cleanData.status = "approved";

      if (editingId) {
        const docRef = doc(firestore, "products", editingId);
        await setDoc(docRef, cleanData, { merge: true });
        await logActivity("Edited Item", targetCollection, title);
      } else {
        if (currentUser) {
          cleanData.ownerUid = currentUser.uid;
          cleanData.vendorId = currentUser.uid;
        }
        await addDoc(collection(firestore, "products"), cleanData);
        await logActivity("Added Item", targetCollection, title);
      }

      alert("Product saved successfully.");
      setIsModalOpen(false);
      loadItems();
    } catch (err: any) {
      console.error("Error saving product:", err);
      alert("Failed to save product: " + err.message);
    }
  };

  const filteredItems = items.filter((item) =>
    item.Title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 text-white animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{CATEGORY_NAMES[category] || category}</h2>
          <p className="text-gray-400 text-xs mt-1">Catalog items records list</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-dark-900 border border-white/5 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-indigo-500 w-48 md:w-64"
          />
          <button
            onClick={() => openFormModal(null)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg active:scale-95"
          >
            Add New Item
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="text-xs font-semibold">Loading items...</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                  <th className="px-6 py-4">Image</th>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Price (INR/USD)</th>
                  <th className="px-6 py-4">Plan Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-6 py-4">
                        {item.ImageURL ? (
                          <img
                            src={item.ImageURL}
                            alt={item.Title}
                            className="w-10 h-10 object-cover rounded-lg border border-white/10"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center justify-center text-xs text-indigo-400 font-bold">
                            N/A
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold text-white truncate max-w-xs block">
                          {item.Title}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold">
                        ₹{item.price || 0} / ${item.priceUSD || 0}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            item.isPro
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          }`}
                        >
                          {item.isPro ? "PRO" : "FREE"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 shrink-0">
                        <button
                          onClick={() => openFormModal(item)}
                          className="bg-white/5 hover:bg-indigo-600 hover:text-white border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-indigo-400 transition-all active:scale-95"
                        >
                          Edit
                        </button>
                        {!isSubAdmin && (
                          <button
                            onClick={() => handleDelete(item.id!, item.Title)}
                            className="bg-red-500/10 hover:bg-red-600 hover:text-white border border-red-500/20 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-red-400 transition-all active:scale-95"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-xs">
                      No items detected in this category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Editor Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-sm flex items-start justify-center py-12 px-4">
          <div className="glass-card rounded-3xl w-full max-w-5xl p-8 relative my-auto border border-purple-500/20 hover:border-purple-500/40 transition-all">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-lg p-2"
            >
              ✕
            </button>
            <h3 className="text-2xl font-bold text-white mb-6">
              {editingId ? "Edit Item" : "Add Item"}
            </h3>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-5">
                {/* Target Collection Selector */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-300 ml-1">Target Section/Collection</label>
                  <select
                    value={targetCollection}
                    onChange={(e) => setTargetCollection(e.target.value)}
                    className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {Object.entries(CATEGORY_NAMES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pro Toggle */}
                <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-4 flex items-center justify-between group hover:bg-indigo-600/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                      👑
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">Pro Membership Required</p>
                      <p className="text-gray-400 text-[11px]">If enabled, only paid members can download this.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPro}
                      onChange={(e) => setIsPro(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* Supported Software checklist */}
                <div className="bg-purple-600/10 border border-purple-500/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                      🏷️
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">Supported Software</p>
                      <p className="text-gray-400 text-[11px]">Select which software this item supports.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {([
                      { id: "afterEffects", label: "After Effects", accent: "accent-purple-500" },
                      { id: "premierePro", label: "Premiere Pro", accent: "accent-blue-500" },
                      { id: "photoshop", label: "Photoshop", accent: "accent-cyan-500" },
                      { id: "illustrator", label: "Illustrator", accent: "accent-orange-500" },
                      { id: "davinciResolve", label: "DaVinci Resolve", accent: "accent-red-500" },
                    ]).map((sw) => (
                      <label key={sw.id} className="flex items-center gap-2 bg-[#07070a]/60 border border-white/5 rounded-lg px-3 py-2 cursor-pointer hover:border-purple-500/40 transition-all">
                        <input
                          type="checkbox"
                          checked={compatibleWith.includes(sw.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCompatibleWith([...compatibleWith.filter(c => c !== "all"), sw.id]);
                            } else {
                              setCompatibleWith(compatibleWith.filter((c) => c !== sw.id));
                            }
                          }}
                          className={`${sw.accent} w-4 h-4`}
                        />
                        <span className="text-xs text-gray-300">{sw.label}</span>
                      </label>
                    ))}
                    <label className={`flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-all ${
                      compatibleWith.includes("all")
                        ? "bg-purple-600/20 border border-purple-500/30"
                        : "bg-[#07070a]/60 border border-white/5 hover:border-purple-500/40"
                    }`}>
                      <input
                        type="checkbox"
                        checked={compatibleWith.includes("all")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCompatibleWith(["all"]);
                          } else {
                            setCompatibleWith([]);
                          }
                        }}
                        className="accent-purple-500 w-4 h-4"
                      />
                      <span className={`text-xs ${compatibleWith.includes("all") ? "text-purple-300 font-bold" : "text-gray-300"}`}>All Software</span>
                    </label>
                  </div>
                </div>

                {/* Product Title */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-300 ml-1">Product Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Photoshop Pro Extension"
                    className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Prices */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-300 ml-1">Custom Price (INR)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 pl-8 text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-300 ml-1">Custom Price (USD)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={priceUSD}
                        onChange={(e) => setPriceUSD(Number(e.target.value))}
                        className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 pl-8 text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 italic mt-1 ml-1">
                  Set to 0 to use the standard Free/Pro system. Set a value (e.g. 50) to sell this item individually.
                </p>

                {/* Direct Link Uploader for Assets/Courses/SimplePluginsList */}
                {(targetCollection === "simplePluginsList" ||
                  targetCollection === "assets" ||
                  targetCollection === "courses") && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-300 ml-1">Download Link URL</label>
                      <input
                        type="url"
                        required
                        value={downloadLink}
                        onChange={(e) => setDownloadLink(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                    {targetCollection !== "simplePluginsList" && (
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-300 ml-1">Download Panel Description text</label>
                        <input
                          type="text"
                          value={downloadDescription}
                          onChange={(e) => setDownloadDescription(e.target.value)}
                          placeholder="e.g. Free lifetime download link"
                          className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-5">
                {/* Description */}
                {targetCollection !== "simplePluginsList" && (
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-300 ml-1">Description</label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter description..."
                      className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 resize-none animate-none"
                    />
                  </div>
                )}

                {/* Download Window Description */}
                {targetCollection !== "simplePluginsList" && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-semibold text-gray-300 ml-1">Download Window Description</label>
                      <button
                        type="button"
                        onClick={() => setDownloadDescription(description)}
                        className="text-[10px] bg-indigo-500/20 hover:bg-indigo-600 hover:text-white text-indigo-400 px-2.5 py-1 rounded-lg border border-indigo-500/30 flex items-center gap-1 transition-all"
                      >
                        Copy from Description
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={downloadDescription}
                      onChange={(e) => setDownloadDescription(e.target.value)}
                      placeholder="Enter detailed description for download window..."
                      className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500"
                    />
                    <p className="text-[10px] text-gray-500 ml-1">
                      This description appears in the download modal window (separate from card description)
                    </p>
                  </div>
                )}

                {/* Image selection and Preview */}
                {targetCollection !== "simplePluginsList" && (
                  <div className="bg-[#0f0f15]/30 p-4 rounded-xl border border-white/5 space-y-3">
                    <label className="block text-sm font-semibold text-gray-300">Image</label>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <img
                          src={imageURL || "https://placehold.co/100?text=Preview"}
                          alt="Preview"
                          className="w-24 h-24 object-cover rounded-lg border border-white/10 bg-dark-900 shadow-lg"
                        />
                      </div>
                      <div className="flex-1 space-y-3">
                        <input
                          type="text"
                          value={imageURL}
                          onChange={(e) => setImageURL(e.target.value)}
                          placeholder="Paste image URL here..."
                          className="w-full bg-dark-900 border border-white/10 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const url = prompt("Enter asset image URL:");
                            if (url) setImageURL(url);
                          }}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-xs shadow-lg active:scale-95"
                        >
                          Choose from Assets
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Extra Image & Preset Lists */}
                {targetCollection !== "simplePluginsList" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 font-bold">Extra Images (one per line)</label>
                      <textarea
                        rows={3}
                        value={extraImagesInput}
                        onChange={(e) => setExtraImagesInput(e.target.value)}
                        placeholder="https://link1.png"
                        className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 resize-none font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 font-bold">Preset List (one per line)</label>
                      <textarea
                        rows={3}
                        value={presetListInput}
                        onChange={(e) => setPresetListInput(e.target.value)}
                        placeholder="Preset Pack 1"
                        className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Video URL */}
                {targetCollection !== "simplePluginsList" && (
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 font-bold">Video Showcase YouTube Link (Optional)</label>
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/embed/..."
                      className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Full Width Footer Options */}
              <div className="col-span-full space-y-6">
                {/* Dynamic version control (Only if not simplePluginsList/assets/courses) */}
                {targetCollection !== "simplePluginsList" &&
                  targetCollection !== "assets" &&
                  targetCollection !== "courses" && (
                    <div className="space-y-3 border-t border-white/5 pt-6">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-gray-400 font-bold">Download Versions list</label>
                        <button
                          type="button"
                          onClick={() => setVersions([...versions, { Name: "", Link: "" }])}
                          className="text-indigo-400 hover:text-indigo-300 font-bold text-[10px]"
                        >
                          + Add Version Row
                        </button>
                      </div>
                      <div className="space-y-3">
                        {versions.map((ver, idx) => (
                          <div key={idx} className="flex gap-4 items-center">
                            <input
                              type="text"
                              placeholder="Version Name (e.g. v2025)"
                              required
                              value={ver.Name}
                              onChange={(e) => {
                                const copy = [...versions];
                                copy[idx].Name = e.target.value;
                                setVersions(copy);
                              }}
                              className="bg-dark-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none w-1/3"
                            />
                            <input
                              type="url"
                              placeholder="Direct download Link URL"
                              required
                              value={ver.Link}
                              onChange={(e) => {
                                const copy = [...versions];
                                copy[idx].Link = e.target.value;
                                setVersions(copy);
                              }}
                              className="bg-dark-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none flex-1"
                            />
                            <button
                              type="button"
                              onClick={() => setVersions(versions.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-400 text-sm px-2"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Sub-Items Switch */}
                {targetCollection !== "simplePluginsList" && (
                  <div className="space-y-4 border-t border-white/5 pt-6">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="subItemCheck"
                        checked={hasSubItems}
                        onChange={(e) => setHasSubItems(e.target.checked)}
                        className="w-4 h-4 accent-indigo-500 cursor-pointer"
                      />
                      <label htmlFor="subItemCheck" className="text-xs text-gray-300 font-bold cursor-pointer">
                        This item contains sub-items (e.g. package sets)
                      </label>
                    </div>

                    {hasSubItems && (
                      <div className="space-y-4 pl-6 border-l border-indigo-500/20">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] text-gray-400 font-bold">Open Button Label</label>
                            <input
                              type="text"
                              value={subItemsButtonText}
                              onChange={(e) => setSubItemsButtonText(e.target.value)}
                              placeholder="e.g. Download Packs"
                              className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] text-gray-400 font-bold">Sub-items Screen Title</label>
                            <input
                              type="text"
                              value={subItemsPageTitle}
                              onChange={(e) => setSubItemsPageTitle(e.target.value)}
                              className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] text-gray-400 font-bold">Sub-items Screen Details</label>
                            <input
                              type="text"
                              value={subItemsPageDescription}
                              onChange={(e) => setSubItemsPageDescription(e.target.value)}
                              className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-400 font-bold">Sub-items List</span>
                            <button
                              type="button"
                              onClick={() => setSubItems([...subItems, { Title: "", Link: "", isPro: false }])}
                              className="text-indigo-400 hover:text-indigo-300 font-bold text-[10px]"
                            >
                              + Add Sub-item Row
                            </button>
                          </div>

                          {subItems.map((sub, idx) => (
                            <div key={idx} className="flex gap-4 items-center bg-dark-900/50 p-3 rounded-xl border border-white/5">
                              <input
                                type="text"
                                placeholder="Name"
                                required
                                value={sub.Title}
                                onChange={(e) => {
                                  const copy = [...subItems];
                                  copy[idx].Title = e.target.value;
                                  setSubItems(copy);
                                }}
                                className="bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none w-1/3"
                              />
                              <input
                                type="url"
                                placeholder="Link"
                                required
                                value={sub.Link}
                                onChange={(e) => {
                                  const copy = [...subItems];
                                  copy[idx].Link = e.target.value;
                                  setSubItems(copy);
                                }}
                                className="bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none flex-1"
                              />
                              <div className="flex items-center gap-1.5 shrink-0">
                                <input
                                  type="checkbox"
                                  id={`subPro-${idx}`}
                                  checked={sub.isPro || false}
                                  onChange={(e) => {
                                    const copy = [...subItems];
                                    copy[idx].isPro = e.target.checked;
                                    setSubItems(copy);
                                  }}
                                  className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
                                />
                                <label htmlFor={`subPro-${idx}`} className="text-[10px] text-gray-450 cursor-pointer font-bold">
                                  Pro Link
                                </label>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSubItems(subItems.filter((_, i) => i !== idx))}
                                className="text-red-500 hover:text-red-400 text-sm px-1"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Features List Section */}
                <div className="space-y-4 border-t border-white/5 pt-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Long-Form Landing Page Features (Optional)</h4>
                    <button
                      type="button"
                      onClick={() => setFeatures([...features, { title: "", description: "", imageUrl: "" }])}
                      className="text-indigo-400 hover:text-indigo-300 font-bold text-xs"
                    >
                      + Add Feature
                    </button>
                  </div>

                  <div className="space-y-4">
                    {features.map((feature, idx) => (
                      <div key={idx} className="space-y-3 bg-dark-900/50 p-4 rounded-2xl border border-white/5 relative">
                        <button
                          type="button"
                          onClick={() => setFeatures(features.filter((_, i) => i !== idx))}
                          className="absolute top-4 right-4 text-red-500 hover:text-red-400 text-xs font-bold"
                        >
                          Remove
                        </button>
                        <span className="text-[10px] text-indigo-400 font-black uppercase">Feature {idx + 1}</span>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 font-bold">Feature Title</label>
                            <input
                              type="text"
                              placeholder="e.g. 15+ Advanced Presets"
                              value={feature.title}
                              onChange={(e) => {
                                const copy = [...features];
                                copy[idx].title = e.target.value;
                                setFeatures(copy);
                              }}
                              className="w-full bg-dark-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs outline-none text-white focus:border-indigo-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 font-bold">Feature Showcase Image URL</label>
                            <input
                              type="url"
                              placeholder="https://example.com/feature.png"
                              value={feature.imageUrl}
                              onChange={(e) => {
                                const copy = [...features];
                                copy[idx].imageUrl = e.target.value;
                                setFeatures(copy);
                              }}
                              className="w-full bg-dark-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs outline-none text-white focus:border-indigo-500"
                            />
                          </div>
                          <div className="col-span-full space-y-1">
                            <label className="text-[10px] text-gray-500 font-bold">Feature Description</label>
                            <textarea
                              rows={2}
                              placeholder="Describe how this feature supports editors..."
                              value={feature.description}
                              onChange={(e) => {
                                const copy = [...features];
                                copy[idx].description = e.target.value;
                                setFeatures(copy);
                              }}
                              className="w-full bg-dark-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs outline-none text-white focus:border-indigo-500 resize-none"
                            />
                          </div>
                        </div>
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
                    Save Product
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

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
