import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';

export async function loadChart(patientId) {
  const ref = doc(db, 'charts', patientId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function saveChart(patientId, { stage, presence, treatments }) {
  const ref = doc(db, 'charts', patientId);
  await setDoc(ref, { stage, presence, treatments, updatedAt: serverTimestamp() }, { merge: true });
}
