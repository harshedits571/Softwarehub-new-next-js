import { NextRequest, NextResponse } from "next/server";
import { adminFirestore } from "@/utils/firebase-admin";
import { firestore } from "@/utils/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ success: false, error: "Email is required." }, { status: 400 });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    let grantData: any = null;
    let grantKey: string | null = null;

    // 1. Check with Firebase Admin Firestore
    if (adminFirestore) {
      try {
        const snap = await adminFirestore
          .collection("licenses")
          .where("customerEmail", "==", cleanEmail)
          .where("claimStatus", "==", "unclaimed")
          .limit(1)
          .get();

        if (!snap.empty) {
          grantData = snap.docs[0].data();
          grantKey = snap.docs[0].id;
        }
      } catch (err) {
        console.warn("gift-check adminFirestore query warning:", err);
      }
    }

    // 2. Fallback to client SDK Firestore
    if (!grantData) {
      try {
        const q = query(
          collection(firestore, "licenses"),
          where("customerEmail", "==", cleanEmail),
          where("claimStatus", "==", "unclaimed"),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          grantData = snap.docs[0].data();
          grantKey = snap.docs[0].id;
        }
      } catch (err) {
        console.warn("gift-check firestore query warning:", err);
      }
    }

    if (!grantData || !grantKey) {
      return NextResponse.json({ success: true, hasGift: false });
    }

    return NextResponse.json({
      success: true,
      hasGift: true,
      grant: {
        key: grantKey,
        customerName: grantData.customerName || "Friend",
        customerEmail: grantData.customerEmail,
        plan: grantData.plan || "pro",
        maxMachines: grantData.maxMachines || 3,
        giftNote: grantData.giftNote || "Complimentary Personal Cloud Access",
      },
    });
  } catch (error: any) {
    console.error("gift-check error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
