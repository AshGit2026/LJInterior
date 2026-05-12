import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, doc, setDoc, getDoc, collection, query, where, onSnapshot, addDoc, updateDoc, serverTimestamp, getDocFromServer, getDocs, terminate, clearIndexedDbPersistence, orderBy, limit } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const filteredConfig = Object.fromEntries(
  Object.entries(firebaseConfig).filter(([_, v]) => v !== "")
);

const app = initializeApp(filteredConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
}, (filteredConfig as any).firestoreDatabaseId);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

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
  
  // If the error is "Missing or insufficient permissions", we definitely want to throw 
  // so the system can potentially notice it, but we should be careful not to crash 
  // without reason. However, in this framework, throwing is often how we report to the user/system.
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}
testConnection();

// Auth Helpers
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Create/Update user profile in Firestore
    const userRef = doc(db, 'users', user.uid);
    let userSnap;
    try {
      userSnap = await getDoc(userRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    }
    
    const isAdmin = user.email === 'gjtnlfnl@gmail.com';
    if (userSnap && !userSnap.exists()) {
      try {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: isAdmin ? 'admin' : 'user',
          createdAt: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
      }
    } else if (isAdmin && userSnap && userSnap.data().role !== 'admin') {
      // Force update role to admin if it's the designated admin email but role is not admin
      try {
        await updateDoc(userRef, { role: 'admin' });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
    return user;
  } catch (error) {
    if (error instanceof Error && error.message.includes('{"error"')) {
      throw error; // Re-throw structured firestore error
    }
    console.error('Login Error:', error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
    // Terminate and clear cache for security as requested
    await terminate(db);
    await clearIndexedDbPersistence(db);
    // Reload to re-initialize everything fresh
    window.location.href = '/';
  } catch (error) {
    console.error('Logout error:', error);
    // Fallback if full clear fails
    await signOut(auth);
    window.location.href = '/';
  }
};
