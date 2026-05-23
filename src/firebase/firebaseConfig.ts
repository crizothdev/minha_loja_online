import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missing = Object.entries(firebaseConfig)
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length > 0) {
  document.getElementById('root')!.innerHTML = `
    <div style="max-width:500px;margin:80px auto;padding:24px;font-family:sans-serif;text-align:center">
      <h2 style="color:#dc2626">Configuração do Firebase incompleta</h2>
      <p style="color:#64748b">Variáveis de ambiente ausentes: ${missing.join(', ')}</p>
    </div>`;
  throw new Error(`Firebase config missing: ${missing.join(', ')}`);
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
