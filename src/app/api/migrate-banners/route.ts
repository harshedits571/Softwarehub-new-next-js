import { NextRequest, NextResponse } from "next/server";
import { getDatabase, ref, get } from "firebase/database";
import { collection, setDoc, doc } from "firebase/firestore";
import { app, firestore } from "../../../utils/firebase";

export async function GET(req: NextRequest) {
  try {
    const rtdb = getDatabase(app);
    const bannersSnap = await get(ref(rtdb, "banners"));
    
    if (bannersSnap.exists()) {
      const bannersData = bannersSnap.val();
      let count = 0;
      for (const bannerId in bannersData) {
        const banner = bannersData[bannerId];
        await setDoc(doc(firestore, "banners", bannerId), banner);
        count++;
      }
      return NextResponse.json({ success: true, count, message: "Migrated banners successfully" });
    } else {
      return NextResponse.json({ success: true, count: 0, message: "No banners found in RTDB" });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
