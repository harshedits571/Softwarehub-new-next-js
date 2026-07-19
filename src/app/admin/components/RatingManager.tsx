"use client";

import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, deleteDoc, query, orderBy } from "firebase/firestore";
import { firestore } from "../../../utils/firebase";

interface RatingItem {
  id: string; // The Firestore doc ID
  itemId: string;
  versionName: string;
  rating: number;
  userName: string;
  email: string;
  feedback?: string;
  timestamp: number;
  resourceTitle?: string;
  resourceId?: string;
}

export default function RatingManager() {
  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadRatings = async () => {
    setLoading(true);
    try {
      const q = query(collection(firestore, "ratings"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      const allRatings: RatingItem[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        let ts = data.timestamp;
        if (ts && typeof ts.toMillis === "function") {
          ts = ts.toMillis();
        } else if (ts && typeof ts === "object" && ts.seconds) {
          ts = ts.seconds * 1000;
        } else {
          ts = Number(ts) || Date.now();
        }

        allRatings.push({
          id: docSnap.id,
          itemId: data.resourceId || "",
          versionName: data.version || "Direct Download",
          rating: Number(data.rating || data.stars || 5),
          userName: data.userName || "User",
          email: data.email || "",
          feedback: data.feedback || "",
          timestamp: ts,
          resourceTitle: data.resourceTitle || "",
          resourceId: data.resourceId || "",
        });
      });

      setRatings(allRatings);
    } catch (err) {
      console.error("Error loading ratings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRatings();
  }, []);

  const handleDelete = async (r: RatingItem) => {
    if (!window.confirm(`Are you sure you want to delete this rating from "${r.userName}"?`)) return;

    try {
      const ratingDocRef = doc(firestore, "ratings", r.id);
      await deleteDoc(ratingDocRef);
      alert("Rating deleted successfully.");
      loadRatings();
    } catch (err: any) {
      console.error("Error deleting rating:", err);
      alert("Failed to delete rating: " + err.message);
    }
  };

  const filteredRatings = ratings.filter(
    (r) =>
      r.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.resourceTitle || r.resourceId || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (r.feedback || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 text-white animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Ratings & <span className="text-indigo-400">Feedback</span>
          </h2>
          <p className="text-gray-400 text-xs mt-1">Review feedback and moderate ratings</p>
        </div>
        <input
          type="text"
          placeholder="Search reviews..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-dark-900 border border-white/5 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-indigo-500 w-48 md:w-64"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="text-xs font-semibold">Loading reviews...</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                  <th className="px-6 py-4">Resource</th>
                  <th className="px-6 py-4">Version</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Stars</th>
                  <th className="px-6 py-4">Feedback</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredRatings.length > 0 ? (
                  filteredRatings.map((r) => (
                    <tr key={r.id} className="hover:bg-white/2 transition-all">
                      <td className="px-6 py-4 font-bold text-white">
                        {r.resourceTitle || r.resourceId}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700 text-[10px]">
                          {r.versionName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">{r.userName}</span>
                          <span className="text-[10px] text-gray-500">{r.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex text-yellow-500 gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <i
                              key={i}
                              className={`${
                                i < r.rating ? "fa-solid" : "fa-regular"
                              } fa-star text-[10px]`}
                            ></i>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate">
                        {r.feedback ? (
                          <span className="italic text-gray-300">"{r.feedback}"</span>
                        ) : (
                          <span className="text-gray-600 italic">No comment</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {r.timestamp ? new Date(r.timestamp).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(r)}
                          className="bg-red-500/10 hover:bg-red-600 hover:text-white border border-red-500/20 text-red-400 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-all active:scale-95"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No ratings yet.
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
