"use client";

import React, { useState } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { firestore } from "../utils/firebase";

interface BrokenLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceName: string;
  category: string;
  onToast: (msg: string, type: "success" | "error" | "info") => void;
}

export const BrokenLinkModal: React.FC<BrokenLinkModalProps> = ({
  isOpen,
  onClose,
  resourceName,
  category,
  onToast,
}) => {
  const [userName, setUserName] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!details.trim()) {
      setError(true);
      return;
    }

    const reportData = {
      userName: userName.trim() || "Anonymous",
      resourceName,
      category,
      details: details.trim(),
      timestamp: Timestamp.now(),
      status: "pending",
    };

    try {
      await addDoc(collection(firestore, "brokenLinkReports"), reportData);
      onToast("Thank you for your report! We will look into it shortly.", "success");
      setDetails("");
      setUserName("");
      setError(false);
      onClose();
    } catch (err) {
      console.error("Error submitting report:", err);
      onToast("Failed to submit report. Please try again.", "error");
    }
  };

  return (
    <div className="custom-modal active">
      <div className="custom-modal-card relative text-left">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <i className="fa-solid fa-triangle-exclamation text-red-500 text-xs"></i>
            </div>
            <h3 className="text-md font-bold text-white">Report Broken Link</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-medium text-gray-400 mb-1">
              Your Name (Optional)
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full bg-dark-900 border border-white/5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-red-500/50 transition-colors placeholder-gray-600 text-xs"
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-400 mb-1">
              Resource Name
            </label>
            <input
              type="text"
              value={resourceName}
              readOnly
              className="w-full bg-dark-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-gray-400 cursor-not-allowed text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-400 mb-1">
              Category
            </label>
            <input
              type="text"
              value={category}
              readOnly
              className="w-full bg-dark-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-gray-400 cursor-not-allowed text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-400 mb-1">Details</label>
            <textarea
              value={details}
              onChange={(e) => {
                setDetails(e.target.value);
                if (e.target.value.trim()) setError(false);
              }}
              rows={2}
              className={`w-full bg-dark-900 border ${
                error ? "border-red-500 focus:ring-red-500" : "border-white/5 focus:border-red-500/50"
              } rounded-xl px-4 py-2.5 text-white focus:outline-none transition-colors placeholder-gray-600 text-xs resize-none`}
              placeholder="Describe the issue..."
            />
            {error && (
              <p className="text-red-500 text-[10px] mt-1 animate-pulse">
                Please provide details to help us fix this faster.
              </p>
            )}
          </div>
          <button
            type="submit"
            className="w-full mt-3 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg active:scale-95 text-xs flex items-center justify-center gap-2"
          >
            Submit Report
          </button>
        </form>
      </div>
    </div>
  );
};
