import { create } from "zustand";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../config/firebase";

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
  setError: (error: string) => void;
  initializeAuth: () => () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email: string, password: string) => {
    try {
      console.log("AuthStore: Starting login for", email);
      set({ isLoading: true, error: null });
      await signInWithEmailAndPassword(auth, email, password);
      console.log("AuthStore: Login successful");
    } catch (error: any) {
      console.error("AuthStore: Login failed", error);
      set({
        error: error.message || "Login failed",
        isLoading: false,
      });
      throw error;
    }
  },

  register: async (email: string, password: string) => {
    try {
      console.log("AuthStore: Starting registration for", email);
      set({ isLoading: true, error: null });
      await createUserWithEmailAndPassword(auth, email, password);
      console.log("AuthStore: Registration successful");
    } catch (error: any) {
      console.error("AuthStore: Registration failed", error);
      set({
        error: error.message || "Registration failed",
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true, error: null });
      await signOut(auth);
    } catch (error: any) {
      set({
        error: error.message || "Logout failed",
        isLoading: false,
      });
      throw error;
    }
  },

  resetPassword: async (email: string) => {
    try {
      set({ isLoading: true, error: null });
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      set({
        error: error.message || "Password reset failed",
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  setError: (error: string) => {
    set({ error });
  },

  initializeAuth: () => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          const user: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          };
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } else {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      }
    );

    // Return unsubscribe function for cleanup
    return unsubscribe;
  },
}));
