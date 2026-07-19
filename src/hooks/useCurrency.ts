"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { firestore } from "../utils/firebase";

export interface PricingState {
  currency: "INR" | "USD";
  proPrice: number;
  proPriceUSD: number;
  rzpKey: string;
  activePrice: number;
  symbol: string;
  displayPrice: string;
}

const detectUserCurrency = async (): Promise<"INR" | "USD"> => {
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (res.ok) {
      const data = await res.json();
      if (data.country_code === "IN") return "INR";
      if (data.country_code) return "USD";
    }
  } catch (e) {
    console.warn("ipapi.co failed");
  }

  try {
    const res = await fetch("https://api.db-ip.com/v2/free/self");
    if (res.ok) {
      const data = await res.json();
      if (data.countryCode === "IN") return "INR";
      if (data.countryCode) return "USD";
    }
  } catch (e) {
    console.warn("db-ip.com failed");
  }

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = new Date().getTimezoneOffset();
    if (tz === "Asia/Kolkata" || tz === "Asia/Calcutta" || offset === -330) {
      return "INR";
    }
  } catch (e) {
    console.error("Detection error:", e);
  }

  return "USD";
};

export const useCurrency = () => {
  const [pricing, setPricing] = useState<PricingState>({
    currency: "USD",
    proPrice: 10,
    proPriceUSD: 0.99,
    rzpKey: process.env.NEXT_PUBLIC_RAZORPAY_KEY || "rzp_live_SeElRgESDAvD5D",
    activePrice: 0.99,
    symbol: "$",
    displayPrice: "0.99",
  });

  useEffect(() => {
    const tzGuess = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offsetGuess = new Date().getTimezoneOffset();
    const initialCurrency =
      tzGuess === "Asia/Kolkata" || tzGuess === "Asia/Calcutta" || offsetGuess === -330
        ? "INR"
        : "USD";

    let dbPricingData: any = null;
    let currentCurrency: "INR" | "USD" = initialCurrency;

    const pricingDocRef = doc(firestore, "settings", "globalConfig");

    const updatePricing = (currency: "INR" | "USD", data: any) => {
      const proPrice = parseFloat(data?.proPrice) || 10;
      const proPriceUSD = parseFloat(data?.proPriceUSD) || 0.99;
      const activePrice = currency === "INR" ? proPrice : proPriceUSD;
      const rzpKey = data?.rzpKey || process.env.NEXT_PUBLIC_RAZORPAY_KEY || "rzp_live_SeElRgESDAvD5D";

      setPricing({
        currency,
        proPrice,
        proPriceUSD,
        rzpKey,
        activePrice,
        symbol: currency === "INR" ? "₹" : "$",
        displayPrice: currency === "USD" ? activePrice.toFixed(2) : activePrice.toString(),
      });
    };

    const unsubscribe = onSnapshot(pricingDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const fullData = snapshot.data();
        dbPricingData = fullData?.pricing || {};
        updatePricing(currentCurrency, dbPricingData);
      }
    });

    detectUserCurrency().then((refinedCurrency) => {
      if (refinedCurrency !== currentCurrency) {
        currentCurrency = refinedCurrency;
        if (dbPricingData) {
          updatePricing(refinedCurrency, dbPricingData);
        } else {
          getDoc(pricingDocRef).then((snapshot) => {
            if (snapshot.exists()) {
              const fullData = snapshot.data();
              dbPricingData = fullData?.pricing || {};
              updatePricing(refinedCurrency, dbPricingData);
            }
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return pricing;
};
