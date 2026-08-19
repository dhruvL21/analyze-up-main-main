/**
 * Firebase Client Configuration
 * Reads configuration from environment variables with fallbacks.
 */
export const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-5677991477-64bcd",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:579803553702:web:73e85d839561606507f967",
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCZpByWGPAlacjIppNTMxC0emtWSWKefx0",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-5677991477-64bcd.firebaseapp.com",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "579803553702",
};
