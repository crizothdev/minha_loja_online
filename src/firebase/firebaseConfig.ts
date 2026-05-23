import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAEYEhx0J98Hpp1Xmbo8XYGTtFpka48_tQ',
  authDomain: 'minha-loja-online-ae0dd.firebaseapp.com',
  projectId: 'minha-loja-online-ae0dd',
  storageBucket: 'minha-loja-online-ae0dd.firebasestorage.app',
  messagingSenderId: '34116832623',
  appId: '1:34116832623:web:53eb5ee10fce9e2260ac9a',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
