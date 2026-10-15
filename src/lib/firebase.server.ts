import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const filteredConfig = Object.fromEntries(
  Object.entries(firebaseConfig).filter(([_, v]) => v !== "")
);

const app = initializeApp(filteredConfig);
export const db = initializeFirestore(app, {}, (filteredConfig as any).firestoreDatabaseId);
