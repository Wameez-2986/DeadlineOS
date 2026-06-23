'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  AuthError,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

/* ─── Save user profile to Firestore ──────────────────────
   Uses setDoc with merge:true so it creates on first login
   and only updates lastLoginAt on subsequent logins.
──────────────────────────────────────────────────────────── */
async function saveUserProfile(user: User, provider: 'google' | 'email') {
  const ref = doc(db, 'users', user.uid);
  await setDoc(
    ref,
    {
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName ?? '',
      photoURL: user.photoURL ?? null,
      provider,
      lastLoginAt: serverTimestamp(),
    },
    { merge: true }   // keeps existing fields (e.g. createdAt) on re-login
  );
}

/* ─── Context types ──────────────────────────────────────── */
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/* ─── Provider ───────────────────────────────────────────── */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  /* Email / password sign-up */
  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    // Persist profile + set createdAt on first signup
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      email: cred.user.email ?? '',
      displayName: displayName ?? '',
      photoURL: null,
      provider: 'email',
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });
  }, []);

  /* Email / password sign-in */
  const signIn = useCallback(async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await saveUserProfile(cred.user, 'email');
  }, []);

  /* Google OAuth sign-in / sign-up (single flow) */
  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    const isNew = cred.user.metadata.creationTime === cred.user.metadata.lastSignInTime;
    if (isNew) {
      // First-ever Google login → set createdAt
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        email: cred.user.email ?? '',
        displayName: cred.user.displayName ?? '',
        photoURL: cred.user.photoURL ?? null,
        provider: 'google',
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
    } else {
      await saveUserProfile(cred.user, 'google');
    }
  }, []);

  /* Sign out */
  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/* ─── Hook ───────────────────────────────────────────────── */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/* ─── Error formatting ───────────────────────────────────── */
export function formatAuthError(error: AuthError): string {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed. Please try again.';
    case 'auth/popup-blocked':
      return 'Popup was blocked by your browser. Please allow popups and try again.';
    case 'auth/cancelled-popup-request':
      return '';   // silent — user opened a second popup
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}
