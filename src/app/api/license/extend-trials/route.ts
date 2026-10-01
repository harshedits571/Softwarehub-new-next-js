import { NextResponse } from "next/server";
import { adminFirestore } from "@/utils/firebase-admin";
import { firestore as clientDb } from "@/utils/firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const daysToAdd = Number(body.daysToAdd) || 30;
    const applyTo = body.applyTo || "all_trials"; // "all_trials" | "active_only" | "expired_only"

    if (daysToAdd <= 0 || isNaN(daysToAdd)) {
      return NextResponse.json(
        { success: false, error: "Invalid daysToAdd value. Must be greater than 0." },
        { status: 400, headers: corsHeaders }
      );
    }

    const now = Date.now();
    const msToAdd = daysToAdd * 24 * 60 * 60 * 1000;
    let updatedCount = 0;

    if (adminFirestore) {
      // 1. Fetch all trial licenses from licenses collection
      const snapTrial = await adminFirestore.collection("licenses").where("plan", "==", "trial").get();
      const snapIsTrial = await adminFirestore.collection("licenses").where("isTrial", "==", true).get();

      // Combine unique documents
      const docsMap = new Map<string, any>();
      snapTrial.docs.forEach((d: any) => docsMap.set(d.id, d));
      snapIsTrial.docs.forEach((d: any) => docsMap.set(d.id, d));

      for (const [docId, docSnap] of docsMap.entries()) {
        const data = docSnap.data();
        let currentEnd = 0;

        if (data.trialEndDate) {
          if (data.trialEndDate.toDate) currentEnd = data.trialEndDate.toDate().getTime();
          else if (data.trialEndDate.seconds) currentEnd = data.trialEndDate.seconds * 1000;
          else currentEnd = new Date(data.trialEndDate).getTime();
        }

        const isCurrentlyExpired = Boolean(!currentEnd || isNaN(currentEnd) || currentEnd < now);

        if (applyTo === "active_only" && isCurrentlyExpired) continue;
        if (applyTo === "expired_only" && !isCurrentlyExpired) continue;

        // If currently active, add to remaining time. If expired, give fresh days from now.
        const baseTime = (!isCurrentlyExpired && currentEnd > now) ? currentEnd : now;
        const newTrialEnd = new Date(baseTime + msToAdd).toISOString();

        // Update license document
        await docSnap.ref.update({
          trialEndDate: newTrialEnd,
          isTrial: true,
          plan: "trial",
          status: "active",
          updatedAt: new Date().toISOString(),
        });

        // Also update corresponding user profile
        const email = (data.customerEmail || "").trim().toLowerCase();
        if (email) {
          const userSnap = await adminFirestore.collection("users").where("email", "==", email).get();
          for (const uDoc of userSnap.docs) {
            const uData = uDoc.data();
            await uDoc.ref.update({
              trialClaimed: true,
              trialEndDate: newTrialEnd,
              "personalCloud.trialEndDate": newTrialEnd,
              "personalCloud.isTrial": true,
              "personalCloud.plan": "trial",
              "personalCloud.status": "active",
              "personalCloud.activated": true,
            });
          }
        }

        updatedCount++;
      }
    } else {
      // Fallback with client Firestore SDK
      const qTrial = query(collection(clientDb, "licenses"), where("plan", "==", "trial"));
      const snapTrial = await getDocs(qTrial);

      for (const d of snapTrial.docs) {
        const data = d.data();
        let currentEnd = 0;
        if (data.trialEndDate) {
          if (data.trialEndDate.toDate) currentEnd = data.trialEndDate.toDate().getTime();
          else if (data.trialEndDate.seconds) currentEnd = data.trialEndDate.seconds * 1000;
          else currentEnd = new Date(data.trialEndDate).getTime();
        }

        const isCurrentlyExpired = Boolean(!currentEnd || isNaN(currentEnd) || currentEnd < now);
        if (applyTo === "active_only" && isCurrentlyExpired) continue;
        if (applyTo === "expired_only" && !isCurrentlyExpired) continue;

        const baseTime = (!isCurrentlyExpired && currentEnd > now) ? currentEnd : now;
        const newTrialEnd = new Date(baseTime + msToAdd).toISOString();

        await updateDoc(d.ref, {
          trialEndDate: newTrialEnd,
          isTrial: true,
          plan: "trial",
          status: "active",
          updatedAt: new Date().toISOString(),
        });

        const email = (data.customerEmail || "").trim().toLowerCase();
        if (email) {
          const qUsers = query(collection(clientDb, "users"), where("email", "==", email));
          const snapUsers = await getDocs(qUsers);
          for (const u of snapUsers.docs) {
            const uData = u.data();
            await updateDoc(u.ref, {
              trialClaimed: true,
              trialEndDate: newTrialEnd,
              personalCloud: {
                ...(uData.personalCloud || {}),
                trialEndDate: newTrialEnd,
                isTrial: true,
                plan: "trial",
                status: "active",
                activated: true,
              },
            });
          }
        }

        updatedCount++;
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully extended trial for ${updatedCount} user(s) by ${daysToAdd} days.`,
        updatedCount,
        daysAdded: daysToAdd,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("Bulk trial extension error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to extend trials" },
      { status: 500, headers: corsHeaders }
    );
  }
}
