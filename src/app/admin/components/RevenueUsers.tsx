"use client";

import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, deleteDoc, updateDoc, query, orderBy, where, getDoc, limit, onSnapshot } from "firebase/firestore";
import { firestore } from "../../../utils/firebase";

interface Transaction {
  id: string;
  uid: string;
  email?: string;
  name?: string;
  itemTitle?: string;
  amount: number;
  currency?: string;
  paymentId?: string;
  status?: string;
  timestamp: number;
  type?: string;
}

interface UserProfile {
  uid: string;
  userName?: string;
  name?: string;
  email?: string;
  createdAt?: number;
  isPaid?: boolean;
  isBanned?: boolean;
  isVerified?: boolean;
  role?: string;
  isCreatorApproved?: boolean;
  status?: string;
  purchased?: Record<string, boolean>;
  favorites?: Record<string, any>;
  downloadHistory?: Record<string, any>;
  lastDownload?: {
    resourceTitle: string;
    versionName: string;
    timestamp: number;
  };
}

interface FavoriteItem {
  Title?: string;
  Type?: string;
  ImageURL?: string;
}

interface DownloadLog {
  timestamp: number;
  resourceTitle?: string;
  versionName?: string;
}

interface UserRating {
  resourceTitle?: string;
  resourceId?: string;
  version?: string;
  rating?: number;
  feedback?: string;
  timestamp?: number;
}

