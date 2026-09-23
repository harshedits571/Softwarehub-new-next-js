"use client";

import React, { useState, useEffect } from "react";
import { firestore as db } from "@/utils/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export interface VersionHistoryItem {
  version: string;
  downloadUrl: string;
  fileName?: string;
  fileSizeMB?: number;
  releaseDate: string;
  releaseNotes: string;
  mandatory?: boolean;
  downloads?: number;
}

export interface SoftwareUpdateConfig {
  currentVersion: string;
  downloadUrl: string;
  fileName: string;
  fileSizeMB: number;
  releaseDate: string;
  releaseNotes: string;
  mandatory: boolean;
  totalDownloads: number;
  history: VersionHistoryItem[];
  updatedAt?: any;
}

const DEFAULT_CONFIG: SoftwareUpdateConfig = {
  currentVersion: "1.0.4",
  downloadUrl: "https://softwarehubs.in/downloads/PersonalCloud_Setup_v1.0.4.exe",
  fileName: "PersonalCloud_Setup_v1.0.4.exe",
  fileSizeMB: 48.2,
  releaseDate: new Date().toISOString().slice(0, 10),
  releaseNotes: "• Initial public release\n• Local PC storage synchronization\n• Real-time file indexing\n• Automatic LAN and WAN remote access",
  mandatory: false,
  totalDownloads: 142,
  history: [
    {
      version: "1.0.3",
      downloadUrl: "https://softwarehubs.in/downloads/PersonalCloud_Setup_v1.0.3.exe",
      fileName: "PersonalCloud_Setup_v1.0.3.exe",
      fileSizeMB: 47.9,
      releaseDate: "2026-09-10",
      releaseNotes: "• Internal beta release\n• Fixed background sync service daemon\n• Improved file upload throughput",
      downloads: 85,
    },
  ],
};

interface SoftwareUpdatesTabProps {
  onRefresh?: () => void;
}

