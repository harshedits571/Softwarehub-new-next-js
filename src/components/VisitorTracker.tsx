"use client";

import { useEffect } from "react";
import { ref, increment, update } from "firebase/database";
import { db } from "../utils/firebase";

export default function VisitorTracker() {
  useEffect(() => {
    // Only run on the client side
    if (typeof window === "undefined") return;

    // Check if we already logged this session to avoid double counting on re-renders
    if (sessionStorage.getItem("shub_session_logged")) {
      return;
    }

    const logVisit = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const isNewVisitor = !localStorage.getItem("shub_returning_visitor");
        
        // Determine device
        let device = "desktop";
        if (/Mobi|Android/i.test(navigator.userAgent)) {
          device = "mobile";
        } else if (/Tablet|iPad/i.test(navigator.userAgent)) {
          device = "tablet";
        }

        // Extremely basic region detection via timezone
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        let region = "Unknown";
        if (tz) {
          region = tz.split("/")[0]; // e.g., "America", "Europe", "Asia"
        }

        const updates: any = {};
        
        // Always increment page views
        updates["analytics/totalPageViews"] = increment(1);
        updates[`analytics/daily/${today}/pageViews`] = increment(1);
        updates[`analytics/byDevice/${device}`] = increment(1);
        updates[`analytics/byRegion/${region}`] = increment(1);

        // Increment unique visitors if they haven't visited before
        if (isNewVisitor) {
          updates["analytics/uniqueVisitors"] = increment(1);
          updates[`analytics/daily/${today}/uniqueVisitors`] = increment(1);
          localStorage.setItem("shub_returning_visitor", "true");
        }

        await update(ref(db), updates);
        sessionStorage.setItem("shub_session_logged", "true");
      } catch (err) {
        console.error("Failed to log visit:", err);
      }
    };

    // Delay slightly to not block initial render
    setTimeout(() => {
      logVisit();
    }, 2000);

  }, []);

  return null; // This component doesn't render anything
}
