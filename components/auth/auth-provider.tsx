"use client";

import type { User as FirebaseUser } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { firebaseAuth, firebaseStorage, googleProvider, isFirebaseConfigured } from "@/lib/firebase/client";

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
  uploadProfileImage: (file: File) => Promise<string>;
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

  useEffect(() => {
    if (!firebaseAuth) {
      return;
    }

    return onAuthStateChanged(firebaseAuth, (nextUser) => {
      setFirebaseUser(nextUser);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthStore>(
    () => ({
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
        }
      },
      signInWithGoogle: async () => {
        if (!firebaseAuth) throw new Error("Firebase is not configured");
        await signInWithPopup(firebaseAuth, googleProvider);
      },
      signOut: async () => {
        if (!firebaseAuth) return;
        await firebaseSignOut(firebaseAuth);
      },
      uploadProfileImage: async (file) => {
        if (!firebaseAuth?.currentUser || !firebaseStorage) {
          throw new Error("Login required for profile image upload");
        }

        const imageRef = ref(firebaseStorage, `profiles/${firebaseAuth.currentUser.uid}/${Date.now()}-${file.name}`);
        await uploadBytes(imageRef, file);
        const photoURL = await getDownloadURL(imageRef);
        await updateProfile(firebaseAuth.currentUser, { photoURL });
        setFirebaseUser(firebaseAuth.currentUser);
        return photoURL;
      },
    }),
    [firebaseUser, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
