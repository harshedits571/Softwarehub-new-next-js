import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminFirestore } from "../../../utils/firebase-admin";
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email || "Anonymous";

    const body = await req.json();
    const { itemId, versionName, resourceTitle } = body;

    if (!itemId) {
      return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
    }

    // Check if user is banned
    const userDoc = await adminFirestore.collection("users").doc(uid).get();
    if (userDoc.exists && userDoc.data()?.isBanned) {
      return NextResponse.json({ error: "Your account is banned." }, { status: 403 });
    }

    // Scraping Protection Logic
    const recentThreshold = Date.now() - 30 * 60 * 1000;
    
    // Count downloads in the last 30 minutes
    const downloadLogsSnap = await adminFirestore
      .collection("downloadLogs")
      .where("uid", "==", uid)
      .where("timestamp", ">=", new Date(recentThreshold))
      .get();
    
    // Allow 10 downloads per 30 minutes
    if (downloadLogsSnap.size >= 10) {
      // Auto-ban user
      await adminFirestore.collection("users").doc(uid).update({
        isBanned: true,
        banReason: "Automated: Excessive bulk download activity (Scraping Protection).",
      });
      return NextResponse.json({ error: "Your account has been banned due to suspension of scraping." }, { status: 429 });
    }

    if (downloadLogsSnap.size >= 5) {
      // It's just a warning, handled client-side if we wanted, but we can pass a flag
    }

    // Fetch the actual product to get the secure download URL
    const productDoc = await adminFirestore.collection("products").doc(itemId).get();
    if (!productDoc.exists) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }
    
    const productData = productDoc.data();
    let rawLink = "#";
    
    if (versionName && productData?.versions) {
        const ver = productData.versions.find((v: any) => v.Name === versionName);
        rawLink = ver?.Link || productData.ImageURL || "#";
    } else {
        rawLink = productData?.ImageURL || productData?.DownloadLink || "#";
    }

    // Log the download on the server
    await adminFirestore.collection("downloadLogs").add({
      uid,
      email,
      resourceId: itemId,
      resourceTitle: resourceTitle || productData?.Title || "Unknown",
      versionName: versionName || "Direct Download",
      timestamp: FieldValue.serverTimestamp(),
      ownerUid: productData?.ownerUid || productData?.vendorId || "platform",
    });

    await adminFirestore.collection("users").doc(uid).update({
      lastDownload: {
        resourceTitle: resourceTitle || productData?.Title || "Unknown",
        versionName: versionName || "Direct Download",
        timestamp: FieldValue.serverTimestamp(),
      }
    });

    return NextResponse.json({
      success: true,
      url: rawLink,
      warning: downloadLogsSnap.size >= 5 ? "Slow down! Too many downloads in a short period." : null
    });

  } catch (error: any) {
    console.error("Secure Download API Error:", error);
    return NextResponse.json(
      { error: "Internal server error or invalid token" },
      { status: 500 }
    );
  }
}
