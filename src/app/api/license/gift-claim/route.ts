import { NextRequest, NextResponse } from "next/server";
import { adminFirestore } from "@/utils/firebase-admin";
import { firestore } from "@/utils/firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, email, name, password, phone, uid } = body;

    if (!key || !email || !password || password.length < 6 || !uid) {
      return NextResponse.json(
        { success: false, error: "Missing required fields or password too short (min 6 characters)." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanKey = String(key).trim().toUpperCase();

    let licenseData: any = null;

    // Fetch license
    if (adminFirestore) {
      try {
        const snap = await adminFirestore.collection("licenses").doc(cleanKey).get();
        if (snap.exists) {
          licenseData = snap.data();
        }
      } catch (err) {}
    }

    if (!licenseData) {
      try {
        const snap = await getDoc(doc(firestore, "licenses", cleanKey));
        if (snap.exists()) {
          licenseData = snap.data();
        }
      } catch (err) {}
    }

    if (!licenseData) {
      return NextResponse.json({ success: false, error: "Invalid license grant key." }, { status: 404 });
    }

    if (String(licenseData.customerEmail).toLowerCase() !== cleanEmail) {
      return NextResponse.json(
        { success: false, error: "This complimentary grant belongs to a different email address." },
        { status: 403 }
      );
    }

    // STRICT CHECK: Verify that grant is unclaimed so it can NEVER be claimed multiple times
    if (licenseData.claimStatus !== "unclaimed" || licenseData.claimed === true) {
      return NextResponse.json(
        { success: false, error: "This complimentary license has already been claimed." },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const cleanName = (name || licenseData.customerName || "Customer").trim();
    const cleanPhone = (phone || "").trim();

    // 1. Update License to claimed and active
    const updatePayload = {
      claimStatus: "claimed",
      claimed: true,
      status: "active",
      claimedAt: nowIso,
      claimedByUid: uid,
      customerName: cleanName,
      customerEmail: cleanEmail,
      appPassword: password,
      phone: cleanPhone,
    };

    if (adminFirestore) {
      await adminFirestore.collection("licenses").doc(cleanKey).update(updatePayload);
    } else {
      await updateDoc(doc(firestore, "licenses", cleanKey), updatePayload);
    }

    // 2. Update User Profile in users/{uid}
    const userUpdate = {
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      appPassword: password,
      personalCloud: {
        activated: true,
        licenseKey: cleanKey,
        plan: licenseData.plan || "pro",
        maxMachines: licenseData.maxMachines || 3,
        appPassword: password,
        claimedAt: nowIso,
        isGift: true,
      },
      updatedAt: nowIso,
    };

    if (adminFirestore) {
      await adminFirestore.collection("users").doc(uid).set(userUpdate, { merge: true });
    } else {
      await setDoc(doc(firestore, "users", uid), userUpdate, { merge: true });
    }

    return NextResponse.json({
      success: true,
      licenseKey: cleanKey,
      plan: licenseData.plan || "pro",
      appPassword: password,
    });
  } catch (error: any) {
    console.error("gift-claim error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
