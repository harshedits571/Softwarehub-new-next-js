import { NextRequest, NextResponse } from "next/server";
import { adminFirestore } from "../../../../utils/firebase-admin";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { firestore } from "../../../../utils/firebase";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(req: NextRequest) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  try {
    const body = await req.json();
    const { email, licenseKey, machineId, machineName } = body;

    if (!email || !licenseKey) {
      return NextResponse.json(
        { success: false, error: "Registered email and license key are required." },
        { status: 400, headers: corsHeaders }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanKey = String(licenseKey).trim().toUpperCase();

    let licenseData: any = null;
    let licenseDocId: string = cleanKey;

    // 1. Try fetching via adminFirestore first
    if (adminFirestore) {
      try {
        const snap = await adminFirestore.collection("licenses").doc(cleanKey).get();
        if (snap.exists) {
          licenseData = snap.data();
          licenseDocId = snap.id;
        } else {
          // Fallback: search by licenseKey or paymentId
          const querySnap = await adminFirestore
            .collection("licenses")
            .where("licenseKey", "==", cleanKey)
            .limit(1)
            .get();
          if (!querySnap.empty) {
            licenseData = querySnap.docs[0].data();
            licenseDocId = querySnap.docs[0].id;
          }
        }
      } catch (err) {
        console.warn("adminFirestore lookup error, falling back to client firestore:", err);
      }
    }

    // 2. Fallback to client firestore if adminFirestore wasn't available or errored
    if (!licenseData) {
      try {
        const docRef = doc(firestore, "licenses", cleanKey);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          licenseData = snap.data();
          licenseDocId = snap.id;
        } else {
          const q = query(
            collection(firestore, "licenses"),
            where("licenseKey", "==", cleanKey)
          );
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            licenseData = qSnap.docs[0].data();
            licenseDocId = qSnap.docs[0].id;
          }
        }
      } catch (err) {
        console.error("Client firestore lookup error:", err);
      }
    }

    // If license does not exist
    if (!licenseData) {
      return NextResponse.json(
        {
          success: false,
          error: "License key not found. Please check your key or buy a license on SoftwareHubs.in.",
        },
        { status: 404, headers: corsHeaders }
      );
    }

    // Verify email match (case-insensitive)
    const registeredEmail = String(licenseData.email || "").trim().toLowerCase();
    if (registeredEmail && registeredEmail !== cleanEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "Email mismatch. This key is registered to a different email address.",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify license status
    if (licenseData.status && licenseData.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          error: `License is ${licenseData.status}. Please contact support at SoftwareHubs.in.`,
        },
        { status: 403, headers: corsHeaders }
      );
    }

    // Machine Hardware Lock Logic
    const maxMachines = Number(licenseData.maxMachines) || (licenseData.plan === "family" ? 3 : 1);
    const boundMachines: any[] = Array.isArray(licenseData.boundMachines) ? licenseData.boundMachines : [];

    if (machineId) {
      const alreadyBound = boundMachines.find((b: any) => b.machineId === machineId);

      if (!alreadyBound) {
        if (boundMachines.length >= maxMachines) {
          return NextResponse.json(
            {
              success: false,
              error: `Machine activation limit reached. This license is already activated on ${boundMachines.length} of ${maxMachines} allowed PC(s).`,
            },
            { status: 403, headers: corsHeaders }
          );
        }

        // Add this machine to boundMachines
        const newMachineRecord = {
          machineId,
          machineName: machineName || "Windows Workstation",
          activatedAt: new Date().toISOString(),
        };
        boundMachines.push(newMachineRecord);

        // Update in Firestore
        try {
          if (adminFirestore) {
            await adminFirestore.collection("licenses").doc(licenseDocId).update({
              boundMachines,
              lastActivatedAt: new Date().toISOString(),
            });
          } else {
            await updateDoc(doc(firestore, "licenses", licenseDocId), {
              boundMachines,
              lastActivatedAt: Timestamp.now(),
            });
          }
        } catch (updateErr) {
          console.error("Failed to update boundMachines in Firestore:", updateErr);
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "License verified successfully!",
        licenseKey: licenseData.licenseKey || cleanKey,
        email: cleanEmail,
        plan: licenseData.plan || "pro",
        maxMachines,
        boundMachinesCount: boundMachines.length,
        activatedAt: new Date().toISOString(),
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("License activation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error during license validation." },
      { status: 500, headers: corsHeaders }
    );
  }
}
