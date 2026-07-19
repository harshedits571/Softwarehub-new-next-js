"use client";

import React, { useEffect, useState } from "react";

interface DriveFile {
  id: string;
  name: string;
  size: string;
  downloadUrl: string;
  parentFolder?: string;
}

interface GDriveSyncProps {
  onImportFile: (itemData: {
    Title: string;
    Description: string;
    DownloadDescription: string;
    ImageURL: string;
    DownloadLink: string;
    collection: string;
    compatibleWith: string[];
    Versions: { Name: string; Link: string }[];
  }) => void;
}

export default function GDriveSync({ onImportFile }: GDriveSyncProps) {
  const [url, setUrl] = useState("");
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [importingFileId, setImportingFileId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("softwherehub_gdrive_api_url") || "";
    setUrl(saved);
  }, []);

  const handleSaveUrl = () => {
    localStorage.setItem("softwherehub_gdrive_api_url", url.trim());
    alert("Google Apps Script URL saved locally.");
  };

  const handleFetchFiles = async () => {
    if (!url.trim()) {
      alert("Please enter your Google Apps Script Web App URL first!");
      return;
    }

    setLoading(true);
    setFiles([]);

    try {
      // Use standard fetch (since Google Apps Script adds CORS header when no callback is provided)
      const res = await fetch(url.trim());
      const data = await res.json();
      if (data.success && data.files) {
        setFiles(data.files);
      } else {
        alert("Failed to load: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      console.error("GDrive Fetch Error:", err);
      alert("Error fetching files. Make sure the Apps Script is deployed as 'Anyone' and CORS is active.");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (file: DriveFile) => {
    setImportingFileId(file.id);
    const fileName = file.name;

    // 1. Version Match Regex
    let version = "v1.0";
    const versionMatch = fileName.match(/v?\d+(\.\d+)+/i);
    if (versionMatch) {
      version = versionMatch[0];
      if (!version.toLowerCase().startsWith("v")) version = "v" + version;
    }

    // 2. Clean Title
    let cleanTitle = fileName
      .replace(/\.[^/.]+$/, "") // strip extension (.zip)
      .replace(/aescripts/gi, "")
      .replace(/by harsh edits/gi, "")
      .replace(/by harsh/gi, "")
      .replace(/win/gi, "")
      .replace(/mac/gi, "")
      .replace(/windows/gi, "")
      .replace(/macos/gi, "")
      .replace(versionMatch ? versionMatch[0] : "", "") // strip version
      .replace(/[\._\-\+]/g, " ") // replace dots/underscores/dashes with spaces
      .replace(/\s+/g, " ")
      .trim();

    // Capitalize title
    cleanTitle = cleanTitle
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    let description = `Download ${cleanTitle} full pre-activated version. Direct cloud download.`;
    let downloadDescription = `Features a high-speed Google Drive download link for ${cleanTitle} ${version}. Clean, secure, and ready to install.`;
    let collection = "plugins";
    let compatibility = ["afterEffects"];
    let imageUrl = "";

    // 3. Query Groq AI API
    const groqApiKey = "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";
    if (groqApiKey) {
      try {
        const prompt = `
Analyze this plugin/extension name: "${cleanTitle}" (Filename: "${fileName}").
Classify it and return a JSON object with this exact structure:
{
  "collection": "plugins", "scripts", "assets", or "utilities",
  "compatibleWith": ["afterEffects", "premierePro", "photoshop", "illustrator", "davinciResolve"],
  "description": "A very short, engaging, one-sentence description under 100 characters.",
  "downloadDescription": "A longer, detailed description (2-3 sentences) describing its features for the download modal window.",
  "imageSearchKeyword": "A precise Unsplash search term for the background (e.g. 'purple gradient texture' or '3d geometric shapes')"
}
Return ONLY the raw JSON object. Do not include markdown formatting or code blocks.
`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + groqApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              {
                role: "system",
                content: "You are an assistant that outputs only valid JSON. Do not write any conversational text.",
              },
              { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
          }),
        });

        const result = await response.json();
        if (result.choices?.[0]?.message?.content) {
          const aiData = JSON.parse(result.choices[0].message.content);
          if (aiData) {
            description = aiData.description || description;
            downloadDescription = aiData.downloadDescription || downloadDescription;
            compatibility = aiData.compatibleWith || compatibility;
            collection = aiData.collection || collection;

            const keyword = aiData.imageSearchKeyword || "abstract";
            imageUrl = `https://images.unsplash.com/featured/600x400/?${encodeURIComponent(keyword)}`;
          }
        }
      } catch (e) {
        console.error("Groq AI failed:", e);
      }
    }

    setImportingFileId(null);

    // Pass the parsed info to main dashboard callback
    onImportFile({
      Title: cleanTitle,
      Description: description,
      DownloadDescription: downloadDescription,
      ImageURL: imageUrl,
      DownloadLink: file.downloadUrl,
      collection,
      compatibleWith: compatibility,
      Versions: [{ Name: version, Link: file.downloadUrl }],
    });
  };

  return (
    <div className="space-y-6 text-white animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Google Drive Importer</h2>
        <p className="text-gray-400 text-xs mt-1">
          Select files directly from your Google Drive folder, auto-parse them using Groq AI, and save them.
        </p>
      </div>

      <div className="glass-card p-6 rounded-2xl space-y-4">
        <div className="space-y-2">
          <label className="text-xs text-gray-400 font-bold">Google Apps Script Web App URL</label>
          <div className="flex gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="flex-1 bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleSaveUrl}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs px-4 py-3 rounded-xl transition-all"
            >
              Save URL
            </button>
            <button
              onClick={handleFetchFiles}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 shrink-0"
            >
              {loading ? "Loading..." : "Fetch Files"}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="text-xs font-semibold">Scanning Google Drive folder recursively...</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                  <th className="px-6 py-4">File Name</th>
                  <th className="px-6 py-4">Size</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {files.length > 0 ? (
                  files.map((file) => (
                    <tr key={file.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-200">
                        {file.name}
                        {file.parentFolder && (
                          <span className="block text-[10px] text-indigo-400/80 font-bold mt-1">
                            📁 {file.parentFolder}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500">{file.size}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleImport(file)}
                          disabled={importingFileId !== null}
                          className="bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 px-3.5 py-1.5 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50 active:scale-95"
                        >
                          {importingFileId === file.id ? "Analyzing with AI..." : "Import to Site"}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                      No installer files found or URL not fetched yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
