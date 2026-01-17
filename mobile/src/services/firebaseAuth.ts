import auth from '@react-native-firebase/auth';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

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

class FirebaseAuthService {
  private currentUser: AuthUser | null = null;

  constructor() {
    this.setupAuthStateListener();
  }

  /**
   * Set up listener for auth state changes
   */
  private setupAuthStateListener(): void {
    auth().onAuthStateChanged((user) => {
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
    });
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string): Promise<AuthUser> {
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
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
    try {
      const userCredential = await auth().signInWithEmailAndPassword(email, password);
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
    try {
      const userCredential = await auth().signInAnonymously();
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
    try {
      await auth().signOut();
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
    try {
      const user = auth().currentUser;
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
    try {
      const user = auth().currentUser;
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
    try {
      await auth().sendPasswordResetEmail(email);
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Link anonymous account to email/password
   */
  async linkAnonymousToEmail(email: string, password: string): Promise<AuthUser> {
    try {
      const credential = auth.EmailAuthProvider.credential(email, password);
      const userCredential = await auth().currentUser?.linkWithCredential(credential);
      if (!userCredential) {
        throw new Error('Failed to link accounts');
      }
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
   * Handle Firebase auth errors
   */
  private handleAuthError(error: unknown): AuthError {
    if (error instanceof Error) {
      const firebaseError = error as FirebaseAuthTypes.NativeFirebaseAuthError;
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
