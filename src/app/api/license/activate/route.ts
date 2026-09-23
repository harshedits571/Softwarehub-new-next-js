import { NextRequest, NextResponse } from "next/server";
import { adminFirestore } from "../../../../utils/firebase-admin";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, Timestamp } from "firebase/firestore";
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
    const { email, password, licenseKey, machineId, machineName } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Registered email address is required." },
        { status: 400, headers: corsHeaders }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // 1. Password Verification (If logging in via Account Credentials)
    if (password) {
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDzibjyt9Bun_gmONZTKK_HQ6E0jrrRIjo";
      let passwordMatched = false;

      // Method A: Check Firebase Identity Toolkit
      try {
        const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, password: String(password), returnSecureToken: true }),
        });
        const authData = await authRes.json();
        if (authRes.ok && authData.localId) {
          passwordMatched = true;
        }
      } catch (authFetchErr: any) {
        console.warn("Firebase Auth Identity check warning:", authFetchErr);
      }

      // Method B: Fallback check against Firestore user profile (for users who created password during checkout / Google sign-in)
      if (!passwordMatched) {
        if (adminFirestore) {
          try {
            const uSnap = await adminFirestore.collection("users").where("email", "==", cleanEmail).limit(1).get();
            if (!uSnap.empty) {
              const uData = uSnap.docs[0].data();
              if (
                uData.personalCloud?.appPassword === String(password) ||
                uData.appPassword === String(password)
              ) {
                passwordMatched = true;
              }
            }
          } catch (e) {}
        }

        if (!passwordMatched) {
          try {
            const q = query(collection(firestore, "users"), where("email", "==", cleanEmail));
            const qSnap = await getDocs(q);
            if (!qSnap.empty) {
              const uData = qSnap.docs[0].data();
              if (
                uData.personalCloud?.appPassword === String(password) ||
                uData.appPassword === String(password)
              ) {
                passwordMatched = true;
              }
            }
          } catch (e) {}
        }

        // Method C: Check licenses collection (where trial & purchased licenses store appPassword)
        if (!passwordMatched) {
          try {
            const lQuery = query(collection(firestore, "licenses"), where("customerEmail", "==", cleanEmail));
            const lSnap = await getDocs(lQuery);
            lSnap.forEach((dSnap) => {
              const dData = dSnap.data();
              if (dData.appPassword === String(password) || dData.password === String(password)) {
                passwordMatched = true;
              }
            });
          } catch (e) {
            console.warn("Licenses password check error:", e);
          }
        }
      }

      if (!passwordMatched) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid email or password. Please verify the password you created during trial activation or checkout on SoftwareHubs.in.",
          },
          { status: 401, headers: corsHeaders }
        );
      }
    } else if (!licenseKey) {
      return NextResponse.json(
        { success: false, error: "Please provide your account password or license key to activate." },
        { status: 400, headers: corsHeaders }
      );
    }

    const cleanKey = licenseKey ? String(licenseKey).trim().toUpperCase() : "";
    let licenseData: any = null;
    let licenseDocId: string = cleanKey;

    // 2. Fetch License by Key or by Email
    if (cleanKey) {
      if (adminFirestore) {
        try {
          const snap = await adminFirestore.collection("licenses").doc(cleanKey).get();
          if (snap.exists) {
            licenseData = snap.data();
            licenseDocId = snap.id;
          }
        } catch (e) {}
      }
      if (!licenseData) {
        try {
          const docRef = doc(firestore, "licenses", cleanKey);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            licenseData = snap.data();
            licenseDocId = snap.id;
          }
        } catch (e) {}
      }
    }

    // Lookup license by Email if not found by key or if user logged in via Password
    if (!licenseData) {
      if (adminFirestore) {
        try {
          const querySnap = await adminFirestore
            .collection("licenses")
            .where("customerEmail", "==", cleanEmail)
            .limit(1)
            .get();
          if (!querySnap.empty) {
            licenseData = querySnap.docs[0].data();
            licenseDocId = querySnap.docs[0].id;
          }
        } catch (e) {}
      }

      if (!licenseData) {
        try {
          const q = query(
            collection(firestore, "licenses"),
            where("customerEmail", "==", cleanEmail)
          );
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            licenseData = qSnap.docs[0].data();
            licenseDocId = qSnap.docs[0].id;
          }
        } catch (e) {}
      }
    }

    // Also check users/{uid} personalCloud field
    if (!licenseData) {
      if (adminFirestore) {
        try {
          const uSnap = await adminFirestore.collection("users").where("email", "==", cleanEmail).limit(1).get();
          if (!uSnap.empty) {
            const uData = uSnap.docs[0].data();
            if (uData.personalCloud) {
              licenseData = {
                licenseKey: uData.personalCloud.licenseKey || `PCLOUD-ACC-${cleanEmail.slice(0, 6).toUpperCase()}`,
                customerEmail: cleanEmail,
                plan: uData.personalCloud.plan || "pro",
                maxMachines: uData.personalCloud.maxMachines || 3,
                status: "active",
              };
              licenseDocId = licenseData.licenseKey;
            }
          }
        } catch (e) {}
      }
    }

    // If user has an account with password verified, auto-provision active Pro license
    if (!licenseData && password) {
      licenseData = {
        licenseKey: `PCLOUD-ACC-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`,
        customerEmail: cleanEmail,
        plan: "pro",
        maxMachines: 3,
        status: "active",
      };
      licenseDocId = licenseData.licenseKey;
    }

    // Trial Expiration Enforcement (30-Day Free Trial)
    if (licenseData && (licenseData.isTrial || licenseData.plan === "trial")) {
      const trialEnd = licenseData.trialEndDate ? new Date(licenseData.trialEndDate).getTime() : 0;
      const now = Date.now();
      if (trialEnd && now > trialEnd) {
        return NextResponse.json(
          {
            success: false,
            isTrialExpired: true,
            error: "Your 30-day free trial has expired. Please upgrade to Personal Cloud Pro Lifetime License on SoftwareHubs.in to continue using your server.",
            trialEndDate: licenseData.trialEndDate,
          },
          { status: 403, headers: corsHeaders }
        );
      }
    }

    if (!licenseData) {
      return NextResponse.json(
        {
          success: false,
          error: "No active Personal Cloud license found for this account. Please verify your purchase on SoftwareHubs.in.",
        },
        { status: 404, headers: corsHeaders }
      );
    }

    // Machine Hardware Lock Logic
    const maxMachines = Number(licenseData.maxMachines) || (licenseData.plan === "family" ? 5 : licenseData.plan === "starter" ? 1 : 3);
    const boundMachines: any[] = Array.isArray(licenseData.devices || licenseData.boundMachines) 
      ? (licenseData.devices || licenseData.boundMachines) 
      : [];

    if (machineId) {
      const alreadyBound = boundMachines.find((b: any) => b.machineId === machineId || b.id === machineId);

      if (!alreadyBound) {
        if (boundMachines.length >= maxMachines) {
          return NextResponse.json(
            {
              success: false,
              error: `Machine activation limit reached. Your ${licenseData.plan || 'pro'} plan is already activated on ${boundMachines.length} of ${maxMachines} allowed PC(s).`,
            },
            { status: 403, headers: corsHeaders }
          );
        }

        const newMachineRecord = {
          id: machineId,
          machineId,
          name: machineName || "Windows Workstation",
          machineName: machineName || "Windows Workstation",
          activatedAt: new Date().toISOString(),
        };
        boundMachines.push(newMachineRecord);

        // Update in Firestore
        try {
          if (adminFirestore) {
            await adminFirestore.collection("licenses").doc(licenseDocId).set({
              devices: boundMachines,
              boundMachines,
              activatedMachines: boundMachines.length,
              lastActivatedAt: new Date().toISOString(),
            }, { merge: true });
          } else {
            await setDoc(doc(firestore, "licenses", licenseDocId), {
              devices: boundMachines,
              boundMachines,
              activatedMachines: boundMachines.length,
              lastActivatedAt: Timestamp.now(),
            }, { merge: true });
          }
        } catch (updateErr) {
          console.warn("Could not update boundMachines in Firestore:", updateErr);
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Account verified and PC activated successfully!",
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
      { success: false, error: error.message || "Internal server error during account validation." },
      { status: 500, headers: corsHeaders }
    );
  }
}
