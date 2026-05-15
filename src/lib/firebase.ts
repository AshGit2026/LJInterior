import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, setDoc, getDoc, collection, query, where, onSnapshot, addDoc, updateDoc, serverTimestamp, getDocFromServer, getDocs, orderBy, limit } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const filteredConfig = Object.fromEntries(
  Object.entries(firebaseConfig).filter(([_, v]) => v !== "")
);

const app = initializeApp(filteredConfig);
export const auth = getAuth(app);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
}, (filteredConfig as any).firestoreDatabaseId);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Error Handling Utility
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: any[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Ignore benign errors during component unmount or hot reloading
  if (errorMessage.includes('Firestore shutting down') || 
      errorMessage.includes('terminated') || 
      errorMessage.includes('cancelled')) {
    console.warn(`Silenced Firestore ${operationType} error for ${path}: ${errorMessage}`);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  // Throw for critical errors (like permission denied) so the UI can report it
  throw new Error(JSON.stringify(errInfo));
}

// Auth Helpers
let loginInProgress = false;

export const signInWithGoogle = async () => {
  if (loginInProgress) {
    console.warn('signInWithGoogle: Login already in progress, ignoring duplicate call');
    return null;
  }

  loginInProgress = true;
  try {
    // Auth Guard: Force a clean state if a user is currently logged in,
    // as iframe environment state management is flaky.
    if (auth.currentUser) {
        console.warn('Auth user detected before login attempt, reloading to ensure clean state');
        window.location.reload();
        return null;
    }

    console.log('signInWithGoogle: Opening popup');
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    console.log('signInWithGoogle: Success:', user.email);
    
    // Background profile update
    (async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        const isAdmin = user.email === 'gjtnlfnl@gmail.com';
        
        if (!userSnap.exists()) {
          const profileData: any = {
            uid: user.uid,
            email: user.email,
            role: isAdmin ? 'admin' : 'user',
            createdAt: serverTimestamp()
          };
          if (user.displayName) profileData.displayName = user.displayName;
          if (user.photoURL) profileData.photoURL = user.photoURL;
          await setDoc(userRef, profileData);
        } else if (isAdmin && userSnap.data()?.role !== 'admin') {
          await updateDoc(userRef, { role: 'admin' });
        }
      } catch (e) {
        console.error('Non-blocking profile update error:', e);
      }
    })();

    return user;
  } catch (error: any) {
    // Expected user-driven cancellation
    if (error.code === 'auth/popup-closed-by-user') {
      console.log('Login cancelled: User closed the login popup.');
      return null;
    }
    
    console.error('signInWithGoogle: Unexpected exception:', error);
    
    // If the auth SDK state is corrupted, force a reload to let the browser reset it
    if (error.message?.includes('INTERNAL ASSERTION FAILED')) {
        console.warn('Auth SDK state corrupted, reloading page...');
        window.location.reload();
        return null;
    }

    throw error;
  } finally {
    loginInProgress = false;
  }
};

export const logout = async () => {
  try {
    console.log('logout: Initiating logout');
    await signOut(auth);
    sessionStorage.clear();
  } catch (error) {
    console.error('logout error:', error);
  }
  // Let the AuthProvider update, which triggers a route change in App.tsx
};