export default function RevenueUsers() {
  const [loading, setLoading] = useState(true);

  const [toasts, setToasts] = useState<{ id: string; msg: string; type: "success" | "error" | "info" }[]>([]);
  const showToast = (msg: string, type: "success" | "error" | "info" = "info") => {
    const toastId = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id: toastId, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 4000);
  };

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pro" | "banned" | "download">("all");

  // Sorting
  const [sortKey, setSortKey] = useState<"name" | "joined" | "status" | "lastDownload">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // User Details Modal
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [userSpent, setUserSpent] = useState(0);
  const [userPurchases, setUserPurchases] = useState<Transaction[]>([]);
  const [userFavorites, setUserFavorites] = useState<FavoriteItem[]>([]);
  const [userDownloads, setUserDownloads] = useState<DownloadLog[]>([]);
  const [userRatings, setUserRatings] = useState<UserRating[]>([]);
  const [loadingModalData, setLoadingModalData] = useState(false);

  // Global Downloads State
  const [globalDownloads, setGlobalDownloads] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    let isMounted = true;

    // 1. Transactions Listener
    const txQuery = query(collection(firestore, "transactions"), orderBy("timestamp", "desc"));
    const unsubTx = onSnapshot(txQuery, (snap) => {
      if (!isMounted) return;
      const txList: Transaction[] = [];
      snap.forEach((docSnap) => {
        const val = docSnap.data();
        let ts = val.timestamp;
        if (ts && typeof ts.toMillis === "function") ts = ts.toMillis();
        else if (ts && typeof ts === "object" && ts.seconds) ts = ts.seconds * 1000;
        else ts = Number(ts) || Date.now();
        
        txList.push({
          id: docSnap.id,
          uid: val.uid || "",
          email: val.email,
          name: val.userName || val.name,
          itemTitle: val.itemTitle,
          amount: Number(val.amount) || 0,
          currency: val.currency || "INR",
          paymentId: val.paymentId,
          status: val.status || "success",
          type: val.type,
          timestamp: ts,
        });
      });
      setTransactions(txList);
    }, (err) => console.error("Error in transactions snapshot:", err));

    // 2. Users Listener
    const unsubUsers = onSnapshot(collection(firestore, "users"), (snap) => {
      if (!isMounted) return;
      const userList: UserProfile[] = [];
      snap.forEach((docSnap) => {
        const val = docSnap.data();
        let created = val.createdAt;
        if (created && typeof created.toMillis === "function") created = created.toMillis();
        else if (created && typeof created === "object" && created.seconds) created = created.seconds * 1000;
        else created = Number(created) || Date.now();

        let lastDl = val.lastDownload;
        if (lastDl && lastDl.timestamp && typeof lastDl.timestamp.toMillis === "function") {
          lastDl = { ...lastDl, timestamp: lastDl.timestamp.toMillis() };
        }

        let email = val.email;
        if (!email && val.downloadHistory) {
          const keys = Object.keys(val.downloadHistory);
          if (keys.length > 0) email = val.downloadHistory[keys[0]].email;
        }

        let name = val.name || val.userName;
        if (!name && email) name = email.split("@")[0];

        userList.push({
          uid: docSnap.id,
          userName: name || "Anonymous",
          name: name || "Anonymous",
          email: email || "",
          createdAt: created,
          isPaid: !!val.isPaid,
          isBanned: !!val.isBanned,
          isVerified: !!val.isVerified,
          role: val.role || "user",
          isCreatorApproved: !!val.isCreatorApproved,
          status: val.status || "",
          purchased: val.purchased,
          favorites: val.favorites,
          downloadHistory: val.downloadHistory,
          lastDownload: lastDl,
        });
      });
      setUsers(userList);
      setLoading(false); // Once users load, we can remove the spinner
    }, (err) => {
      console.error("Error in users snapshot:", err);
      setLoading(false);
    });

    // 3. Global Downloads Listener
    const dlQuery = query(collection(firestore, "downloadLogs"), orderBy("timestamp", "desc"), limit(50));
    const unsubDl = onSnapshot(dlQuery, (snap) => {
      if (!isMounted) return;
      const gdList = snap.docs.map(d => {
        const data = d.data();
        let ts = data.timestamp;
        if (ts && typeof ts.toMillis === "function") ts = ts.toMillis();
        else if (ts && typeof ts === "object" && ts.seconds) ts = ts.seconds * 1000;
        else ts = Number(ts) || Date.now();
        return { id: d.id, ...data, timestamp: ts };
      });
      setGlobalDownloads(gdList);
    }, (err) => console.error("Error in global downloads snapshot:", err));

    return () => {
      isMounted = false;
      unsubTx();
      unsubUsers();
      unsubDl();
    };
  }, []);

  // Calculate stats
  const totalRevenue = transactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  const proCount = users.filter((u) => u.isPaid).length;
  const individualSalesCount = transactions.filter((tx) => tx.type === "individual").length;

  // Actions
  const handleTogglePro = async (uid: string, status: boolean) => {
    const action = status ? "Grant" : "Revoke";
    if (!window.confirm(`Are you sure you want to ${action.toLowerCase()} Pro Access for this user?`)) return;

    try {
      const userDocRef = doc(firestore, "users", uid);
      await updateDoc(userDocRef, { isPaid: status });
      showToast(`${action}ed Pro Access successfully!`, "success");
      if (selectedUser?.uid === uid) {
        setSelectedUser((prev) => (prev ? { ...prev, isPaid: status } : null));
      }
    } catch (err: any) {
      showToast("Error: " + err.message, "error");
    }
  };

  const handleToggleVerification = async (uid: string, status: boolean) => {
    try {
      const userDocRef = doc(firestore, "users", uid);
      await updateDoc(userDocRef, { isVerified: status });
      showToast(`User ${status ? "verified" : "unverified"} successfully!`, "success");
      if (selectedUser?.uid === uid) {
        setSelectedUser((prev) => (prev ? { ...prev, isVerified: status } : null));
      }
    } catch (err: any) {
      showToast("Error: " + err.message, "error");
    }
  };

  const handleToggleBan = async (uid: string, status: boolean) => {
    const action = status ? "BAN" : "UNBAN";
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      const userDocRef = doc(firestore, "users", uid);
      await updateDoc(userDocRef, { isBanned: status });
      showToast(`User ${status ? "banned" : "unbanned"} successfully.`, "success");
      if (selectedUser?.uid === uid) {
        setSelectedUser((prev) => (prev ? { ...prev, isBanned: status } : null));
      }
    } catch (err: any) {
      showToast("Error: " + err.message, "error");
    }
  };

  const handleToggleCreator = async (uid: string, makeCreator: boolean) => {
    const action = makeCreator ? "Grant" : "Revoke";
    if (!window.confirm(`Are you sure you want to ${action.toLowerCase()} Creator Role for this user?`)) return;

    try {
      const userDocRef = doc(firestore, "users", uid);
      await updateDoc(userDocRef, {
        role: makeCreator ? "creator" : "user",
        isCreatorApproved: makeCreator,
        status: makeCreator ? "approved" : "revoked"
      });
      showToast(`${action}ed Creator Role successfully!`, "success");
      if (selectedUser?.uid === uid) {
        setSelectedUser((prev) => (prev ? { ...prev, role: makeCreator ? "creator" : "user", isCreatorApproved: makeCreator, status: makeCreator ? "approved" : "revoked" } : null));
      }
    } catch (err: any) {
      showToast("Error: " + err.message, "error");
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (
      !window.confirm(
        "Are you sure you want to PERMANENTLY DELETE this user's data from the database? This cannot be undone."
      )
    )
      return;

    try {
      const userDocRef = doc(firestore, "users", uid);
      await deleteDoc(userDocRef);
      showToast("User deleted successfully.", "success");
      setModalOpen(false);
    } catch (err: any) {
      showToast("Error: " + err.message, "error");
    }
  };

  const handleOpenDetails = async (user: UserProfile) => {
    setSelectedUser(user);
    setModalOpen(true);
    setLoadingModalData(true);

    try {
      // 1. Fetch user purchases from transaction list in state
      const userTxs = transactions.filter((tx) => tx.uid === user.uid);
      const totalSpent = userTxs.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
      setUserPurchases(userTxs);
      setUserSpent(totalSpent);

      // 2. Fetch Favorites from profile state
      const favs: FavoriteItem[] = Object.values(user.favorites || {}).map((f: any) => ({
        Title: f.title || f.Title,
        Type: f.type || f.Type,
        ImageURL: f.image || f.ImageURL,
      }));
      setUserFavorites(favs);

      // 3. Fetch Downloads from Firestore (merge legacy map with new collection logs)
      const dlQuery = query(collection(firestore, "downloadLogs"), where("uid", "==", user.uid));
      const dlSnap = await getDocs(dlQuery);
      const dls: DownloadLog[] = [];

      // A. Legacy downloadHistory map inside the user document
      if (user.downloadHistory) {
        Object.values(user.downloadHistory).forEach((log: any) => {
          let ts = log.timestamp;
          if (ts && typeof ts.toMillis === "function") {
            ts = ts.toMillis();
          } else if (ts && typeof ts === "object" && ts.seconds) {
            ts = ts.seconds * 1000;
          } else {
            ts = Number(ts) || Date.now();
          }
          dls.push({
            timestamp: ts,
            resourceTitle: log.resourceTitle || "Untitled Resource",
            versionName: log.versionName || "Latest",
          });
        });
      }

      // B. New logs in the downloadLogs collection
      dlSnap.forEach((child) => {
        const log = child.data();
        let ts = log.timestamp;
        if (ts && typeof ts.toMillis === "function") {
          ts = ts.toMillis();
        } else if (ts && typeof ts === "object" && ts.seconds) {
          ts = ts.seconds * 1000;
        } else {
          ts = Number(ts) || Date.now();
        }
        
        // Prevent duplication if timestamp matches
        const isDuplicate = dls.some(x => Math.abs(x.timestamp - ts) < 1000 && x.resourceTitle === log.resourceTitle);
        if (!isDuplicate) {
          dls.push({
            timestamp: ts,
            resourceTitle: log.resourceTitle || "Untitled Resource",
            versionName: log.versionName || "Latest",
          });
        }
      });
      dls.sort((a, b) => b.timestamp - a.timestamp);
      setUserDownloads(dls);

      // 4. Fetch User Ratings
      const ratingsQuery = query(collection(firestore, "ratings"), where("uid", "==", user.uid));
      const ratingsSnap = await getDocs(ratingsQuery);
      const ratings: UserRating[] = [];
      ratingsSnap.forEach((ratingNode) => {
        const r = ratingNode.data();
        let ts = r.timestamp;
        if (ts && typeof ts.toMillis === "function") {
          ts = ts.toMillis();
        } else if (ts && typeof ts === "object" && ts.seconds) {
          ts = ts.seconds * 1000;
        } else {
          ts = Number(ts) || Date.now();
        }
        ratings.push({
          resourceTitle: r.resourceTitle || r.resourceId,
          version: r.version || "Direct Download",
          rating: Number(r.rating || r.stars || 5),
          feedback: r.feedback,
          timestamp: ts,
        });
      });
      setUserRatings(ratings);
    } catch (err) {
      console.error("Error loading user details modal data:", err);
    } finally {
      setLoadingModalData(false);
    }
  };

  // Sorting Handler
  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  // Filters & Search & Sort logic
  const filteredUsers = users
    .filter((u) => {
      // 1. Status Filter
      if (statusFilter === "pro") return u.isPaid;
      if (statusFilter === "banned") return u.isBanned;
      if (statusFilter === "download") return u.lastDownload;
      return true;
    })
    .filter((u) => {
      // 2. Search query
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      const name = (u.userName || u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    })
    .sort((a, b) => {
      // 3. Sort
      let valA: any = "";
      let valB: any = "";

      if (sortKey === "name") {
        valA = (a.userName || a.name || a.email || "").toLowerCase();
        valB = (b.userName || b.name || b.email || "").toLowerCase();
      } else if (sortKey === "joined") {
        valA = a.createdAt || 0;
        valB = b.createdAt || 0;
      } else if (sortKey === "status") {
        valA = a.isPaid ? 1 : 0;
        valB = b.isPaid ? 1 : 0;
      } else if (sortKey === "lastDownload") {
        valA = a.lastDownload?.timestamp || 0;
        valB = b.lastDownload?.timestamp || 0;
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  // Pagination Logic
  const totalUsers = filteredUsers.length;
  const totalPages = Math.ceil(totalUsers / rowsPerPage) || 1;
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * rowsPerPage,
    Math.min(currentPage * rowsPerPage, totalUsers)
  );

  return (
    <div className="space-y-8 text-white animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Revenue & <span className="text-indigo-400">User Audit</span>
        </h2>
        <p className="text-gray-400 text-xs mt-1">Audit customer details, transaction history, and plans access</p>
      </div>

      {/* Revenue Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card border-l-4 border-emerald-500 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              ₹
            </div>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Total Revenue</span>
          </div>
          <h3 className="text-2xl font-black text-white">₹{totalRevenue.toFixed(2)}</h3>
          <p className="text-gray-500 text-[10px] mt-1">Gross earnings from all sources</p>
        </div>

        <div className="glass-card border-l-4 border-yellow-500 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-400">
              👑
            </div>
            <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider">Pro Members</span>
          </div>
          <h3 className="text-2xl font-black text-white">{proCount}</h3>
          <p className="text-gray-500 text-[10px] mt-1">Users with Lifetime Pro Access</p>
        </div>

        <div className="glass-card border-l-4 border-indigo-500 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              🛒
            </div>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Individual Sales</span>
          </div>
          <h3 className="text-2xl font-black text-white">{individualSalesCount}</h3>
          <p className="text-gray-500 text-[10px] mt-1">Standalone asset purchases</p>
        </div>
      </div>

      {/* Users Directory */}
      <div className="glass-card p-6 rounded-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">User Directory</h3>
            <p className="text-xs text-gray-400 mt-0.5">Audit user access, bans, and history logs</p>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-dark-900 border border-white/10 text-white rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 text-xs w-64"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 border-b border-white/5 pb-4">
          {([
            { id: "all", label: "All" },
            { id: "pro", label: "Pro Lifetime" },
            { id: "banned", label: "Banned" },
            { id: "download", label: "Downloads" },
          ] as const).map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                setStatusFilter(opt.id);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                statusFilter === opt.id
                  ? "bg-indigo-600 text-white"
                  : "bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                <th className="pb-3 cursor-pointer hover:text-indigo-400" onClick={() => handleSort("name")}>
                  User Details {sortKey === "name" && (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th className="pb-3 cursor-pointer hover:text-indigo-400" onClick={() => handleSort("status")}>
                  Plan / Status {sortKey === "status" && (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th className="pb-3">Purchased</th>
                <th className="pb-3 cursor-pointer hover:text-indigo-400" onClick={() => handleSort("joined")}>
                  Joined {sortKey === "joined" && (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th className="pb-3 cursor-pointer hover:text-indigo-400" onClick={() => handleSort("lastDownload")}>
                  Last Download {sortKey === "lastDownload" && (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <tr
                    key={user.uid}
                    onClick={() => handleOpenDetails(user)}
                    className="hover:bg-white/2 cursor-pointer transition-colors group"
                  >
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                          {(user.userName || user.name || user.email || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
                            {user.userName || user.name || "Anonymous"}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-0.5">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                            user.role === "admin"
                              ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                              : user.role === "creator"
                              ? "bg-green-500/10 border-green-500/20 text-green-400"
                              : user.isPaid
                              ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                              : "bg-gray-500/10 border-gray-500/20 text-gray-400"
                          }`}
                        >
                          {user.role === "admin" ? "Admin" : user.role === "creator" ? "Creator" : user.isPaid ? "Pro Lifetime" : "Free"}
                        </span>
                        {user.isBanned && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 uppercase">
                            Banned
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 text-gray-400">
                      {user.purchased ? `${Object.keys(user.purchased).length} Items` : "None"}
                    </td>
                    <td className="py-4 font-mono text-gray-500 text-[10px]">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="py-4">
                      {user.lastDownload ? (
                        <div className="space-y-0.5">
                          <p className="font-bold text-white text-[10px] truncate max-w-[150px]">
                            {user.lastDownload.resourceTitle}
                          </p>
                          <span className="text-[9px] text-gray-500">
                            {new Date(user.lastDownload.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-600 italic text-[10px]">No activity</span>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex gap-1.5 justify-end items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePro(user.uid, !user.isPaid);
                          }}
                          className="bg-yellow-500/10 hover:bg-yellow-600 text-yellow-400 hover:text-white px-2 py-1 rounded text-[10px] font-bold border border-yellow-500/20 transition-all"
                        >
                          {user.isPaid ? "Revoke Pro" : "Grant Pro"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleVerification(user.uid, !user.isVerified);
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                            user.isVerified
                              ? "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-600 hover:text-white"
                              : "bg-white/5 border-white/10 text-gray-400 hover:bg-white hover:text-black"
                          }`}
                        >
                          {user.isVerified ? "Verified" : "Verify"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleBan(user.uid, !user.isBanned);
                          }}
                          className="bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white px-2 py-1 rounded text-[10px] font-bold border border-red-500/20 transition-all"
                        >
                          {user.isBanned ? "Unban" : "Ban"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    No matching users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-gray-500 font-bold uppercase">Rows:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-dark-900 border border-white/10 rounded-lg px-2 py-1 text-xs cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-[10px] text-gray-500 font-bold uppercase">
                Showing {(currentPage - 1) * rowsPerPage + 1}-{Math.min(currentPage * rowsPerPage, totalUsers)} of{" "}
                {totalUsers}
              </span>
            </div>

            <div className="flex gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs disabled:opacity-30"
              >
                ◀
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold ${
                    currentPage === i + 1 ? "bg-indigo-600 text-white" : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs disabled:opacity-30"
              >
                ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Global Downloads Feed */}
      <div className="glass-card p-6 rounded-2xl space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">Live Download Intelligence</h3>
          <p className="text-xs text-gray-400 mt-0.5">Real-time feed of the last 50 customer downloads across the site</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Customer Email</th>
                <th className="pb-3">Asset Downloaded</th>
                <th className="pb-3">Version</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {globalDownloads.length > 0 ? (
                globalDownloads.map((dl) => (
                  <tr key={dl.id} className="hover:bg-white/2 transition-colors">
                    <td className="py-4 font-mono text-gray-500">
                      {new Date(dl.timestamp).toLocaleString()}
                    </td>
                    <td className="py-4 text-white font-semibold">
                      {dl.email || "Anonymous"}
                    </td>
                    <td className="py-4 text-indigo-400 font-bold">
                      {dl.resourceTitle || "Unknown Asset"}
                    </td>
                    <td className="py-4">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-white/5 border border-white/10 text-gray-300 uppercase">
                        {dl.versionName || "Latest"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-500">
                    No recent downloads found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details / Audit Modal */}
      {modalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto p-4 py-8 bg-black/80 backdrop-blur-sm">
          <div className="glass-card rounded-3xl w-full max-w-4xl p-6 md:p-8 relative space-y-8 mt-12">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-lg p-2"
            >
              ✕
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-4 border-b border-white/5 pb-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xl uppercase shadow-lg shadow-indigo-600/5">
                {(selectedUser.userName || selectedUser.name || "?")[0]}
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">{selectedUser.userName || selectedUser.name || "Anonymous User"}</h3>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-gray-400 text-xs">{selectedUser.email}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[8px] font-bold border uppercase ${
                      selectedUser.role === "admin"
                        ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                        : selectedUser.role === "creator"
                        ? "bg-green-500/10 border-green-500/20 text-green-400"
                        : selectedUser.isPaid
                        ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                        : "bg-gray-500/10 border-gray-500/20 text-gray-400"
                    }`}
                  >
                    {selectedUser.role === "admin"
                      ? "Admin"
                      : selectedUser.role === "creator"
                      ? "Creator"
                      : selectedUser.isPaid
                      ? "Pro Lifetime"
                      : "Free Guest"}
                  </span>
                </div>
              </div>
            </div>

            {loadingModalData ? (
              <div className="py-20 text-center text-gray-500">
                <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-xs font-semibold">Syncing user history data...</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Stats row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-dark-900 border border-white/5 p-4 rounded-xl">
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Spent</div>
                    <div className="text-lg font-black text-emerald-400 mt-1">₹{userSpent.toFixed(2)}</div>
                  </div>
                  <div className="bg-dark-900 border border-white/5 p-4 rounded-xl">
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Items Purchased</div>
                    <div className="text-lg font-black text-indigo-400 mt-1">{userPurchases.length} Items</div>
                  </div>
                  <div className="bg-dark-900 border border-white/5 p-4 rounded-xl">
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Joined Date</div>
                    <div className="text-lg font-black text-white mt-1 text-sm">
                      {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : "N/A"}
                    </div>
                  </div>
                </div>

                {/* Purchase ledger */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    🛒 Purchase Ledger History
                  </h4>
                  <div className="bg-dark-900 border border-white/5 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-white/2 text-gray-500 uppercase font-bold text-[9px]">
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Asset Name</th>
                          <th className="px-4 py-3">Paid Amount</th>
                          <th className="px-4 py-3">Payment ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {userPurchases.length > 0 ? (
                          userPurchases.map((tx) => (
                            <tr key={tx.id} className="hover:bg-white/2">
                              <td className="px-4 py-3 text-gray-500 font-mono">
                                {tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : "N/A"}
                              </td>
                              <td className="px-4 py-3 text-white font-semibold">{tx.itemTitle}</td>
                              <td className="px-4 py-3 text-emerald-400 font-bold">
                                {tx.currency || "₹"}
                                {(Number(tx.amount) || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-gray-600 font-mono">{tx.paymentId || "N/A"}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-500 italic">
                              No purchase records.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Download Intelligence */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    📥 Download Intelligence ({userDownloads.length})
                  </h4>
                  <div className="bg-dark-900 border border-white/5 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-white/2 text-gray-500 uppercase font-bold text-[9px]">
                          <th className="px-4 py-3">Time</th>
                          <th className="px-4 py-3">Resource File</th>
                          <th className="px-4 py-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {userDownloads.length > 0 ? (
                          userDownloads.map((dl, idx) => (
                            <tr key={idx} className="hover:bg-white/2">
                              <td className="px-4 py-3 text-gray-500 font-mono">
                                {new Date(dl.timestamp).toLocaleString()}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-white font-semibold">{dl.resourceTitle}</span>
                                <span className="ml-2 px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] rounded font-bold uppercase">
                                  {dl.versionName || "Latest"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-emerald-400 font-bold">SUCCESS</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-gray-500 italic">
                              No downloads recorded.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Submitted Reviews */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    ★ Submitted Reviews & Feedback ({userRatings.length})
                  </h4>
                  <div className="bg-dark-900 border border-white/5 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-white/2 text-gray-500 uppercase font-bold text-[9px]">
                          <th className="px-4 py-3">Resource</th>
                          <th className="px-4 py-3 text-center">Rating</th>
                          <th className="px-4 py-3">Feedback comment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {userRatings.length > 0 ? (
                          userRatings.map((r, idx) => (
                            <tr key={idx} className="hover:bg-white/2">
                              <td className="px-4 py-3 font-semibold text-white">
                                {r.resourceTitle} <span className="text-[10px] text-gray-500 font-normal">({r.version})</span>
                              </td>
                              <td className="px-4 py-3 text-center text-yellow-500">
                                {r.rating} ★
                              </td>
                              <td className="px-4 py-3 text-gray-400 italic">
                                {r.feedback ? `"${r.feedback}"` : "No comment"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-gray-500 italic">
                              No reviews submitted.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Favorites Library */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    ♥ Favorites Library ({userFavorites.length})
                  </h4>
                  {userFavorites.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {userFavorites.map((fav, idx) => (
                        <div key={idx} className="bg-dark-900 border border-white/5 p-3 rounded-xl flex items-center gap-3">
                          <img
                            src={fav.ImageURL || "https://placehold.co/40"}
                            alt={fav.Title}
                            className="w-10 h-10 object-cover rounded bg-dark-800"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs text-white truncate">{fav.Title || "Untitled"}</p>
                            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold mt-0.5 block">
                              {fav.Type || "Asset"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-xs bg-dark-900 border border-white/5 border-dashed rounded-xl">
                      No favorites library saved.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-white/5">
              <span className="text-[10px] text-gray-600 font-mono select-all">UID: {selectedUser.uid}</span>
              <div className="flex gap-3">
                <button
                  onClick={() => handleToggleBan(selectedUser.uid, !selectedUser.isBanned)}
                  className="px-5 py-2.5 bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl text-xs font-bold border border-red-500/20 transition-all active:scale-95"
                >
                  {selectedUser.isBanned ? "Unban Account" : "Ban Account"}
                </button>
                <button
                  onClick={() => handleTogglePro(selectedUser.uid, !selectedUser.isPaid)}
                  className="px-5 py-2.5 bg-yellow-500/10 hover:bg-yellow-600 text-yellow-500 hover:text-white rounded-xl text-xs font-bold border border-yellow-500/20 transition-all active:scale-95"
                >
                  {selectedUser.isPaid ? "Revoke Pro access" : "Grant Lifetime Pro"}
                </button>
                <button
                  onClick={() => handleToggleCreator(selectedUser.uid, selectedUser.role !== "creator")}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                    selectedUser.role === "creator"
                      ? "bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-600 hover:text-white"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-600 hover:text-white"
                  }`}
                >
                  {selectedUser.role === "creator" ? "Revoke Creator" : "Grant Creator"}
                </button>
                <button
                  onClick={() => handleDeleteUser(selectedUser.uid)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-red-600 text-gray-300 hover:text-white rounded-xl text-xs font-bold border border-white/10 transition-all active:scale-95"
                >
                  Remove User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifier */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className={`px-4 py-3 rounded-xl text-xs font-bold shadow-lg animate-fade-in flex items-center gap-3 border pointer-events-auto ${
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
