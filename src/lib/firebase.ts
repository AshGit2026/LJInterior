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

// Helper to get or generate persistent visitor ID for abuse tracking
export const getVisitorId = (): string => {
  try {
    let vid = localStorage.getItem('visitor_id');
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem('visitor_id', vid);
    }
    return vid;
  } catch {
    return 'unknown_visitor';
  }
};

let cachedClientIp: string | null = null;
export const fetchClientIp = async (): Promise<string> => {
  if (cachedClientIp) return cachedClientIp;
  try {
    const res = await fetch('/api/get-client-ip');
    if (res.ok) {
      const data = await res.json();
      if (data.ip) {
        cachedClientIp = data.ip;
        return data.ip;
      }
    }
  } catch (e) {
    console.warn('Failed to fetch client IP:', e);
  }
  return '';
};

export const logAccess = async (url: string) => {
  try {
    const visitorId = getVisitorId();
    const ip = await fetchClientIp();

    // Naver Search Ad / CPC parameters detection
    let isNaverAd = false;
    let naverKeyword = '';
    let naverAdId = '';
    let hasNaPm = false;

    try {
      const fullUrl = new URL(url, window.location.origin);
      const sp = fullUrl.searchParams;
      hasNaPm = sp.has('NaPm');
      naverKeyword = sp.get('n_keyword') || sp.get('n_query') || '';
      naverAdId = sp.get('n_ad') || '';
      const utmSource = (sp.get('utm_source') || '').toLowerCase();
      const referrer = (document.referrer || '').toLowerCase();

      if (
        hasNaPm ||
        Boolean(naverKeyword) ||
        Boolean(naverAdId) ||
        sp.has('n_media') ||
        (utmSource === 'naver' && (sp.get('utm_medium') || '').includes('cpc')) ||
        referrer.includes('ad.search.naver.com')
      ) {
        isNaverAd = true;
      }
    } catch {
      // Fallback string matching if URL parsing fails
      const lower = url.toLowerCase();
      if (lower.includes('napm=') || lower.includes('n_keyword=') || lower.includes('n_ad=')) {
        isNaverAd = true;
      }
    }

    await addDoc(collection(db, 'access_logs'), {
      timestamp: serverTimestamp(),
      url,
      referrer: document.referrer || '',
      userAgent: navigator.userAgent || '',
      visitorId,
      ip: ip || 'Unknown',
      isNaverAd,
      naverKeyword: naverKeyword || undefined,
      naverAdId: naverAdId || undefined,
      hasNaPm
    });
  } catch (firestoreError) {
    console.warn('Notice: Log access error:', firestoreError);
  }
};

export const getBlockedIps = async (): Promise<string[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'blocked_ips'));
    return querySnapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error('Error fetching blocked IPs:', error);
    return [];
  }
};

export const addBlockedIp = async (ip: string) => {
  try {
    await setDoc(doc(db, 'blocked_ips', ip), {
      blockedAt: serverTimestamp(),
    });
    // Sync with server in-memory blocklist
    fetch('/api/block-ip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip })
    }).catch(() => {});
  } catch (error) {
    console.error('Error blocking IP:', error);
  }
};
