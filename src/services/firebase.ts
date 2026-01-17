import { initializeApp } from 'firebase/app';
import { 
  initializeAuth,
  getReactNativePersistence,
  GoogleAuthProvider, 
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { User } from '../types';

// Try to import env variables (will be undefined if not set)
let ENV_FIREBASE_API_KEY: string | undefined;
let ENV_FIREBASE_AUTH_DOMAIN: string | undefined;
let ENV_FIREBASE_PROJECT_ID: string | undefined;
let ENV_FIREBASE_STORAGE_BUCKET: string | undefined;
let ENV_FIREBASE_MESSAGING_SENDER_ID: string | undefined;
let ENV_FIREBASE_APP_ID: string | undefined;
try {
  const env = require('@env');
  ENV_FIREBASE_API_KEY = env.FIREBASE_API_KEY;
  ENV_FIREBASE_AUTH_DOMAIN = env.FIREBASE_AUTH_DOMAIN;
  ENV_FIREBASE_PROJECT_ID = env.FIREBASE_PROJECT_ID;
  ENV_FIREBASE_STORAGE_BUCKET = env.FIREBASE_STORAGE_BUCKET;
  ENV_FIREBASE_MESSAGING_SENDER_ID = env.FIREBASE_MESSAGING_SENDER_ID;
  ENV_FIREBASE_APP_ID = env.FIREBASE_APP_ID;
} catch {
  // Environment variables not available
}

// Firebase configuration - uses env variables or placeholders
const firebaseConfig = {
  apiKey: ENV_FIREBASE_API_KEY || "your-api-key",
  authDomain: ENV_FIREBASE_AUTH_DOMAIN || "your-auth-domain",
  projectId: ENV_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: ENV_FIREBASE_STORAGE_BUCKET || "your-storage-bucket",
  messagingSenderId: ENV_FIREBASE_MESSAGING_SENDER_ID || "your-messaging-sender-id",
  appId: ENV_FIREBASE_APP_ID || "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence for React Native
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

WebBrowser.maybeCompleteAuthSession();

export class FirebaseAuthService {
  private static instance: FirebaseAuthService;
  private authStateListeners: Array<(user: User | null) => void> = [];

  private constructor() {
    // Set up auth state listener
    onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      const user = this.convertFirebaseUser(firebaseUser);
      this.authStateListeners.forEach(listener => listener(user));
    });
  }

  static getInstance(): FirebaseAuthService {
    if (!FirebaseAuthService.instance) {
      FirebaseAuthService.instance = new FirebaseAuthService();
    }
    return FirebaseAuthService.instance;
  }

  async signInWithGoogle(): Promise<User | null> {
    try {
      // For demo purposes, we'll simulate a successful sign-in
      // In production, implement actual Google sign-in flow
      const mockUser: User = {
        uid: 'demo-user-id',
        email: 'demo@example.com',
        displayName: 'Demo User',
        photoURL: null,
        isAnonymous: false,
      };
      
      // Simulate sign-in delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return mockUser;
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      // For demo purposes, just clear the user
      console.log('User signed out');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  getCurrentUser(): User | null {
    return this.convertFirebaseUser(auth.currentUser);
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    this.authStateListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  private convertFirebaseUser(firebaseUser: FirebaseUser | null): User | null {
    if (!firebaseUser) return null;
    
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || undefined,
      displayName: firebaseUser.displayName || undefined,
      photoURL: firebaseUser.photoURL || undefined,
      isAnonymous: firebaseUser.isAnonymous,
    };
  }

  async getAccessToken(): Promise<string | null> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return null;
      
      const token = await currentUser.getIdToken();
      return token;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }
}

export const firebaseAuth = FirebaseAuthService.getInstance();