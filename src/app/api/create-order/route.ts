import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Razorpay environment variables are not configured on the server." },
        { status: 500 }
      );
    }

    // Initialize inside the handler to prevent Vercel build crashes if env vars are missing during build
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const body = await req.json();
    const {
      amount,
      currency = "INR",
      productId,
      productTitle,
      customerEmail,
      customerName,
      // Creator payout details
      creatorLinkedAccountId,
      platformCommissionPercent = 10,
    } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    // Convert to paise (smallest currency unit)
    const amountInPaise = Math.round(amount * 100);

    // Build the order options
    const orderOptions: any = {
      amount: amountInPaise,
      currency: currency,
      receipt: `order_${Date.now()}`,
      notes: {
        productId: productId || "pro_membership",
        productTitle: productTitle || "Pro Access",
        customerEmail: customerEmail || "",
        customerName: customerName || "",
      },
    };

    // If this is a creator product with a linked account, attach Route transfer
    if (creatorLinkedAccountId) {
      const creatorSharePaise = Math.round(
        amountInPaise * ((100 - platformCommissionPercent) / 100)
      );

      orderOptions.transfers = [
        {
          account: creatorLinkedAccountId,
          amount: creatorSharePaise,
          currency: currency,
          notes: {
            productId: productId,
            productTitle: productTitle,
            splitType: "creator_payout",
            platformCommission: `${platformCommissionPercent}%`,
          },
          on_hold: 0, // Transfer immediately after payment capture
        },
      ];
    }

    const order = await razorpay.orders.create(orderOptions);

    return NextResponse.json({
      success: true,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      hasTransfer: !!creatorLinkedAccountId,
    });
  } catch (error: any) {
    console.error("Razorpay Order Error:", error);

    return NextResponse.json(
      {
        error:
          error?.error?.description ||
          error?.message ||
          "Failed to create order",
      },
      { status: error?.statusCode || 500 }
    );
  }
}
