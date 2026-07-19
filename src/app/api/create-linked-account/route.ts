import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      phone,
      legalBusinessName,
      accountHolderName,
      accountNumber,
      ifscCode,
      type = "route",
    } = body;

    if (!email || !accountHolderName || !accountNumber || !ifscCode) {
      return NextResponse.json(
        { error: "Missing required fields: email, accountHolderName, accountNumber, ifscCode" },
        { status: 400 }
      );
    }

    // Create a Razorpay Linked Account (Route)
    const accountData: any = {
      email: email,
      phone: phone || undefined,
      type: "route",
      legal_business_name: legalBusinessName || accountHolderName,
      business_type: "individual",
      legal_info: {
        pan: undefined, // Optional - creators can add later
      },
      // The actual bank account to settle funds into
      bank_account: {
        ifsc_code: ifscCode,
        beneficiary_name: accountHolderName,
        account_type: "savings",
        account_number: accountNumber,
      },
    };

    // Remove undefined fields
    if (!accountData.phone) delete accountData.phone;
    if (!accountData.legal_info?.pan) delete accountData.legal_info;

    const account = await (razorpay as any).accounts.create(accountData);

    return NextResponse.json({
      success: true,
      accountId: account.id,
      message: "Linked account created successfully on Razorpay",
    });
  } catch (error: any) {
    console.error("Razorpay Linked Account Error:", error);

    // Razorpay returns detailed error messages
    const errorMsg =
      error?.error?.description ||
      error?.message ||
      "Failed to create linked account";

    return NextResponse.json(
      {
        error: errorMsg,
        details: error?.error || null,
      },
      { status: error?.statusCode || 500 }
    );
  }
}
