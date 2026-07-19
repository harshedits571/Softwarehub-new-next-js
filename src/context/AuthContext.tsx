"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, firestore } from "../utils/firebase";

export interface UserProfile {
  username?: string;
  email?: string;
  joinedAt?: string;
  isPaid?: boolean;
  role?: string;
  isBanned?: boolean;
  avatarUrl?: string;
  isVerified?: boolean;
  purchased?: Record<string, boolean>;
  freeDownloads?: Record<string, any>;
  ratings?: Record<string, any>;
  favorites?: Record<string, any>;
  isCreatorApproved?: boolean;
  creatorDetails?: {
    bio?: string;
    displayName?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    supportEmail?: string;
    paymentDetails?: {
      razorpayAccountId?: string;
      stripeAccountId?: string;
    };
  };
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeDatabase: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      
      // Cleanup previous database listener
      if (unsubscribeDatabase) {
        unsubscribeDatabase();
        unsubscribeDatabase = null;
      }

      if (user) {
        // Subscribe to Firestore users/{uid} document
        const docRef = doc(firestore, "users", user.uid);
        const unsubscribe = onSnapshot(
          docRef,
          (snapshot) => {
            if (snapshot.exists()) {
              setUserProfile(snapshot.data() as UserProfile);
            } else {
              setUserProfile(null);
            }
            setLoading(false);
          },
          (error) => {
            console.error("Error loading user profile:", error);
            setLoading(false);
          }
        );
        unsubscribeDatabase = unsubscribe;
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDatabase) {
        unsubscribeDatabase();
      }
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
