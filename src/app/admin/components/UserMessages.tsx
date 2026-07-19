"use client";

import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, deleteDoc, updateDoc, writeBatch, query, orderBy } from "firebase/firestore";
import { firestore } from "../../../utils/firebase";

interface UserMessage {
  id: string;
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  type?: string;
  timestamp: number;
  read?: boolean;
}

export default function UserMessages() {
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "today" | "week">("all");
  const [selectedMsg, setSelectedMsg] = useState<UserMessage | null>(null);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const q = query(collection(firestore, "userMessages"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      const list: UserMessage[] = [];
      snap.forEach((docSnap) => {
        const val = docSnap.data();
        let ts = val.timestamp;
        if (ts && typeof ts.toMillis === "function") {
          ts = ts.toMillis();
        } else if (ts && typeof ts === "object" && ts.seconds) {
          ts = ts.seconds * 1000;
        } else {
          ts = Number(ts) || Date.now();
        }

        list.push({
          id: docSnap.id,
          name: val.name,
          email: val.email,
          subject: val.subject,
          message: val.message,
          type: val.type,
          timestamp: ts,
          read: !!val.read,
        });
      });

      setMessages(list);
    } catch (err) {
      console.error("Error loading user messages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;

    try {
      const msgDocRef = doc(firestore, "userMessages", id);
      await deleteDoc(msgDocRef);
      alert("Message deleted successfully.");
      if (selectedMsg?.id === id) {
        setSelectedMsg(null);
      }
      loadMessages();
    } catch (err: any) {
      console.error("Error deleting message:", err);
      alert("Failed to delete message: " + err.message);
    }
  };

  const handleDeleteAll = async () => {
    if (
      !window.confirm(
        "⚠️ WARNING: This will DELETE ALL user messages.\n\nAre you sure? This cannot be undone."
      )
    )
      return;

    try {
      const snap = await getDocs(collection(firestore, "userMessages"));
      const batch = writeBatch(firestore);
      snap.forEach((docSnap) => {
        batch.delete(doc(firestore, "userMessages", docSnap.id));
      });
      await batch.commit();
      alert("All messages deleted successfully.");
      setSelectedMsg(null);
      setMessages([]);
    } catch (err: any) {
      console.error("Error deleting all messages:", err);
      alert("Failed to delete all messages: " + err.message);
    }
  };

  const handleOpenDetail = async (msg: UserMessage) => {
    setSelectedMsg(msg);
    if (!msg.read) {
      try {
        const msgDocRef = doc(firestore, "userMessages", msg.id);
        await updateDoc(msgDocRef, { read: true });
        // Update local status
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, read: true } : m))
        );
      } catch (err) {
        console.error("Failed to mark message as read:", err);
      }
    }
  };

  const filteredMessages = messages.filter((msg) => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    if (filter === "today") return now - msg.timestamp < oneDay;
    if (filter === "week") return now - msg.timestamp < oneWeek;
    return true;
  });

  const getTypeColor = (type?: string) => {
    if (type === "Support/Request") return "bg-blue-600/20 text-blue-400 border-blue-500/20";
    if (type === "Contact/Problem") return "bg-rose-600/20 text-rose-400 border-rose-500/20";
    return "bg-indigo-600/20 text-indigo-400 border-indigo-500/20";
  };

  return (
    <div className="space-y-6 text-white animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            User <span className="text-indigo-400">Messages</span>
          </h2>
          <p className="text-gray-400 text-xs mt-1">Contact form and support submissions</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-dark-900 p-1.5 rounded-xl border border-white/5 flex gap-1">
            {(["all", "today", "week"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                  filter === opt
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95"
            >
              Delete All
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="text-xs font-semibold">Loading messages...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Messages list */}
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {filteredMessages.length > 0 ? (
              filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => handleOpenDetail(msg)}
                  className={`border rounded-2xl p-5 hover:border-indigo-500/50 cursor-pointer transition-all duration-200 ${
                    selectedMsg?.id === msg.id
                      ? "border-indigo-500 bg-indigo-500/5"
                      : msg.read
                      ? "border-white/5 bg-dark-800/40"
                      : "border-emerald-500/30 bg-emerald-500/5"
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-black text-sm uppercase">
                        {(msg.name || "A")[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-white text-xs">{msg.name || "Anonymous"}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[8px] font-bold border ${getTypeColor(
                              msg.type
                            )}`}
                          >
                            {msg.type || "MESSAGE"}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-500 mt-1 block">
                          {new Date(msg.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(msg.id);
                      }}
                      className="text-red-400 hover:text-white p-2 rounded-lg bg-white/0 hover:bg-red-600/20 transition-all shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="pl-12 mt-3 space-y-1">
                    {msg.subject && (
                      <p className="text-xs text-indigo-400 font-semibold">{msg.subject}</p>
                    )}
                    <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">
                      {msg.message || "No message content"}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 text-gray-500 glass-card rounded-2xl">
                <span className="text-3xl block mb-2">📥</span>
                <p className="text-xs font-semibold">No messages in this filter.</p>
              </div>
            )}
          </div>

          {/* Details screen */}
          <div className="glass-card rounded-2xl p-6 min-h-[40vh] flex flex-col justify-between">
            {selectedMsg ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-black text-base uppercase">
                      {(selectedMsg.name || "A")[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{selectedMsg.name || "Anonymous"}</h3>
                      <p className="text-[10px] text-gray-500 mt-0.5">{selectedMsg.email}</p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-[9px] font-bold border uppercase ${getTypeColor(
                      selectedMsg.type
                    )}`}
                  >
                    {selectedMsg.type || "MESSAGE"}
                  </span>
                </div>

                <div className="space-y-4">
                  {selectedMsg.subject && (
                    <div>
                      <h5 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                        Subject
                      </h5>
                      <p className="text-xs text-white font-bold mt-1">{selectedMsg.subject}</p>
                    </div>
                  )}
                  <div>
                    <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Message Content
                    </h5>
                    <p className="text-xs text-gray-300 leading-relaxed mt-2 whitespace-pre-wrap">
                      {selectedMsg.message}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500 flex-grow">
                <span className="text-4xl block mb-4">💬</span>
                <p className="text-xs font-semibold">Select a message from the list to read details.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
