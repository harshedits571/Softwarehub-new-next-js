import { NextRequest, NextResponse } from "next/server";
import { adminFirestore } from "@/utils/firebase-admin";
import { firestore } from "@/utils/firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, serverTimestamp } from "firebase/firestore";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, licenseKey, machineId, machineName } = body;

    if (!email && !licenseKey) {
      return NextResponse.json(
        { success: false, valid: false, status: "missing_credentials", error: "Email or license key required." },
        { status: 400, headers: corsHeaders }
      );
    }

    const cleanEmail = email ? String(email).trim().toLowerCase() : "";
    const cleanKey = licenseKey ? String(licenseKey).trim().toUpperCase() : "";

    let licenseData: any = null;
    let licenseDocId: string = "";

    // 1. Search by Key in 'licenses' collection
    if (cleanKey && cleanKey !== "ACCOUNT_BOUND" && !cleanKey.startsWith("ACCOUNT_")) {
      if (adminFirestore) {
        try {
          const snap = await adminFirestore.collection("licenses").doc(cleanKey).get();
          if (snap.exists) {
            licenseData = snap.data();
            licenseDocId = snap.id;
          }
        } catch (e) {}
      }
      if (!licenseData) {
        try {
          const snap = await getDoc(doc(firestore, "licenses", cleanKey));
          if (snap.exists()) {
            licenseData = snap.data();
            licenseDocId = snap.id;
          }
        } catch (e) {}
      }
    }

    // 2. Search by Email in 'licenses' collection
    if (!licenseData && cleanEmail) {
      if (adminFirestore) {
        try {
          const qSnap = await adminFirestore.collection("licenses").where("customerEmail", "==", cleanEmail).limit(1).get();
          if (!qSnap.empty) {
            licenseData = qSnap.docs[0].data();
            licenseDocId = qSnap.docs[0].id;
          }
        } catch (e) {}
      }
      if (!licenseData) {
        try {
          const q = query(collection(firestore, "licenses"), where("customerEmail", "==", cleanEmail));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            licenseData = qSnap.docs[0].data();
            licenseDocId = qSnap.docs[0].id;
          }
        } catch (e) {}
      }
    }

    // 3. Fallback: Search in 'users' collection (personalCloud field)
    if (!licenseData && cleanEmail) {
      if (adminFirestore) {
        try {
          const uSnap = await adminFirestore.collection("users").where("email", "==", cleanEmail).limit(1).get();
          if (!uSnap.empty) {
            const uData = uSnap.docs[0].data();
            if (uData.personalCloud && uData.personalCloud.plan) {
              licenseData = {
                key: uData.personalCloud.licenseKey || `PCLOUD-ACC-${cleanEmail.slice(0, 6).toUpperCase()}`,
                customerEmail: cleanEmail,
                plan: uData.personalCloud.plan || "pro",
                status: uData.personalCloud.status || "active",
                maxMachines: uData.personalCloud.maxMachines || 3,
              };
              licenseDocId = licenseData.key;
            }
          }
        } catch (e) {}
      }
    }

    // If no record exists at all in Firestore, license has been DELETED / REVOKED
    if (!licenseData) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          status: "revoked",
          error: "No active license found for this account. License has been removed or revoked.",
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // Check status flags
    const status = (licenseData.status || "active").toLowerCase();
    if (status === "suspended" || status === "inactive") {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          status: "suspended",
          error: "Your Personal Cloud license has been suspended by the administrator.",
        },
        { status: 200, headers: corsHeaders }
      );
    }

    if (status === "revoked" || status === "banned" || status === "blocked") {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          status: "banned",
          error: "This account / license has been revoked or banned.",
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // Check expiration / 30-day trial
    if (licenseData.isTrial || licenseData.plan === "trial") {
      const trialEnd = licenseData.trialEndDate ? new Date(licenseData.trialEndDate).getTime() : 0;
      if (trialEnd && Date.now() > trialEnd) {
        return NextResponse.json(
          {
            success: false,
            valid: false,
            status: "expired",
            isTrialExpired: true,
            error: "Your 30-day free trial has expired. Please upgrade to Personal Cloud Pro on SoftwareHubs.in.",
          },
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // If custom expiry date exists
    if (licenseData.expiryDate && licenseData.expiryDate !== "lifetime" && licenseData.expiryDate !== "Lifetime") {
      let expTime = 0;
      if (licenseData.expiryDate.toDate) expTime = licenseData.expiryDate.toDate().getTime();
      else if (licenseData.expiryDate.seconds) expTime = licenseData.expiryDate.seconds * 1000;
      else expTime = new Date(licenseData.expiryDate).getTime();

      if (expTime && Date.now() > expTime) {
        return NextResponse.json(
          {
            success: false,
            valid: false,
            status: "expired",
            error: "Your Personal Cloud license has expired.",
          },
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // Update lastActiveAt timestamp in background
    if (licenseDocId) {
      try {
        if (adminFirestore) {
          adminFirestore.collection("licenses").doc(licenseDocId).update({ lastActiveAt: new Date() }).catch(() => {});
        } else {
          updateDoc(doc(firestore, "licenses", licenseDocId), { lastActiveAt: serverTimestamp() }).catch(() => {});
        }
      } catch (e) {}
    }

    return NextResponse.json(
      {
        success: true,
        valid: true,
        status: "active",
        plan: licenseData.plan || "pro",
        customerEmail: licenseData.customerEmail || cleanEmail,
        customerName: licenseData.customerName || "SoftwareHubs Customer",
        licenseKey: licenseData.key || licenseData.licenseKey || cleanKey || "PRO-VERIFIED",
        maxMachines: licenseData.maxMachines || 3,
        isTrial: Boolean(licenseData.isTrial || licenseData.plan === "trial"),
        trialEndDate: licenseData.trialEndDate || null,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("License verification error:", error);
    return NextResponse.json(
      { success: false, valid: false, status: "error", error: error.message || "Failed to verify license." },
      { status: 500, headers: corsHeaders }
    );
  }
}
