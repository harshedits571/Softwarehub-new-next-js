"use client";

import React, { useState, useEffect } from "react";
import { collection, query, getDocs, doc, setDoc } from "firebase/firestore";
import { firestore } from "../../../utils/firebase";

export default function SubAdminManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    adobeSoftware: false,
    plugins: false,
    scripts: false,
    assets: false,
    utilities: false,
    simplePluginsList: false,
    courses: false,
    banners: false,
    brokenLinkReports: false,
    userMessages: false
  });

  const [toasts, setToasts] = useState<{ id: string; msg: string; type: "success" | "error" | "info" }[]>([]);
  const showToast = (msg: string, type: "success" | "error" | "info" = "info") => {
    const toastId = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id: toastId, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 4000);
  };

  const loadSubAdmins = async () => {
    setLoading(true);
    try {
      // Load all users to allow searching and granting access to normal users
      const q = query(collection(firestore, "users"));
      const querySnapshot = await getDocs(q);
      const loadedUsers: any[] = [];
      querySnapshot.forEach((doc) => {
        loadedUsers.push({ id: doc.id, ...doc.data() });
      });
      setUsers(loadedUsers);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubAdmins();
  }, []);

  const handleTogglePermission = (key: string) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editUserId) {
        // Update existing user to be a sub-admin with selected permissions
        await setDoc(doc(firestore, "users", editUserId), {
          role: "sub-admin",
          permissions
        }, { merge: true });
        showToast("Permissions updated successfully", "success");
      } else {
        // Create new user through the API
        const response = await fetch("/api/admin/create-subadmin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, permissions }),
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to create user");
        showToast("Sub-admin created successfully", "success");
      }

      // Reset form
      setEditUserId(null);
      setName("");
      setEmail("");
      setPassword("");
      setPermissions(Object.keys(permissions).reduce((acc, key) => ({ ...acc, [key]: false }), {}));
      
      loadSubAdmins();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user: any) => {
    setEditUserId(user.id);
    setName(user.name || "");
    setEmail(user.email || "");
    setPassword("");
    setPermissions({
      adobeSoftware: user.permissions?.adobeSoftware || false,
      plugins: user.permissions?.plugins || false,
      scripts: user.permissions?.scripts || false,
      assets: user.permissions?.assets || false,
      utilities: user.permissions?.utilities || false,
      simplePluginsList: user.permissions?.simplePluginsList || false,
      courses: user.permissions?.courses || false,
      banners: user.permissions?.banners || false,
      brokenLinkReports: user.permissions?.brokenLinkReports || false,
      userMessages: user.permissions?.userMessages || false,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditUserId(null);
    setName("");
    setEmail("");
    setPassword("");
    setPermissions(Object.keys(permissions).reduce((acc, key) => ({ ...acc, [key]: false }), {}));
  };

  const handleRevokeAccess = async (userId: string) => {
    if (!window.confirm("Are you sure you want to revoke sub-admin access? They will become a normal user.")) return;
    try {
      await setDoc(doc(firestore, "users", userId), { role: "user", permissions: {} }, { merge: true });
      showToast("Access revoked successfully", "success");
      loadSubAdmins();
    } catch (err: any) {
      showToast("Failed to revoke access: " + err.message, "error");
    }
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mt-8 pt-8 border-t border-gray-700">
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>
        ))}
      </div>

      <h3 className="text-2xl font-bold text-white mb-6">User Management (Sub-Admins)</h3>

      {/* Add/Edit User Form */}
      <div className="glass-card p-8 mb-8 border border-indigo-500/20 relative">
        {editUserId && (
          <button 
            type="button" 
            onClick={handleCancelEdit}
            className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg p-2 transition-colors flex items-center gap-2 text-sm font-semibold"
          >
            Cancel Edit
          </button>
        )}
        
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg">
            {editUserId ? '✏️' : '👤'}
          </div>
          <div>
            <h4 className="text-2xl font-bold text-white">
              {editUserId ? "Edit User Access" : "Add New Sub-Admin"}
            </h4>
            <p className="text-sm text-gray-400">
              {editUserId ? `Modifying permissions for ${email}` : "Create a new sub-admin account with custom permissions"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-indigo-300 uppercase tracking-wider">Basic Information</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!!editUserId}
                  className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none premium-transition disabled:opacity-50" 
                />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!!editUserId}
                  className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none premium-transition disabled:opacity-50" 
                />
              </div>
            </div>
            {!editUserId && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <input 
                  type="text" 
                  placeholder="Password" 
                  required={!editUserId} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none premium-transition" 
                />
              </div>
            )}
          </div>

          {/* Permissions */}
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-indigo-300 uppercase tracking-wider">Access Permissions</label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { id: "adobeSoftware", icon: "🎨", label: "Adobe Software", color: "purple" },
                { id: "plugins", icon: "🔌", label: "Plugins", color: "blue" },
                { id: "scripts", icon: "📜", label: "Scripts & Extensions", color: "green" },
                { id: "assets", icon: "📦", label: "Assets", color: "orange" },
                { id: "utilities", icon: "🛠️", label: "Utilities", color: "indigo" },
                { id: "simplePluginsList", icon: "📋", label: "100+ Plugins List", color: "teal" },
                { id: "courses", icon: "🎓", label: "Courses", color: "emerald" },
                { id: "banners", icon: "🎨", label: "Banners", color: "purple" },
                { id: "brokenLinkReports", icon: "🔗", label: "Broken Link Reports", color: "red" },
                { id: "userMessages", icon: "💬", label: "User Messages", color: "rose" }
              ].map(perm => (
                <label key={perm.id} className={`group relative flex items-center gap-3 p-4 bg-gray-800/30 hover:bg-gray-800/60 border border-gray-700/50 hover:border-${perm.color}-500/50 rounded-xl cursor-pointer premium-transition duration-200`}>
                  <input 
                    type="checkbox" 
                    checked={permissions[perm.id]} 
                    onChange={() => handleTogglePermission(perm.id)} 
                    className={`w-5 h-5 rounded border-gray-600 bg-gray-700 text-${perm.color}-600 focus:ring-${perm.color}-500 focus:ring-offset-0 premium-transition`} 
                  />
                  <span className="text-2xl">{perm.icon}</span>
                  <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">{perm.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" disabled={saving} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 rounded-xl premium-transition duration-200 shadow-lg hover:shadow-indigo-500/50 transform hover:scale-[1.02]">
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={editUserId ? "M5 13l4 4L19 7" : "M12 4v16m8-8H4"} />
              </svg>
              {saving ? "Processing..." : editUserId ? "Update Permissions" : "Create Sub-Admin"}
            </span>
          </button>
        </form>
      </div>

      {/* Sub-Admin List Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full max-w-md">
          <input 
            type="text" 
            placeholder="Search all users by name or email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-900/50 border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 outline-none premium-transition" 
          />
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>
        <div className="text-sm text-gray-400">
          Total Users: <span className="text-indigo-400 font-bold">{filteredUsers.length}</span>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-800/50 text-gray-400 text-sm uppercase">
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Access</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">Loading users...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">No users found.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isSubAdmin = user.role === 'sub-admin';
                  const isAdmin = user.role === 'admin';
                  const isNormalUser = !isSubAdmin && !isAdmin;

                  return (
                    <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-white">{user.name || 'N/A'}</div>
                      </td>
                      <td className="p-4 text-gray-400">{user.email}</td>
                      <td className="p-4">
                        {isAdmin ? (
                          <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-xs font-bold uppercase">Root Admin</span>
                        ) : isSubAdmin ? (
                          <div className="flex flex-wrap gap-1">
                            {user.permissions && Object.entries(user.permissions).filter(([k,v]) => v).length > 0 ? (
                              Object.entries(user.permissions).filter(([k,v]) => v).map(([k,v]) => (
                                <span key={k} className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded text-xs border border-indigo-500/20">{k}</span>
                              ))
                            ) : (
                              <span className="text-gray-500 text-xs">No specific permissions</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-xs">User (No Access)</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="bg-green-500/10 text-green-400 px-2 py-1 rounded text-xs font-bold">Active</span>
                      </td>
                      <td className="p-4 text-right">
                        {!isAdmin && (
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleEdit(user)} 
                              className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border border-blue-500/20"
                            >
                              {isSubAdmin ? "Edit" : "Grant Access"}
                            </button>
                            {isSubAdmin && (
                              <button 
                                onClick={() => handleRevokeAccess(user.id)} 
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border border-red-500/20"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Sub-Admin Pagination Controls */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-800/50 pt-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Show</span>
            <select className="bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-xs text-gray-300 outline-none focus:border-indigo-500 transition-colors cursor-pointer">
              <option value="10">10 Rows</option>
              <option value="20">20 Rows</option>
              <option value="50">50 Rows</option>
              <option value="100">100 Rows</option>
            </select>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Showing {filteredUsers.length} Users</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Pagination buttons will be injected here */}
        </div>
      </div>
    </div>
  );
}
