import { NextResponse } from "next/server";
import { adminFirestore } from "@/utils/firebase-admin";
import { firestore as clientDb } from "@/utils/firebase";
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, deleteField } from "firebase/firestore";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { licenseId, licenseKey, customerEmail } = body;

    const cleanEmail = customerEmail ? String(customerEmail).trim().toLowerCase() : "";
    const cleanKey = licenseKey ? String(licenseKey).trim().toUpperCase() : "";
    const cleanId = licenseId ? String(licenseId).trim() : "";

    if (!cleanId && !cleanKey && !cleanEmail) {
      return NextResponse.json(
        { success: false, error: "Missing license identification parameters" },
        { status: 400, headers: corsHeaders }
      );
    }

    let deletedLicensesCount = 0;
    let updatedUsersCount = 0;

    // 1. Using Admin Firestore if available
    if (adminFirestore) {
      // Delete from licenses collection by ID
      if (cleanId) {
        try {
          await adminFirestore.collection("licenses").doc(cleanId).delete();
          deletedLicensesCount++;
        } catch (e) {}
      }

      // Delete by key if different or multiple docs
      if (cleanKey) {
        const snap = await adminFirestore.collection("licenses").where("key", "==", cleanKey).get();
        for (const d of snap.docs) {
          await d.ref.delete();
          deletedLicensesCount++;
        }
      }

      // Delete by customerEmail
      if (cleanEmail) {
        const snapEmail = await adminFirestore.collection("licenses").where("customerEmail", "==", cleanEmail).get();
        for (const d of snapEmail.docs) {
          await d.ref.delete();
          deletedLicensesCount++;
        }
      }

      // Clean up users collection (clear personalCloud and trialClaimed)
      if (cleanEmail) {
        const uSnap = await adminFirestore.collection("users").where("email", "==", cleanEmail).get();
        for (const uDoc of uSnap.docs) {
          await uDoc.ref.update({
            personalCloud: adminFirestore.FieldValue ? adminFirestore.FieldValue.delete() : null,
            trialClaimed: adminFirestore.FieldValue ? adminFirestore.FieldValue.delete() : false,
            trialStartDate: adminFirestore.FieldValue ? adminFirestore.FieldValue.delete() : null,
            trialEndDate: adminFirestore.FieldValue ? adminFirestore.FieldValue.delete() : null,
            licenseKey: adminFirestore.FieldValue ? adminFirestore.FieldValue.delete() : null,
          });
          updatedUsersCount++;
        }
      }
    } else {
      // Fallback using client SDK
      if (cleanId) {
        try {
          await deleteDoc(doc(clientDb, "licenses", cleanId));
          deletedLicensesCount++;
        } catch (e) {}
      }

      if (cleanKey) {
        const qKey = query(collection(clientDb, "licenses"), where("key", "==", cleanKey));
        const snap = await getDocs(qKey);
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
          deletedLicensesCount++;
        }
      }

      if (cleanEmail) {
        const qEmail = query(collection(clientDb, "licenses"), where("customerEmail", "==", cleanEmail));
        const snap = await getDocs(qEmail);
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
          deletedLicensesCount++;
        }

        const qUsers = query(collection(clientDb, "users"), where("email", "==", cleanEmail));
        const snapUsers = await getDocs(qUsers);
        for (const u of snapUsers.docs) {
          await updateDoc(u.ref, {
            personalCloud: deleteField(),
            trialClaimed: deleteField(),
            trialStartDate: deleteField(),
            trialEndDate: deleteField(),
            licenseKey: deleteField(),
          });
          updatedUsersCount++;
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully deleted license and wiped associated user trial / dashboard states.`,
        deletedLicensesCount,
        updatedUsersCount,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("Error in delete license route:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete license" },
      { status: 500, headers: corsHeaders }
    );
  }
}
