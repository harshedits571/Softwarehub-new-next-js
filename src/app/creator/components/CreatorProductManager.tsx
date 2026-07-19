"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { collection, doc, getDocs, getDoc, setDoc, addDoc, deleteDoc, query, where, Timestamp, onSnapshot } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { firestore, storage } from "../../../utils/firebase";

interface CreatorProductManagerProps {
  currentUser: any;
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
  Versions?: Version[];
  features?: Feature[];
  ownerUid?: string;
  vendorId?: string;
  creatorId?: string;
  Category?: string;
  status?: "approved" | "pending" | "rejected" | "change-requested";
  sortOrder?: number;
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

export default function CreatorProductManager({ currentUser }: CreatorProductManagerProps) {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [toasts, setToasts] = useState<{ id: string; msg: string; type: "success" | "error" | "info" }[]>([]);
  const showToast = (msg: string, type: "success" | "error" | "info" = "info") => {
    const toastId = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id: toastId, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 4000);
  };

  // Form Fields
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
  const [versions, setVersions] = useState<Version[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [targetCategory, setTargetCategory] = useState("plugins");

  // File Upload State
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  // Load products for this creator using onSnapshot for real-time updates
  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    let isMounted = true;

    const q = query(
      collection(firestore, "products"),
      where("ownerUid", "==", currentUser.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      if (!isMounted) return;
      const list: ProductItem[] = [];
      snap.forEach((docSnap) => {
        list.push({
          id: docSnap.id,
          ...(docSnap.data() as ProductItem),
        });
      });
      list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setItems(list);
      setLoading(false);
    }, (err) => {
      console.error("Error loading creator products:", err);
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [currentUser]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast("Image exceeds 2 MB size check! Please compress the thumbnail image.", "error");
      return;
    }

    setUploadingImage(true);
    try {
      const imgRef = storageRef(storage, `products/${currentUser.uid}/thumbnails/${Date.now()}_${file.name}`);
      await uploadBytes(imgRef, file);
      const url = await getDownloadURL(imgRef);
      setImageURL(url);
      showToast("Thumbnail image uploaded successfully!", "success");
    } catch (err: any) {
      showToast("Thumbnail upload failed: " + err.message, "error");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleProductFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 100 MB Limit check
    if (file.size > 100 * 1024 * 1024) {
      showToast("Direct product uploads are limited to 100 MB! Please upload your file to Google Drive / Dropbox and paste the external download link instead.", "error");
      return;
    }

    setUploadingFile(true);
    setUploadProgress("Uploading product file...");
    try {
      const fileRef = storageRef(storage, `products/${currentUser.uid}/files/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      // Track size for Blaze Plan cost estimate calculations
      await addDoc(collection(firestore, "storageAudits"), {
        ownerUid: currentUser.uid,
        size: file.size,
        path: fileRef.fullPath,
        uploadedAt: Timestamp.now(),
      });

      if (index !== undefined) {
        const updatedVersions = [...versions];
        updatedVersions[index].Link = url;
        setVersions(updatedVersions);
      } else {
        setDownloadLink(url);
      }
      alert("Product file uploaded successfully!");
    } catch (err: any) {
      alert("Product file upload failed: " + err.message);
    } finally {
      setUploadingFile(false);
      setUploadProgress("");
    }
  };

  const handleDelete = async (id: string, title: string, imageURL?: string, downloadLink?: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      // 1. Delete associated Storage files if they belong to Firebase Storage
      if (imageURL && imageURL.includes("firebasestorage.googleapis.com")) {
        try {
          const imgRef = storageRef(storage, imageURL);
          await deleteObject(imgRef);
        } catch (e) {
          console.warn("Storage thumbnail delete failed or didn't exist:", e);
        }
      }

      if (downloadLink && downloadLink.includes("firebasestorage.googleapis.com")) {
        try {
          const fileRef = storageRef(storage, downloadLink);
          await deleteObject(fileRef);
        } catch (e) {
          console.warn("Storage file delete failed or didn't exist:", e);
        }
      }

      // 2. Delete document
      await deleteDoc(doc(firestore, "products", id));

      // 3. Log audit activity
      await addDoc(collection(firestore, "auditLogs"), {
        adminEmail: currentUser.email || "Creator Account",
        action: "Creator Deleted Item",
        collection: targetCategory,
        itemName: title,
        timestamp: Timestamp.now(),
      });

      alert("Item deleted successfully.");
    } catch (err: any) {
      console.error("Error deleting item:", err);
      alert("Failed to delete item: " + err.message);
    }
  };

  const moveItem = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newItems = [...items];
    
    // Swap the elements
    const temp = newItems[index];
    newItems[index] = newItems[newIndex];
    newItems[newIndex] = temp;

    // Update their sortOrder locally
    newItems[index].sortOrder = index;
    newItems[newIndex].sortOrder = newIndex;
    
    setItems(newItems);

    // Save to Firestore
    try {
      const doc1 = doc(firestore, "products", newItems[index].id!);
      const doc2 = doc(firestore, "products", newItems[newIndex].id!);
      await setDoc(doc1, { sortOrder: index }, { merge: true });
      await setDoc(doc2, { sortOrder: newIndex }, { merge: true });
    } catch (e) {
      console.error("Failed to save reorder", e);
    }
  };

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
      setVersions(item.Versions || []);
      setFeatures(item.features || []);
      setTargetCategory(item.Category || "plugins");
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
      setVersions([]);
      setFeatures([]);
      setTargetCategory("plugins");
    }
    setIsModalOpen(true);
  };

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
      Category: "creator_product",
      Description: description,
      DownloadDescription: downloadDescription,
      ImageURL: imageURL,
      DownloadLink: downloadLink,
      Versions: versions,
      features: features.filter((f) => f.title || f.description || f.imageUrl),
      ownerUid: currentUser.uid,
      vendorId: currentUser.uid,
      creatorId: currentUser.uid,
      // For creators, products always upload as "pending" approval!
      status: editingId ? "pending" : "pending",
      sortOrder: editingId ? items.find(i => i.id === editingId)?.sortOrder || 0 : items.length,
    };

    try {
      const cleanData = JSON.parse(JSON.stringify(data));

      if (editingId) {
        const docRef = doc(firestore, "products", editingId);
        await setDoc(docRef, cleanData, { merge: true });
        
        await addDoc(collection(firestore, "auditLogs"), {
          adminEmail: currentUser.email,
          action: "Creator Edited Listing",
          collection: targetCategory,
          itemName: title,
          timestamp: Timestamp.now(),
        });
      } else {
        const colRef = collection(firestore, "products");
        await addDoc(colRef, cleanData);
        
        await addDoc(collection(firestore, "auditLogs"), {
          adminEmail: currentUser.email,
          action: "Creator Added New Listing",
          collection: targetCategory,
          itemName: title,
          timestamp: Timestamp.now(),
        });
      }

      alert("Saved successfully and sent for admin review!");
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Error saving creator product:", err);
      alert("Failed to save product: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 text-white animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Asset Listing Manager</h2>
          <p className="text-gray-400 text-xs mt-1">Submit, edit, and monitor your uploaded asset packages</p>
        </div>
        <button
          onClick={() => openFormModal(null)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 shrink-0"
        >
          Submit New Asset
        </button>
      </div>

      <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 relative focus-within:border-indigo-500 transition-all max-w-md">
        <i className="fa-solid fa-magnifying-glass text-gray-500 text-sm"></i>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter your assets..."
          className="bg-transparent border-none outline-none text-xs text-white w-full"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="text-xs font-semibold">Loading assets directory...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items
            .filter((item) => item.Title.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((item) => {
              const statusColors: Record<string, string> = {
                approved: "bg-green-500/10 border-green-500/20 text-green-400",
                pending: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
                rejected: "bg-red-500/10 border-red-500/20 text-red-400",
                "change-requested": "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
              };

              return (
                <div key={item.id} className="glass-card hover:border-indigo-500/30 p-5 rounded-2xl flex flex-col justify-between transition-all group">
                  <div>
                    <div className="aspect-video w-full rounded-xl overflow-hidden border border-white/10 bg-dark-900 mb-4 relative">
                      <img src={item.ImageURL || "/assets/SM.png"} className="w-full h-full object-cover" alt="" />
                      <span className={`absolute top-2.5 left-2.5 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${statusColors[item.status || "pending"]}`}>
                        {item.status || "PENDING"}
                      </span>
                    </div>

                    <h4 className="font-bold text-white group-hover:text-indigo-400 transition-colors text-sm truncate">{item.Title}</h4>
                    <p className="text-[10px] text-gray-500 uppercase font-black mt-1.5">{CATEGORY_NAMES[item.Category || ""] || "Vetted Resource"}</p>
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mt-2">{item.Description || "No description provided."}</p>
                  </div>

                  <div className="flex justify-between items-center gap-4 mt-6 pt-4 border-t border-white/5">
                    <span className="text-xs font-black text-emerald-400">₹{item.price || 0} / ${item.priceUSD || 0}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => moveItem(items.indexOf(item), 'up')}
                        disabled={items.indexOf(item) === 0}
                        className="bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 rounded-lg px-2 py-1 text-[10px] transition-all"
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveItem(items.indexOf(item), 'down')}
                        disabled={items.indexOf(item) === items.length - 1}
                        className="bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 rounded-lg px-2 py-1 text-[10px] transition-all"
                        title="Move Down"
                      >
                        ▼
                      </button>
                      <button
                        onClick={() => openFormModal(item)}
                        className="bg-white/5 hover:bg-indigo-600 hover:text-white border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-indigo-400 transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id!, item.Title, item.ImageURL, item.DownloadLink)}
                        className="bg-red-500/10 hover:bg-red-650 text-red-400 hover:text-white rounded-lg px-2.5 py-1.5 text-[10px] font-bold border border-red-500/20 transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Asset Form Modal */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
          <div className="glass-card rounded-3xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-white/10 shrink-0 flex justify-between items-center bg-[#0d0d12]/50">
              <h3 className="text-xl font-black tracking-tight text-white">
                {editingId ? "Modify Asset Specifications" : "Submit Creator Marketplace Listing"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <i className="fa-solid fa-times text-sm"></i>
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
              <form id="asset-form" onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 font-bold">Asset Title</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Vintage Film Transitions LUTs"
                      className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Removed Category Dropdown */}

                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 font-bold">Compatible Software (Multiple Options)</label>
                      <div className="flex flex-wrap gap-2 pt-1.5">
                        {["premierePro", "afterEffects", "photoshop", "davinciResolve"].map((app) => (
                          <button
                            type="button"
                            key={app}
                            onClick={() => {
                              setCompatibleWith((prev) =>
                                prev.includes(app) ? prev.filter((x) => x !== app) : [...prev, app]
                              );
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                              compatibleWith.includes(app)
                                ? "bg-indigo-600 border-indigo-500 text-white"
                                : "bg-white/5 border-white/10 text-gray-400"
                            }`}
                          >
                            {app}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upload Thumbnail Box */}
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-bold">Product Thumbnail image (2 MB Cap)</label>
                  <div className="w-full h-32 rounded-xl bg-dark-900 border border-white/10 overflow-hidden flex items-center justify-center relative">
                    {imageURL ? (
                      <img src={imageURL} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span className="text-[10px] text-gray-500 font-bold uppercase">No Thumbnail Uploaded</span>
                    )}
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-xs text-gray-400 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-white/5 file:text-indigo-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-bold">Standard Price (INR)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-bold">International Price (USD)</label>
                  <input
                    type="number"
                    value={priceUSD}
                    onChange={(e) => setPriceUSD(Number(e.target.value))}
                    className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold">Product Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 resize-none text-white"
                />
              </div>

              {/* Product Direct File Upload or External link */}
              <div className="glass-card p-5 rounded-2xl space-y-4 border border-white/5">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Product Asset Delivery</h4>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-end">
                  <div className="space-y-2">
                    <label className="block text-xs text-gray-400 font-bold h-auto lg:h-8 flex items-end">Upload direct product file (100 MB max limit)</label>
                    <input
                      type="file"
                      disabled={uploadingFile}
                      onChange={(e) => handleProductFileUpload(e)}
                      className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-white/5 file:text-indigo-400 disabled:opacity-50"
                    />
                    {uploadProgress && <p className="text-[10px] text-indigo-400 animate-pulse">{uploadProgress}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs text-gray-400 font-bold h-auto lg:h-8 flex items-end">Direct download Link OR external URL (mandatory if file size is &gt; 100 MB)</label>
                    <input
                      type="text"
                      value={downloadLink}
                      onChange={(e) => setDownloadLink(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Version History List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Versions History (Optional)</h4>
                  <button
                    type="button"
                    onClick={() => setVersions([...versions, { Name: "", Link: "" }])}
                    className="text-indigo-400 hover:text-indigo-300 font-bold text-xs"
                  >
                    + Add version row
                  </button>
                </div>

                {versions.map((ver, idx) => (
                  <div key={idx} className="flex gap-4 items-center bg-dark-900/50 p-4 rounded-xl border border-white/5">
                    <input
                      type="text"
                      placeholder="Name (e.g. Version 1.2)"
                      required
                      value={ver.Name}
                      onChange={(e) => {
                        const copy = [...versions];
                        copy[idx].Name = e.target.value;
                        setVersions(copy);
                      }}
                      className="bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none w-1/4 text-white"
                    />
                    <input
                      type="text"
                      placeholder="Download Link URL"
                      required
                      value={ver.Link}
                      onChange={(e) => {
                        const copy = [...versions];
                        copy[idx].Link = e.target.value;
                        setVersions(copy);
                      }}
                      className="bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none flex-1 text-white"
                    />
                    <input
                      type="file"
                      onChange={(e) => handleProductFileUpload(e, idx)}
                      className="text-[10px] text-gray-500 w-1/4"
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
              </form>
            </div>

            {/* Footer */}
            <div className="p-6 md:p-8 border-t border-white/10 shrink-0 bg-[#0d0d12]/80 flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 text-gray-300 hover:text-white font-bold text-xs px-6 py-3 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="asset-form"
                disabled={saving}
                className="bg-gradient-to-r from-brand-600 to-indigo-500 hover:from-brand-500 hover:to-indigo-400 text-white font-bold text-xs px-8 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Saving...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-paper-plane"></i> Submit for Review
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
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
