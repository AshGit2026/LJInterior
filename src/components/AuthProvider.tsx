import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  userProfile: any | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthProvider: Setting up onAuthStateChanged');
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      console.log('AuthProvider: Auth state changed:', currentUser?.email || 'null');
      setUser(currentUser);
      
      // We set loading to false as soon as we know the base auth state (logged in or out)
      // This ensures the UI is never stuck "loading" even if the profile fetch is slow.
      setLoading(false);
      
      if (!currentUser) {
        setUserProfile(null);
      }
    });

    // Fallback: Ensure loading always clears even if Firebase is sluggish
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => {
      unsubscribeAuth();
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    console.log('AuthProvider: Setting up profile snapshot for:', user.uid);
    let unsubscribeProfile: (() => void) | undefined;

    try {
      unsubscribeProfile = onSnapshot(
        doc(db, 'users', user.uid),
        (doc) => {
          console.log('AuthProvider: Profile snapshot received. Exists:', doc.exists());
          if (doc.exists()) {
            setUserProfile(doc.data());
          }
        },
        (error) => {
          if (error.message?.includes('shutting down')) return;
          console.error('AuthProvider profile snapshot error:', error);
          // Non-blocking error handling
        }
      );
    } catch (error) {
      console.error('AuthProvider profile setup error:', error);
    }

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [user]);

  const value = {
    user,
    userProfile,
    loading,
    isAdmin: userProfile?.role === 'admin' || user?.email === 'gjtnlfnl@gmail.com',
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
