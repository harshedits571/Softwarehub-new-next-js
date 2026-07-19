"use client";

import React, { useState } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { firestore } from "../utils/firebase";
import { useAuth } from "../context/AuthContext";

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle: string;
  versionName: string;
  ownerUid?: string;
  onToast: (msg: string, type: "success" | "error" | "info") => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  onClose,
  itemId,
  itemTitle,
  versionName,
  ownerUid,
  onToast,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      setError(true);
      return;
    }

    if (!currentUser) {
      onToast("You must be logged in to submit a rating", "error");
      return;
    }

    setSubmitting(true);

    try {
      const ratingData = {
        uid: currentUser.uid,
        userName: userProfile?.username || currentUser.displayName || "User",
        email: currentUser.email || "",
        rating: rating,
        feedback: feedback.trim(),
        timestamp: Timestamp.now(),
        resourceId: itemId,
        version: versionName,
        ownerUid: ownerUid || null,
      };

      const ratingsCol = collection(firestore, "productReviews");
      await addDoc(ratingsCol, ratingData);

      onToast("Thank you for your feedback!", "success");
      setRating(0);
      setFeedback("");
      setError(false);
      onClose();
    } catch (err) {
      console.error("Rating submission failed:", err);
      onToast("Failed to save rating. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="custom-modal active">
      <div className="custom-modal-card relative text-center bg-[#0f0f15]">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
            <i className="fa-solid fa-star text-2xl text-white"></i>
          </div>
        </div>

        <h3 className="text-xl font-bold text-white mb-2 tracking-tight">How was your download?</h3>
        <p className="text-gray-500 text-xs mb-6 leading-relaxed px-4">
          Your feedback helps us maintain the quality of{" "}
          <span className="text-brand-400 font-bold">{itemTitle}</span>.
        </p>

        {/* Star Rating buttons */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="star-btn group"
              onClick={() => {
                setRating(star);
                setError(false);
              }}
            >
              <i
                className={`fa-solid fa-star text-3xl transition-colors ${
                  star <= rating
                    ? "text-yellow-500 active"
                    : "text-gray-700 group-hover:text-yellow-500/50"
                }`}
              ></i>
            </button>
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-[10px] mb-4">Please select a rating to continue.</p>
        )}

        <div className="mb-6">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Write a short review (Optional)..."
            className="w-full bg-dark-900 border border-white/10 rounded-xl p-3 text-white text-xs focus:ring-1 focus:ring-brand-500 outline-none resize-none h-20 placeholder-gray-600"
          ></textarea>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-brand-500 hover:bg-brand-400 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs"
        >
          {submitting ? "SUBMITTING..." : "SUBMIT RATING"}
        </button>
        <p className="text-[9px] text-gray-600 mt-5 uppercase tracking-widest font-bold">
          Feedback is required for transparency
        </p>
      </div>
    </div>
  );
};
