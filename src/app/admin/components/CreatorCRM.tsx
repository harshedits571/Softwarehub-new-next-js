"use client";

import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { firestore } from "../../../utils/firebase";

export default function CreatorCRM() {
  const [creators, setCreators] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [allDownloads, setAllDownloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States for Drill-down selections
  const [selectedCreator, setSelectedCreator] = useState<any | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // Setup real-time listeners for creators, products, and transactions
  useEffect(() => {
    setLoading(true);

    // 1. Listen to creators
    const creatorsQuery = query(collection(firestore, "users"), where("role", "==", "creator"));
    const unsubCreators = onSnapshot(creatorsQuery, (snap) => {
      const cList: any[] = [];
      snap.forEach(d => cList.push({ uid: d.id, ...d.data() }));
      setCreators(cList);
    }, (err) => console.error("Creators listener error:", err));

    // 2. Listen to all products
    const unsubProducts = onSnapshot(collection(firestore, "products"), (snap) => {
      const pList: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        const uid = data.ownerUid || data.vendorId || data.creatorUid || data.creatorId;
        pList.push({ id: d.id, _resolvedOwnerId: uid, ...data });
      });
      setAllProducts(pList);
    }, (err) => console.error("Products listener error:", err));

    // 3. Listen to all transactions
    const unsubTransactions = onSnapshot(collection(firestore, "transactions"), (snap) => {
      const tList: any[] = [];
      snap.forEach(d => tList.push({ id: d.id, ...d.data() }));
      setAllTransactions(tList);
      setLoading(false);
    }, (err) => {
      console.error("Transactions listener error:", err);
      setLoading(false);
    });

    // 4. Listen to all download logs
    const unsubDownloads = onSnapshot(collection(firestore, "downloadLogs"), (snap) => {
      const dList: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        let ts = data.timestamp;
        if (ts && typeof ts.toMillis === "function") ts = ts.toMillis();
        else if (ts && typeof ts === "object" && ts.seconds) ts = ts.seconds * 1000;
        else ts = Number(ts) || Date.now();
        dList.push({ id: d.id, ...data, timestamp: ts });
      });
      setAllDownloads(dList);
    }, (err) => console.error("Downloads listener error:", err));

    return () => {
      unsubCreators();
      unsubProducts();
      unsubTransactions();
      unsubDownloads();
    };
  }, []);

  // Compute stats dynamically on every render
  const creatorsWithCounts = creators.map(c => {
    const productCount = allProducts.filter(p => p._resolvedOwnerId === c.uid).length;
    return { ...c, productCount };
  });

  const creatorProducts = selectedCreator ? allProducts
    .filter(p => p._resolvedOwnerId === selectedCreator.uid)
    .map(p => {
      const pTx = allTransactions.filter(tx => 
        tx.itemId === p.id ||
        tx.productId === p.id ||
        tx.itemTitle === p.Title || 
        (tx.title && tx.title === p.Title)
      );
      const pDls = allDownloads.filter(dl => dl.resourceId === p.id);
      const revenue = pTx.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
      return {
        ...p,
        salesCount: pTx.length,
        totalRevenue: revenue,
        orders: pTx,
        downloadsCount: pDls.length,
        downloads: pDls
      };
    }) : [];

  const productOrders: any[] = selectedProduct ? (
    creatorProducts.find(p => p.id === selectedProduct.id)?.orders || []
  ) : [];

  const productDownloads = selectedProduct ? (
    creatorProducts.find(p => p.id === selectedProduct.id)?.downloads || []
  ) : [];

  const liveCreator = selectedCreator 
    ? creatorsWithCounts.find(c => c.uid === selectedCreator.uid) || selectedCreator
    : null;

  const liveProduct = selectedProduct 
    ? creatorProducts.find(p => p.id === selectedProduct.id) || selectedProduct
    : null;

  const handleCreatorClick = (creator: any) => {
    setSelectedCreator(creator);
    setSelectedProduct(null); // Reset product selection
  };

  const handleProductClick = (product: any) => {
    setSelectedProduct(product);
  };

  if (loading && !selectedCreator) {
    return <div className="text-center py-20 text-gray-400">Loading Creators...</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-gray-500 font-bold mb-6 bg-white/5 p-4 rounded-2xl border border-white/5">
        <button onClick={() => { setSelectedCreator(null); setSelectedProduct(null); }} className="hover:text-white transition-colors">
          Creators Directory
        </button>
        {selectedCreator && (
          <>
            <span className="text-gray-600">/</span>
            <button onClick={() => setSelectedProduct(null)} className="hover:text-cyan-400 transition-colors text-cyan-500">
              {liveCreator?.username || liveCreator?.name || "Unknown"}
            </button>
          </>
        )}
        {selectedProduct && (
          <>
            <span className="text-gray-600">/</span>
            <span className="text-purple-400">{liveProduct?.Title}</span>
          </>
        )}
      </div>

      {/* LEVEL 1: ALL CREATORS */}
      {!selectedCreator && (
        <div className="bg-[#0b0b10] border border-white/10 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 bg-white/5">
            <h3 className="text-lg font-black text-white">Verified Creators</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#111118] text-gray-400 uppercase text-[10px] font-black tracking-wider">
                <tr>
                  <th className="px-6 py-4">Creator</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Products Listed</th>
                  <th className="px-6 py-4">Joined Date</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {creatorsWithCounts.map((c) => (
                  <tr key={c.uid} className="hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => handleCreatorClick(c)}>
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold uppercase border border-cyan-500/30">
                        {(c.username || c.name || "U").substring(0,2)}
                      </div>
                      <div>
                        <div className="font-bold text-white group-hover:text-cyan-400 transition-colors">{c.username || c.name || "Unnamed"}</div>
                        <div className="text-[10px] text-gray-500">{c.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {c.isCreatorApproved ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">Approved</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-black text-gray-300">{c.productCount} Items</td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "Unknown"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-cyan-500 hover:text-cyan-400 text-xs font-bold uppercase tracking-wider">
                        View CRM <i className="fa-solid fa-arrow-right ml-1"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LEVEL 2: CREATOR DETAIL & PRODUCT LIST */}
      {selectedCreator && !selectedProduct && (
        <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Creator Profile Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-[#0b0b10] border border-white/10 rounded-2xl p-6 text-center shadow-xl">
              <div className="w-24 h-24 mx-auto rounded-full bg-cyan-500/10 border-2 border-cyan-500/30 text-cyan-400 flex items-center justify-center text-3xl font-black mb-4 uppercase">
                {(liveCreator?.username || liveCreator?.name || "U").substring(0,2)}
              </div>
              <h2 className="text-xl font-black text-white">{liveCreator?.username || liveCreator?.name}</h2>
              <p className="text-xs text-gray-500 mb-6">{liveCreator?.email}</p>
              
              <div className="grid grid-cols-2 gap-2 text-left mb-6">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Total Sales</div>
                  <div className="text-lg font-black text-white">{creatorProducts.reduce((sum, p) => sum + p.salesCount, 0)}</div>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Est. Revenue</div>
                  <div className="text-lg font-black text-emerald-400">₹{creatorProducts.reduce((sum, p) => sum + p.totalRevenue, 0).toLocaleString()}</div>
                </div>
              </div>

              <a href={`mailto:${liveCreator?.email}`} className="block w-full py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl transition-colors border border-white/10">
                Contact Creator
              </a>
            </div>
          </div>

          {/* Products List (CRM Right Side) */}
          <div className="lg:col-span-3">
            <div className="bg-[#0b0b10] border border-white/10 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                <h3 className="text-lg font-black text-white">Creator Products ({creatorProducts.length})</h3>
                <span className="text-xs text-gray-500">Click a product to view its orders</span>
              </div>
              {loading ? (
                <div className="p-10 text-center text-gray-500">Loading products & orders...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-[#111118] text-gray-400 uppercase text-[10px] font-black tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Product Name</th>
                        <th className="px-6 py-4">Price</th>
                        <th className="px-6 py-4">Total Sales</th>
                        <th className="px-6 py-4">Total Downloads</th>
                        <th className="px-6 py-4">Generated Revenue</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {creatorProducts.length === 0 && (
                        <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500">No products listed by this creator yet.</td></tr>
                      )}
                      {creatorProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => handleProductClick(p)}>
                          <td className="px-6 py-4">
                            <div className="font-bold text-white group-hover:text-purple-400 transition-colors flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-white/10 overflow-hidden shrink-0">
                                {p.ImageURL ? <img src={p.ImageURL} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-white/10"></div>}
                              </div>
                              <span className="truncate max-w-[200px]">{p.Title}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-300">
                            {p.price > 0 ? `₹${p.price}` : "Free"}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              {p.salesCount} Orders
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                              {p.downloadsCount || 0} Downloads
                            </span>
                          </td>
                          <td className="px-6 py-4 font-black text-emerald-400">
                            ₹{p.totalRevenue.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="text-purple-500 hover:text-purple-400 text-xs font-bold uppercase tracking-wider">
                              View Orders <i className="fa-solid fa-arrow-right ml-1"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LEVEL 3: PRODUCT DETAILS & CUSTOMER ORDERS */}
      {selectedProduct && (
        <div className="animate-fade-in space-y-6">
          <div className="bg-gradient-to-r from-[#0b0b10] to-[#120d1c] border border-white/10 rounded-2xl p-6 shadow-xl flex items-center gap-6">
             <div className="w-32 h-20 rounded-xl bg-black overflow-hidden border border-white/10 shrink-0 shadow-lg">
                {liveProduct?.ImageURL ? <img src={liveProduct.ImageURL} className="w-full h-full object-cover" /> : null}
             </div>
             <div>
               <h2 className="text-2xl font-black text-white">{liveProduct?.Title}</h2>
               <div className="flex gap-4 mt-2 text-sm text-gray-400 font-bold">
                 <span><i className="fa-solid fa-tag mr-1 text-purple-400"></i> {liveProduct && liveProduct.price > 0 ? `₹${liveProduct.price}` : "Free"}</span>
                 <span><i className="fa-solid fa-cart-shopping mr-1 text-cyan-400"></i> {liveProduct?.salesCount || 0} Sales</span>
                 <span><i className="fa-solid fa-download mr-1 text-cyan-400"></i> {liveProduct?.downloadsCount || 0} Downloads</span>
                 <span><i className="fa-solid fa-sack-dollar mr-1 text-emerald-400"></i> ₹{(liveProduct?.totalRevenue || 0).toLocaleString()} Revenue</span>
               </div>
             </div>
          </div>

          <div className="bg-[#0b0b10] border border-white/10 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
              <h3 className="text-lg font-black text-white">Customer Orders ({productOrders.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#111118] text-gray-400 uppercase text-[10px] font-black tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Order ID / Txn</th>
                    <th className="px-6 py-4">Customer Info</th>
                    <th className="px-6 py-4">Amount Paid</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {productOrders.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">No orders found for this product yet.</td></tr>
                  )}
                  {productOrders.map((order, idx) => (
                    <tr key={order.id || idx} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-[10px] text-gray-400">
                        {order.paymentId || order.id || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{order.name || "Unknown Customer"}</div>
                        <div className="text-[10px] text-gray-500">{order.email || "No email"}</div>
                      </td>
                      <td className="px-6 py-4 font-black text-emerald-400">
                        {order.currency === "USD" ? "$" : "₹"}{order.amount}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                          order.status?.toLowerCase().includes("success") || order.status?.toLowerCase().includes("paid")
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                        }`}>
                          {order.status || "SUCCESS"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {order.timestamp ? new Date(order.timestamp).toLocaleString() : "Unknown"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-[#0b0b10] border border-white/10 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 bg-white/5 bg-white/5">
              <h3 className="text-lg font-black text-white">Product Download History ({productDownloads.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#111118] text-gray-400 uppercase text-[10px] font-black tracking-wider">
                  <tr>
                    <th className="px-6 py-4">User Email</th>
                    <th className="px-6 py-4">Version</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {productDownloads.length === 0 && (
                    <tr><td colSpan={3} className="px-6 py-10 text-center text-gray-500">No download logs found for this product yet.</td></tr>
                  )}
                  {productDownloads.map((dl: any, idx: number) => (
                    <tr key={dl.id || idx} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{dl.email || "Anonymous"}</div>
                        <div className="text-[10px] text-gray-500">UID: {dl.uid}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {dl.versionName || "Latest"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {dl.timestamp ? new Date(dl.timestamp).toLocaleString() : "Unknown"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
