import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import type { User, Store } from '../shared/utils/types';

export const loginWithEmail = async (email: string, password: string): Promise<FirebaseUser> => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  const userDoc = await getDoc(doc(db, 'users', result.user.uid));
  if (!userDoc.exists()) {
    await setDoc(doc(db, 'users', result.user.uid), {
      name: result.user.email?.split('@')[0] || '',
      email: result.user.email || '',
      storeId: null,
    });
  }
  return result.user;
};

export const registerWithEmail = async (
  email: string,
  password: string,
  name: string
): Promise<FirebaseUser> => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'users', result.user.uid), {
    name,
    email,
    storeId: null,
  });
  return result.user;
};

export const loginWithGoogle = async (): Promise<FirebaseUser> => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const userDoc = await getDoc(doc(db, 'users', result.user.uid));
  if (!userDoc.exists()) {
    await setDoc(doc(db, 'users', result.user.uid), {
      name: result.user.displayName || '',
      email: result.user.email || '',
      storeId: null,
    });
  }
  return result.user;
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
};

export const getCurrentUser = async (uid: string, firebaseUser?: FirebaseUser): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() } as User;
    }
    if (firebaseUser) {
      const newUser = {
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
        email: firebaseUser.email || '',
        storeId: null as string | null,
      };
      await setDoc(doc(db, 'users', uid), { ...newUser, storeId: null });
      return { id: uid, ...newUser };
    }
  } catch (err) {
    console.error('Erro ao ler/criar usuário:', err);
  }
  return null;
};

export const updateUserStore = async (uid: string, storeId: string): Promise<void> => {
  await updateDoc(doc(db, 'users', uid), { storeId });
};

export const onAuthChange = (callback: (user: FirebaseUser | null) => void): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

export const createStore = async (name: string, phone: string, email: string): Promise<Store> => {
  const storeRef = doc(collection(db, 'stores'));
  const store: Store = {
    id: storeRef.id,
    name,
    phone,
    email,
    createdAt: new Date().toISOString(),
  };
  await setDoc(storeRef, store);
  return store;
};

export const getStore = async (storeId: string): Promise<Store | null> => {
  const storeDoc = await getDoc(doc(db, 'stores', storeId));
  if (!storeDoc.exists()) return null;
  return { id: storeDoc.id, ...storeDoc.data() } as Store;
};

export const updateStore = async (storeId: string, data: Partial<Store>): Promise<void> => {
  await updateDoc(doc(db, 'stores', storeId), { ...data });
};
