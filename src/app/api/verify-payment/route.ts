import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { adminFirestore } from "@/utils/firebase-admin";
import { firestore } from "@/utils/firebase";
import { doc, setDoc, getDoc, addDoc, collection, Timestamp } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
      userEmail,
      isProMembership,
      productId,
      productTitle,
      amount,
      currency,
      customerName,
      vendorId,
      creatorLinkedAccountId,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing payment verification fields" },
        { status: 400 }
      );
    }

    // Verify the payment signature using HMAC SHA256
    const secret = process.env.RAZORPAY_KEY_SECRET || "";
    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: "Payment signature verification failed. Possible tampering detected." },
        { status: 400 }
      );
    }

    // Signature is valid — perform server-side database updates
    const cleanEmail = (userEmail || "").trim().toLowerCase();
    const cleanUserId = userId || null;

    // 1. If adminFirestore is initialized, update user & transaction on server
    if (adminFirestore) {
      if (cleanUserId) {
        try {
          const userDocRef = adminFirestore.collection("users").doc(cleanUserId);
          const updateData: any = {
            paymentId: razorpay_payment_id,
            paidAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          if (isProMembership) {
            updateData.isPaid = true;
            updateData["purchased.PRO_BUNDLE"] = true;
          } else if (productId) {
            updateData[`purchased.${productId}`] = true;
          }

          await userDocRef.set(updateData, { merge: true });
        } catch (userDbErr) {
          console.warn("Server user update note:", userDbErr);
        }
      }

      // 2. Log transaction in transactions collection
      try {
        await adminFirestore.collection("transactions").add({
          uid: cleanUserId,
          email: cleanEmail,
          userName: customerName || "Customer",
          amount: amount || 0,
          currency: currency || "INR",
          itemId: isProMembership ? "PRO_BUNDLE" : (productId || "software_item"),
          itemTitle: productTitle || (isProMembership ? "Pro Membership" : "Software Access"),
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          type: isProMembership ? "pro_membership" : "individual",
          vendorId: vendorId || "platform",
          payoutAccountId: creatorLinkedAccountId || "",
          gateway: "razorpay",
          status: "captured",
          timestamp: new Date().toISOString(),
        });
      } catch (txErr) {
        console.warn("Server transaction log note:", txErr);
      }

      // 3. Update customer store spend stats on server
      if (cleanEmail) {
        try {
          const custDocRef = adminFirestore.collection("customers").doc(cleanEmail);
          const custSnap = await custDocRef.get();
          const custData = custSnap.exists ? custSnap.data() : {};
          const spent = (custData?.totalSpent || 0) + (amount || 0);
          const orders = (custData?.ordersCount || 0) + 1;

          await custDocRef.set({
            email: cleanEmail,
            name: customerName || "Customer",
            totalSpent: spent,
            ordersCount: orders,
            lastOrderDate: new Date().toISOString(),
            firstOrderDate: custData?.firstOrderDate || new Date().toISOString(),
          }, { merge: true });
        } catch (custErr) {
          console.warn("Server customer stats update note:", custErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      message: "Payment signature verified successfully",
    });
  } catch (error: any) {
    console.error("Payment Verification Error:", error);

    return NextResponse.json(
      { error: error?.message || "Payment verification failed" },
      { status: 500 }
    );
  }
}
