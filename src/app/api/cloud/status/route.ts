import { NextRequest, NextResponse } from "next/server";
import { getGatewayByKey, getGatewayByEmail, GatewayRecord } from "@/utils/cloudGatewayStore";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const email = searchParams.get("email");

    if (!key && !email) {
      return NextResponse.json(
        { success: false, error: "License key or email is required." },
        { status: 400, headers: corsHeaders }
      );
    }

    let gatewayData: GatewayRecord | null = null;

    // 1. Look up from local/memory store first
    if (key) {
      gatewayData = getGatewayByKey(key);
    }
    if (!gatewayData && email) {
      gatewayData = getGatewayByEmail(email);
    }

    // 2. Fallback to Firebase Admin by key
    if (!gatewayData && key) {
      try {
        const { adminFirestore } = await import("@/utils/firebase-admin");
        if (adminFirestore) {
          const cleanKey = String(key).trim().toUpperCase();
          const snap = await adminFirestore.collection("cloud_gateways").doc(cleanKey).get();
          if (snap && snap.exists) {
            gatewayData = snap.data() as GatewayRecord;
          }
        }
      } catch (e) {}

      if (!gatewayData) {
        try {
          const { firestore } = await import("@/utils/firebase");
          const { doc, getDoc } = await import("firebase/firestore");
          const cleanKey = String(key).trim().toUpperCase();
          const snap = await getDoc(doc(firestore, "cloud_gateways", cleanKey));
          if (snap.exists()) {
            gatewayData = snap.data() as GatewayRecord;
          }
        } catch (e) {}
      }
    }

    // 3. Fallback to Firebase Admin & Firestore by email
    if (!gatewayData && email) {
      const cleanEmail = String(email).trim().toLowerCase();
      try {
        const { adminFirestore } = await import("@/utils/firebase-admin");
        if (adminFirestore) {
          const querySnap = await adminFirestore.collection("cloud_gateways").where("email", "==", cleanEmail).get();
          if (!querySnap.empty) {
            let bestDoc = querySnap.docs[0].data() as GatewayRecord;
            let bestTime = bestDoc.lastHeartbeat ? new Date(bestDoc.lastHeartbeat).getTime() : 0;
            for (const docSnap of querySnap.docs) {
              const d = docSnap.data() as GatewayRecord;
              const dTime = d.lastHeartbeat ? new Date(d.lastHeartbeat).getTime() : (d.updatedAt ? new Date(d.updatedAt).getTime() : 0);
              if (dTime >= bestTime) {
                bestDoc = d;
                bestTime = dTime;
              }
            }
            gatewayData = bestDoc;
          }
        }
      } catch (e) {}

      if (!gatewayData) {
        try {
          const { firestore } = await import("@/utils/firebase");
          const { collection, query, where, getDocs } = await import("firebase/firestore");
          const qSnap = await getDocs(query(collection(firestore, "cloud_gateways"), where("email", "==", cleanEmail)));
          if (!qSnap.empty) {
            let bestDoc = qSnap.docs[0].data() as GatewayRecord;
            let bestTime = bestDoc.lastHeartbeat ? new Date(bestDoc.lastHeartbeat).getTime() : 0;
            for (const docSnap of qSnap.docs) {
              const d = docSnap.data() as GatewayRecord;
              const dTime = d.lastHeartbeat ? new Date(d.lastHeartbeat).getTime() : (d.updatedAt ? new Date(d.updatedAt).getTime() : 0);
              if (dTime >= bestTime) {
                bestDoc = d;
                bestTime = dTime;
              }
            }
            gatewayData = bestDoc;
          }
        } catch (e) {}
      }
    }

    if (!gatewayData) {
      return NextResponse.json(
        {
          success: false,
          error: "No active Personal Cloud registered for this account yet. Please ensure your PC server is running.",
          isRegistered: false,
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // Determine if machine is currently online based on heartbeat within last 10 minutes
    let isLive = gatewayData.status === "online" && Boolean(gatewayData.tunnelUrl);
    if (gatewayData.lastHeartbeat) {
      const diffMs = Date.now() - new Date(gatewayData.lastHeartbeat).getTime();
      if (diffMs > 10 * 60 * 1000) {
        isLive = false;
      }
    }

    return NextResponse.json(
      {
        success: true,
        isRegistered: true,
        gateway: {
          licenseKey: gatewayData.licenseKey,
          email: gatewayData.email,
          tunnelUrl: gatewayData.tunnelUrl,
          localUrl: gatewayData.localUrl,
          machineName: gatewayData.machineName,
          status: isLive ? "online" : (gatewayData.status || "offline"),
          lastHeartbeat: gatewayData.lastHeartbeat,
          isLive,
        }
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("Cloud status error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to check cloud status", isRegistered: false },
      { status: 200, headers: corsHeaders }
    );
  }
}
