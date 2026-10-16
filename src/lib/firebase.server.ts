import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

console.log("Firebase config project ID:", firebaseConfig.projectId);
if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

export const db = getFirestore(getApps()[0], (firebaseConfig as any).firestoreDatabaseId);
console.log("Firebase Admin initialized");
