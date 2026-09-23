import { NextRequest, NextResponse } from "next/server";
import { firestore } from "@/utils/firebase";
import { doc, getDoc } from "firebase/firestore";

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
    let updateData = {
      currentVersion: "1.0.4",
      downloadUrl: "https://softwarehubs.in/downloads/PersonalCloud-Pro-Setup.exe",
      fileName: "PersonalCloud-Pro-Setup.exe",
      fileSizeMB: 48.5,
      releaseDate: new Date().toISOString().slice(0, 10),
      releaseNotes: "• Performance improvements and faster background sync\n• Seamless Firestore app password verification\n• Automatic update detection\n• Remote access connection stability",
      mandatory: false,
    };

    // Try reading Firestore config
    try {
      const snap = await getDoc(doc(firestore, "config", "personal_cloud_updates"));
      if (snap.exists()) {
        const data = snap.data();
        updateData = {
          currentVersion: data.currentVersion || updateData.currentVersion,
          downloadUrl: data.downloadUrl || updateData.downloadUrl,
          fileName: data.fileName || updateData.fileName,
          fileSizeMB: Number(data.fileSizeMB) || updateData.fileSizeMB,
          releaseDate: data.releaseDate || updateData.releaseDate,
          releaseNotes: data.releaseNotes || updateData.releaseNotes,
          mandatory: Boolean(data.mandatory),
        };
      }
    } catch (dbErr) {
      console.warn("Firestore updates config read note:", dbErr);
    }

    return NextResponse.json(
      {
        success: true,
        ...updateData,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch software updates." },
      { status: 500, headers: corsHeaders }
    );
  }
}