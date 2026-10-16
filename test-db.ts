import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json';

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

async function testConnection() {
    try {
        const db = getFirestore(getApps()[0], firebaseConfig.firestoreDatabaseId);
        const snapshot = await db.collection("blocked_ips").get();
        console.log("Successfully connected and read blocked_ips! Documents:", snapshot.size);
    } catch (e) {
        console.error("Error reading blocked_ips:", e);
    }
}
testConnection();
