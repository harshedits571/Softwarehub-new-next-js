import { NextRequest, NextResponse } from "next/server";
import { setGatewayRecord, GatewayRecord } from "@/utils/cloudGatewayStore";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    const { licenseKey, email, tunnelUrl, localUrl, machineName, machineId, status } = body;

    if (!licenseKey) {
      return NextResponse.json(
        { success: false, error: "License key is required to synchronize gateway." },
        { status: 400, headers: corsHeaders }
      );
    }

    const cleanKey = String(licenseKey).trim().toUpperCase();
    const cleanEmail = email ? String(email).trim().toLowerCase() : "";
    const cleanStatus: "online" | "offline" = status === "offline" ? "offline" : "online";
    const nowIso = new Date().toISOString();

    const gatewayPayload: GatewayRecord = {
      licenseKey: cleanKey,
      email: cleanEmail,
      tunnelUrl: tunnelUrl ? String(tunnelUrl).trim() : null,
      localUrl: localUrl ? String(localUrl).trim() : null,
      machineName: machineName || "Personal PC Server",
      machineId: machineId || "",
      status: cleanStatus,
      lastHeartbeat: nowIso,
      updatedAt: nowIso,
    };

    // 1. Immediately store in global memory & disk store
    setGatewayRecord(gatewayPayload);

    // 2. Best-effort Firestore sync in background
    try {
      const { adminFirestore } = await import("@/utils/firebase-admin");
      if (adminFirestore) {
        adminFirestore
          .collection("cloud_gateways")
          .doc(cleanKey)
          .set(gatewayPayload, { merge: true })
          .catch((e: any) => console.warn("adminFirestore cloud_gateways sync warning:", e?.message));
      }
    } catch (e) {
      // Ignore background firestore error
    }

    return NextResponse.json(
      {
        success: true,
        message: "Gateway synchronized successfully",
        gatewayUrl: `https://softwarehubs.in/cloud?key=${cleanKey}`,
        updatedAt: nowIso
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("Cloud gateway sync error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to sync cloud gateway" },
      { status: 500, headers: corsHeaders }
    );
  }
}
