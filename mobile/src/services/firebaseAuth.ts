// Firebase Auth Service
// Note: Using a fallback mock implementation for Expo Go compatibility
// For production with native Firebase, use @react-native-firebase/auth

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAnonymous: boolean;
}

export interface AuthError {
  code: string;
  message: string;
}

// Check if we're running in an environment with native Firebase
let firebaseAuth: any = null;
let isNativeFirebaseAvailable = false;

try {
  // Only try to import native Firebase if available
  // This will fail in Expo Go but work in bare workflow / dev client
  const nativeAuth = require('@react-native-firebase/auth');
  firebaseAuth = nativeAuth.default;
  isNativeFirebaseAvailable = true;
} catch (error) {
  // Native Firebase not available, use mock implementation
  console.log('Native Firebase not available, using offline-first mode');
}

class FirebaseAuthService {
  private currentUser: AuthUser | null = null;
  private isInitialized: boolean = false;

  constructor() {
    if (isNativeFirebaseAvailable && firebaseAuth) {
      this.setupAuthStateListener();
    } else {
      // Create an anonymous user for offline-first mode
      this.currentUser = {
        uid: `offline-${Date.now()}`,
        email: null,
        displayName: null,
        isAnonymous: true,
      };
      this.isInitialized = true;
    }
  }

  /**
   * Set up listener for auth state changes
   */
  private setupAuthStateListener(): void {
    if (!isNativeFirebaseAvailable || !firebaseAuth) return;
    
    try {
      firebaseAuth().onAuthStateChanged((user: any) => {
        if (user) {
          this.currentUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            isAnonymous: user.isAnonymous,
          };
        } else {
          this.currentUser = null;
        }
        this.isInitialized = true;
      });
    } catch (error) {
      console.error('Failed to set up auth state listener:', error);
      this.isInitialized = true;
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string): Promise<AuthUser> {
    if (!isNativeFirebaseAvailable || !firebaseAuth) {
      // Create a mock user for offline mode
      this.currentUser = {
        uid: `user-${Date.now()}`,
        email: email,
        displayName: null,
        isAnonymous: false,
      };
      return this.currentUser;
    }
    
    try {
      const userCredential = await firebaseAuth().createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      this.currentUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        isAnonymous: user.isAnonymous,
      };
      return this.currentUser;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<AuthUser> {
    if (!isNativeFirebaseAvailable || !firebaseAuth) {
      // Create a mock user for offline mode
      this.currentUser = {
        uid: `user-${Date.now()}`,
        email: email,
        displayName: null,
        isAnonymous: false,
      };
      return this.currentUser;
    }
    
    try {
      const userCredential = await firebaseAuth().signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      this.currentUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        isAnonymous: user.isAnonymous,
      };
      return this.currentUser;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign in anonymously (for offline-first usage)
   */
  async signInAnonymously(): Promise<AuthUser> {
    if (!isNativeFirebaseAvailable || !firebaseAuth) {
      // Create an anonymous user for offline mode
      if (!this.currentUser) {
        this.currentUser = {
          uid: `anon-${Date.now()}`,
          email: null,
          displayName: null,
          isAnonymous: true,
        };
      }
      return this.currentUser;
    }
    
    try {
      const userCredential = await firebaseAuth().signInAnonymously();
      const user = userCredential.user;
      this.currentUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        isAnonymous: user.isAnonymous,
      };
      return this.currentUser;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    if (!isNativeFirebaseAvailable || !firebaseAuth) {
      this.currentUser = null;
      return;
    }
    
    try {
      await firebaseAuth().signOut();
      this.currentUser = null;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Get ID token for API calls
   */
  async getIdToken(): Promise<string> {
    if (!isNativeFirebaseAvailable || !firebaseAuth) {
      return `offline-token-${this.currentUser?.uid || 'none'}`;
    }
    
    try {
      const user = firebaseAuth().currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }
      return user.getIdToken();
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(displayName: string, photoURL?: string): Promise<void> {
    if (!isNativeFirebaseAvailable || !firebaseAuth) {
      if (this.currentUser) {
        this.currentUser.displayName = displayName;
      }
      return;
    }
    
    try {
      const user = firebaseAuth().currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }
      await user.updateProfile({
        displayName,
        photoURL,
      });
      if (this.currentUser) {
        this.currentUser.displayName = displayName;
      }
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    if (!isNativeFirebaseAvailable || !firebaseAuth) {
      console.log('Password reset not available in offline mode');
      return;
    }
    
    try {
      await firebaseAuth().sendPasswordResetEmail(email);
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Handle Firebase auth errors
   */
  private handleAuthError(error: unknown): AuthError {
    if (error instanceof Error) {
      const firebaseError = error as any;
      return {
        code: firebaseError.code || 'unknown',
        message: firebaseError.message || 'An authentication error occurred',
      };
    }
    return {
      code: 'unknown',
      message: 'An unknown error occurred',
    };
  }
}

export const firebaseAuthService = new FirebaseAuthService();
