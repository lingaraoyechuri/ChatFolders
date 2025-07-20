import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase configuration
// Replace these with your actual Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyAixRpdaHeysdxiGxzQyurQRiW4KM7aMOw",
  authDomain: "chat-folder-extension.firebaseapp.com",
  projectId: "chat-folder-extension",
  storageBucket: "chat-folder-extension.firebasestorage.app",
  messagingSenderId: "841497295123",
  appId: "1:841497295123:web:7fbd135b4092b4ba2d42e6",
  measurementId: "G-WLVLT8DCYE",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