export default function SoftwareUpdatesTab({ onRefresh }: SoftwareUpdatesTabProps) {
  const [config, setConfig] = useState<SoftwareUpdateConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // New release modal / drawer
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [newVersion, setNewVersion] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [newFileSize, setNewFileSize] = useState(48.5);
  const [newNotes, setNewNotes] = useState("");
  const [newMandatory, setNewMandatory] = useState(false);

  // Fetch Firestore config
  useEffect(() => {
    async function fetchConfig() {
      try {
        const snap = await getDoc(doc(db, "config", "personal_cloud_updates"));
        if (snap.exists()) {
          setConfig({ ...DEFAULT_CONFIG, ...snap.data() });
        }
      } catch (err) {
        console.error("Error fetching updates config:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const copyDownloadLink = () => {
    navigator.clipboard.writeText(config.downloadUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const openPublishModal = () => {
    setNewVersion("");
    setNewUrl("");
    setNewFileName("");
    setNewFileSize(config.fileSizeMB || 48.5);
    setNewNotes("• Performance improvements\n• Bug fixes and stability enhancements");
    setNewMandatory(false);
    setShowPublishModal(true);
  };

  const handlePublishNewRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersion.trim() || !newUrl.trim()) {
      alert("Version and download URL are required!");
      return;
    }

    setSaving(true);
    try {
      // Archive current version into history
      const oldItem: VersionHistoryItem = {
        version: config.currentVersion,
        downloadUrl: config.downloadUrl,
        fileName: config.fileName,
        fileSizeMB: config.fileSizeMB,
        releaseDate: config.releaseDate,
        releaseNotes: config.releaseNotes,
        mandatory: config.mandatory,
        downloads: config.totalDownloads,
      };

      const updatedHistory = [oldItem, ...(config.history || [])];

      const newConfig: SoftwareUpdateConfig = {
        currentVersion: newVersion.trim().replace(/^v/, ""),
        downloadUrl: newUrl.trim(),
        fileName: newFileName.trim() || `PersonalCloud_Setup_v${newVersion.trim().replace(/^v/, "")}.exe`,
        fileSizeMB: Number(newFileSize),
        releaseDate: new Date().toISOString().slice(0, 10),
        releaseNotes: newNotes.trim(),
        mandatory: newMandatory,
        totalDownloads: 0,
        history: updatedHistory,
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "config", "personal_cloud_updates"), newConfig, { merge: true });
      setConfig(newConfig);
      setShowPublishModal(false);
      if (onRefresh) onRefresh();
      alert(`Release v${newConfig.currentVersion} published successfully!`);
    } catch (err: any) {
      alert("Error publishing update: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRollback = async (histItem: VersionHistoryItem, index: number) => {
    if (
      !confirm(
        `Roll back to version v${histItem.version}?\nThis will make v${histItem.version} the active download for all customers.`
      )
    )
      return;

    setSaving(true);
    try {
      // Archive current into history, and promote histItem
      const oldCurrent: VersionHistoryItem = {
        version: config.currentVersion,
        downloadUrl: config.downloadUrl,
        fileName: config.fileName,
        fileSizeMB: config.fileSizeMB,
        releaseDate: config.releaseDate,
        releaseNotes: config.releaseNotes,
        mandatory: config.mandatory,
        downloads: config.totalDownloads,
      };

      const newHistory = [...config.history];
      newHistory.splice(index, 1);
      newHistory.unshift(oldCurrent);

      const rollbackConfig: SoftwareUpdateConfig = {
        currentVersion: histItem.version,
        downloadUrl: histItem.downloadUrl,
        fileName: histItem.fileName || `PersonalCloud_Setup_v${histItem.version}.exe`,
        fileSizeMB: histItem.fileSizeMB || 48.0,
        releaseDate: histItem.releaseDate,
        releaseNotes: histItem.releaseNotes,
        mandatory: histItem.mandatory || false,
        totalDownloads: histItem.downloads || 0,
        history: newHistory,
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "config", "personal_cloud_updates"), rollbackConfig, { merge: true });
      setConfig(rollbackConfig);
      if (onRefresh) onRefresh();
      alert(`Successfully rolled back to v${histItem.version}!`);
    } catch (err: any) {
      alert("Error rolling back: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#121622] via-[#151c2d] to-[#121622] border border-cyan-500/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                Live Software Release
              </span>
              <span className="text-white text-xs font-mono font-bold bg-white/10 px-2 py-0.5 rounded">
                v{config.currentVersion}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">
              Personal Cloud for Windows (Desktop Client)
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Manage the download URL that customers receive upon purchase and auto-updater endpoint for Windows desktop clients.
            </p>
          </div>

          <button
            onClick={openPublishModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs shadow-lg shadow-cyan-500/25 hover:brightness-110 transition active:scale-95 whitespace-nowrap"
          >
            <i className="fa-solid fa-cloud-arrow-up text-sm"></i>
            Publish New Version
          </button>
        </div>

        {/* Current Release Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/5 relative z-10">
          <div className="bg-[#0a0d14]/60 p-3.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
              Installer File
            </span>
            <div className="font-mono text-xs font-semibold text-white truncate" title={config.fileName}>
              {config.fileName}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Size: {config.fileSizeMB} MB</span>
          </div>

          <div className="bg-[#0a0d14]/60 p-3.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
              Release Date
            </span>
            <div className="text-xs font-semibold text-white">{config.releaseDate}</div>
            <span className="text-[11px] text-emerald-400 mt-1 block">
              {config.mandatory ? "Critical (Forced)" : "Standard update"}
            </span>
          </div>

          <div className="bg-[#0a0d14]/60 p-3.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
              Total Client Downloads
            </span>
            <div className="text-lg font-bold text-cyan-300">{config.totalDownloads || 0}</div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Recorded downloads</span>
          </div>

          <div className="bg-[#0a0d14]/60 p-3.5 rounded-xl border border-white/5 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
              Direct Download URL
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={config.downloadUrl}
                className="w-full bg-black/40 text-slate-300 px-2 py-1 rounded text-[11px] font-mono border border-white/10 truncate"
              />
              <button
                onClick={copyDownloadLink}
                className={`p-1.5 rounded transition text-xs ${
                  copiedUrl ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-slate-400 hover:text-white"
                }`}
                title="Copy URL"
              >
                <i className={`fa-solid ${copiedUrl ? "fa-check" : "fa-copy"}`}></i>
              </button>
            </div>
          </div>
        </div>

        {/* Release Notes */}
        <div className="mt-4 pt-4 border-t border-white/5">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
            Current Release Notes
          </span>
          <pre className="text-xs text-slate-300 font-sans whitespace-pre-line bg-[#0a0d14]/40 p-3 rounded-lg border border-white/5">
            {config.releaseNotes}
          </pre>
        </div>
      </div>

      {/* Version History & Rollback Section */}
      <div className="bg-[#121622] rounded-xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-clock-rotate-left text-cyan-400"></i>
            <h3 className="font-bold text-white text-xs">Version History & 1-Click Rollback Support</h3>
          </div>
          <span className="text-[11px] text-slate-500">
            {config.history?.length || 0} archived versions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                <th className="py-3 px-4">Version</th>
                <th className="py-3 px-4">Installer File</th>
                <th className="py-3 px-4">Release Date</th>
                <th className="py-3 px-4">Downloads</th>
                <th className="py-3 px-4">Changelog Preview</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {!config.history || config.history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No past archived releases found.
                  </td>
                </tr>
              ) : (
                config.history.map((hist, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded border border-white/10 text-xs">
                        v{hist.version}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                      {hist.fileName || `PersonalCloud_Setup_v${hist.version}.exe`}
                      {hist.fileSizeMB && (
                        <span className="text-slate-500 ml-1.5">({hist.fileSizeMB} MB)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">{hist.releaseDate}</td>
                    <td className="py-3 px-4 text-slate-300 font-semibold">{hist.downloads || 0}</td>
                    <td className="py-3 px-4">
                      <div className="text-[11px] text-slate-400 line-clamp-1 max-w-[260px]">
                        {hist.releaseNotes}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={hist.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Download this installer file"
                          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/10 text-xs transition"
                        >
                          <i className="fa-solid fa-download"></i>
                        </a>
                        <button
                          onClick={() => handleRollback(hist, idx)}
                          disabled={saving}
                          title="Roll back and make this version active"
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[11px] font-semibold transition"
                        >
                          <i className="fa-solid fa-rotate-left text-[10px]"></i> Rollback
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Publish New Release Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-white/10 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <i className="fa-solid fa-upload text-cyan-400"></i>
                  Publish New Version
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update the live download URL and notify all desktop clients
                </p>
              </div>
              <button
                onClick={() => setShowPublishModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <form onSubmit={handlePublishNewRelease} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Version Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1.0.5 or 1.1.0"
                    value={newVersion}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNewVersion(v);
                      if (!newFileName || newFileName.startsWith("PersonalCloud_Setup_")) {
                        setNewFileName(`PersonalCloud_Setup_v${v.replace(/^v/, "")}.exe`);
                      }
                    }}
                    className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">File Size (MB)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={newFileSize}
                    onChange={(e) => setNewFileSize(Number(e.target.value))}
                    className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Direct Download Link (URL) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://drive.google.com/... or https://your-server.com/setup.exe"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Installer File Name</label>
                <input
                  type="text"
                  placeholder="PersonalCloud_Setup_v1.0.5.exe"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Release Notes / Changelog</label>
                <textarea
                  rows={4}
                  required
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="• Fixed sync bug&#10;• Added auto-restart daemon&#10;• Improved throughput"
                  className="w-full bg-[#0a0d14] text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
                ></textarea>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="mandatoryCheck"
                  checked={newMandatory}
                  onChange={(e) => setNewMandatory(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#0a0d14] border-white/10 text-cyan-500 focus:ring-0"
                />
                <label htmlFor="mandatoryCheck" className="text-slate-300 font-medium cursor-pointer">
                  Mandatory update (requires all active desktop clients to upgrade immediately)
                </label>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium shadow-lg shadow-cyan-500/20 hover:brightness-110 transition disabled:opacity-50"
                >
                  {saving ? "Publishing..." : "Publish Release"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
