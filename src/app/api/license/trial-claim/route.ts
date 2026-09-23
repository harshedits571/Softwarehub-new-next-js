import { NextRequest, NextResponse } from "next/server";
import { adminFirestore } from "@/utils/firebase-admin";
import { firestore } from "@/utils/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  try {
    const body = await req.json();
    const { name, email, password, phone, uid } = body;

    if (!email || !password || password.length < 6 || !uid) {
      return NextResponse.json(
        { success: false, error: "Email, password (min 6 chars), and user ID are required." },
        { status: 400, headers: corsHeaders }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = (name || "Customer").trim();
    const cleanPhone = (phone || "").trim();

    let userDoc: any = null;

    // Check if user has already claimed trial or purchased
    if (adminFirestore) {
      try {
        const uSnap = await adminFirestore.collection("users").doc(uid).get();
        if (uSnap.exists) {
          userDoc = uSnap.data();
        }
      } catch (e) {}
    }

    if (!userDoc) {
      try {
        const uSnap = await getDoc(doc(firestore, "users", uid));
        if (uSnap.exists()) {
          userDoc = uSnap.data();
        }
      } catch (e) {}
    }

    if (userDoc) {
      if (userDoc.personalCloud?.plan && userDoc.personalCloud?.plan !== "trial" && userDoc.personalCloud?.activated) {
        return NextResponse.json(
          { success: false, error: "You already have active Pro access on this account!" },
          { status: 400, headers: corsHeaders }
        );
      }

      if (userDoc.trialClaimed || userDoc.personalCloud?.trialClaimed) {
        return NextResponse.json(
          {
            success: false,
            error: "You have already claimed your 30-day free trial on this account. Please upgrade to Personal Cloud Pro Lifetime License.",
            alreadyClaimed: true,
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    const now = new Date();
    const trialStartDate = now.toISOString();
    const trialEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const licenseKey = `PCLOUD-TRIAL-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // 1. Create trial license document
    const licensePayload = {
      id: licenseKey,
      key: licenseKey,
      customerName: cleanName,
      customerEmail: cleanEmail,
      plan: "trial",
      status: "active",
      isTrial: true,
      trialDays: 30,
      trialStartDate,
      trialEndDate,
      maxMachines: 1,
      activatedMachines: 0,
      devices: [],
      appPassword: password,
      phone: cleanPhone,
      claimed: true,
      claimedAt: trialStartDate,
      claimedByUid: uid,
      createdAt: trialStartDate,
    };

    if (adminFirestore) {
      await adminFirestore.collection("licenses").doc(licenseKey).set(licensePayload);
    } else {
      try {
        await setDoc(doc(firestore, "licenses", licenseKey), licensePayload);
      } catch (e) {
        console.warn("Server-side fallback license write skipped:", e);
      }
    }

    // 2. Update user profile
    const userUpdate = {
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      appPassword: password,
      trialClaimed: true,
      personalCloud: {
        activated: true,
        isTrial: true,
        plan: "trial",
        trialClaimed: true,
        trialStartDate,
        trialEndDate,
        licenseKey: licenseKey,
        maxMachines: 1,
        appPassword: password,
        activatedAt: trialStartDate,
      },
      updatedAt: trialStartDate,
    };

    if (adminFirestore) {
      await adminFirestore.collection("users").doc(uid).set(userUpdate, { merge: true });
    } else {
      try {
        await setDoc(doc(firestore, "users", uid), userUpdate, { merge: true });
      } catch (e) {
        console.warn("Server-side fallback user write skipped (handled on client):", e);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "30-Day Free Trial activated successfully!",
        licenseKey,
        plan: "trial",
        isTrial: true,
        trialStartDate,
        trialEndDate,
        appPassword: password,
        downloadUrl: "/downloads/PersonalCloud-Pro-Setup.exe",
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("trial-claim error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to activate 30-day free trial." },
      { status: 500, headers: corsHeaders }
    );
  }
}
