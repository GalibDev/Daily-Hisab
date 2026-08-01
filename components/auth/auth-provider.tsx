"use client";

import type { User as FirebaseUser } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  reload,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { createContext, useContext, useEffect, useState } from "react";
import { firebaseAuth, firebaseStorage, googleProvider, isFirebaseConfigured } from "@/lib/firebase/client";
import { syncUserDirectoryProfile } from "@/lib/firebase/admin-data";

export type AppUser = {
  id: string;
  email: string | null;
  name: string | null;
  photoUrl: string | null;
  provider: "firebase";
};

type AuthStore = {
  user: AppUser | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  uploadProfileImage: (file: File) => Promise<string>;
  sendPasswordReset: (email: string) => Promise<void>;
  changePassword: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthStore | null>(null);

function mapUser(user: FirebaseUser | null): AppUser | null {
  if (!user) return null;

  return {
    id: user.uid,
    email: user.email,
    name: user.displayName,
    photoUrl: user.photoURL,
    provider: "firebase",
  };
}

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [, setProfileVersion] = useState(0);

  useEffect(() => {
    if (!firebaseAuth) {
      return;
    }

    void getRedirectResult(firebaseAuth).catch(() => {
      // A cancelled or abandoned redirect should leave the login page usable.
    });

    return onAuthStateChanged(firebaseAuth, (nextUser) => {
      setFirebaseUser(nextUser);
      setLoading(false);
      const appUser = mapUser(nextUser);
      if (appUser) void syncUserDirectoryProfile(appUser).catch(() => {
        // Authentication remains usable if profile presence sync is unavailable.
      });
    });
  }, []);

  const value: AuthStore = {
    user: mapUser(firebaseUser),
    loading,
    configured: isFirebaseConfigured,
    signIn: async (email, password) => {
      if (!firebaseAuth) throw new Error("Firebase is not configured");
      await signInWithEmailAndPassword(firebaseAuth, email, password);
    },
    signUp: async (email, password, name) => {
      if (!firebaseAuth) throw new Error("Firebase is not configured");
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      if (name) {
        await updateProfile(credential.user, { displayName: name });
        setFirebaseUser(credential.user);
        setProfileVersion((version) => version + 1);
      }
    },
    signInWithGoogle: async () => {
      if (!firebaseAuth) throw new Error("Firebase is not configured");
      // Redirect authentication can lose its pending state when the app uses a
      // custom domain while Firebase Auth is hosted on firebaseapp.com. Opening
      // the account picker directly from the user's click keeps that state in
      // the current page and works consistently on desktop and mobile.
      await signInWithPopup(firebaseAuth, googleProvider);
    },
    signOut: async () => {
      if (!firebaseAuth) return;
      await firebaseSignOut(firebaseAuth);
    },
    updateDisplayName: async (name) => {
      const trimmedName = name.trim();
      if (!firebaseAuth?.currentUser) throw new Error("Login required to update profile");
      if (!trimmedName) throw new Error("Name cannot be empty");
      await updateProfile(firebaseAuth.currentUser, { displayName: trimmedName });
      await reload(firebaseAuth.currentUser);
      setFirebaseUser(firebaseAuth.currentUser);
      const appUser = mapUser(firebaseAuth.currentUser);
      if (appUser) await syncUserDirectoryProfile(appUser);
      setProfileVersion((version) => version + 1);
    },
    uploadProfileImage: async (file) => {
      if (!firebaseAuth?.currentUser || !firebaseStorage) {
        throw new Error("Login required for profile image upload");
      }

      const imageRef = ref(firebaseStorage, `profiles/${firebaseAuth.currentUser.uid}/${Date.now()}-${file.name}`);
      await uploadBytes(imageRef, file);
      const photoURL = await getDownloadURL(imageRef);
      await updateProfile(firebaseAuth.currentUser, { photoURL });
      await reload(firebaseAuth.currentUser);
      setFirebaseUser(firebaseAuth.currentUser);
      const appUser = mapUser(firebaseAuth.currentUser);
      if (appUser) await syncUserDirectoryProfile(appUser);
      setProfileVersion((version) => version + 1);
      return photoURL;
    },
    sendPasswordReset: async (email) => {
      if (!firebaseAuth) throw new Error("Firebase is not configured");
      await sendPasswordResetEmail(firebaseAuth, email.trim(), { url: "https://dailyhisab.xyz/login" });
    },
    changePassword: async (password) => {
      if (!firebaseAuth?.currentUser) throw new Error("Login required");
      if (password.length < 6) throw new Error("Password must contain at least 6 characters");
      await updatePassword(firebaseAuth.currentUser, password);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
