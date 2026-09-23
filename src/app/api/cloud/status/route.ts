import { NextRequest, NextResponse } from "next/server";
import { adminFirestore } from "../../../../utils/firebase-admin";
import { firestore } from "../../../../utils/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { getGatewayByKey, getGatewayByEmail, GatewayRecord } from "../../../../utils/cloudGatewayStore";

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

    // 2. Fallback to adminFirestore
    if (!gatewayData && key && adminFirestore) {
      try {
        const cleanKey = String(key).trim().toUpperCase();
        const snap = await adminFirestore.collection("cloud_gateways").doc(cleanKey).get();
        if (snap.exists) {
          gatewayData = snap.data() as GatewayRecord;
        }
      } catch (e) {}
    }

    // 3. Fallback to client firestore
    if (!gatewayData && key) {
      try {
        const cleanKey = String(key).trim().toUpperCase();
        const docRef = doc(firestore, "cloud_gateways", cleanKey);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          gatewayData = snap.data() as GatewayRecord;
        }
      } catch (e) {}
    }

    if (!gatewayData) {
      return NextResponse.json(
        {
          success: false,
          error: "No active Personal Cloud registered for this license key.",
          isRegistered: false,
        },
        { status: 404, headers: corsHeaders }
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
      { success: false, error: err?.message || "Failed to check cloud status" },
      { status: 500, headers: corsHeaders }
    );
  }
}
