import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import type {
  Product,
  Category,
  Basket,
  Cart,
  CartItem,
  Sale,
  Delivery,
  StockMovement,
  Expense,
  ExpenseType,
} from '../shared/utils/types';

const coll = (storeId: string, name: string) => collection(db, 'stores', storeId, name);
const ref = (storeId: string, name: string, id: string) => doc(db, 'stores', storeId, name, id);

export const getProducts = async (storeId: string): Promise<Product[]> => {
  const q = query(coll(storeId, 'products'), orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
};

export const getProduct = async (storeId: string, id: string): Promise<Product | null> => {
  const snapshot = await getDoc(ref(storeId, 'products', id));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Product;
};

export const createProduct = async (storeId: string, data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> => {
  const productRef = doc(coll(storeId, 'products'));
  const now = new Date().toISOString();
  const product: Product = { id: productRef.id, ...data, createdAt: now, updatedAt: now };
  await setDoc(productRef, product);
  return product;
};

export const updateProduct = async (storeId: string, id: string, data: Partial<Product>): Promise<void> => {
  await updateDoc(ref(storeId, 'products', id), { ...data, updatedAt: new Date().toISOString() });
};

export const deleteProduct = async (storeId: string, id: string): Promise<void> => {
  await deleteDoc(ref(storeId, 'products', id));
};

export const getCategories = async (storeId: string): Promise<Category[]> => {
  const q = query(coll(storeId, 'categories'), orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
};

export const createCategory = async (storeId: string, name: string): Promise<Category> => {
  const catRef = doc(coll(storeId, 'categories'));
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const now = new Date().toISOString();
  const category: Category = { id: catRef.id, storeId, name, slug, active: true, createdAt: now };
  await setDoc(catRef, category);
  return category;
};

export const updateCategory = async (storeId: string, id: string, data: Partial<Category>): Promise<void> => {
  await updateDoc(ref(storeId, 'categories', id), data);
};

export const getBaskets = async (storeId: string): Promise<Basket[]> => {
  const q = query(coll(storeId, 'baskets'), orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Basket));
};

export const getBasket = async (storeId: string, id: string): Promise<Basket | null> => {
  const snapshot = await getDoc(ref(storeId, 'baskets', id));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Basket;
};

export const createBasket = async (storeId: string, data: Omit<Basket, 'id' | 'createdAt' | 'updatedAt'>): Promise<Basket> => {
  const basketRef = doc(coll(storeId, 'baskets'));
  const now = new Date().toISOString();
  const basket: Basket = { id: basketRef.id, ...data, createdAt: now, updatedAt: now };
  await setDoc(basketRef, basket);
  return basket;
};

export const updateBasket = async (storeId: string, id: string, data: Partial<Basket>): Promise<void> => {
  await updateDoc(ref(storeId, 'baskets', id), { ...data, updatedAt: new Date().toISOString() });
};

export const getOpenCart = async (storeId: string): Promise<Cart | null> => {
  const q = query(coll(storeId, 'carts'), where('status', '==', 'open'));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Cart;
};

export const getOrCreateCart = async (storeId: string): Promise<Cart> => {
  const existing = await getOpenCart(storeId);
  if (existing) return existing;
  const cartRef = doc(coll(storeId, 'carts'));
  const now = new Date().toISOString();
  const cart: Cart = { id: cartRef.id, storeId, status: 'open', items: [], createdAt: now, updatedAt: now };
  await setDoc(cartRef, cart);
  return cart;
};

export const updateCart = async (storeId: string, cartId: string, items: CartItem[]): Promise<void> => {
  await updateDoc(ref(storeId, 'carts', cartId), { items, updatedAt: new Date().toISOString() });
};

export const finalizeSale = async (
  storeId: string,
  cartId: string,
  items: CartItem[],
  total: number,
  delivery?: { customer: { name: string; phone: string }; address: { street: string; number: string; complement?: string; district: string; city: string }; deliveryDate: string; deliveryTime: string; observations?: string }
): Promise<string> => {
  const batch = writeBatch(db);

  const saleRef = doc(coll(storeId, 'sales'));
  const sale: Sale = {
    id: saleRef.id,
    storeId,
    cartId,
    items,
    total,
    createdAt: new Date().toISOString(),
    jsonData: JSON.stringify({ items, total }),
  };
  batch.set(saleRef, sale);

  batch.update(ref(storeId, 'carts', cartId), { status: 'closed', items: [], updatedAt: new Date().toISOString() });

  for (const item of items) {
    const productRef = ref(storeId, 'products', item.productId);
    const productSnap = await getDoc(productRef);
    if (productSnap.exists()) {
      const product = productSnap.data() as Product;
      batch.update(productRef, { quantity: product.quantity - item.quantity, updatedAt: new Date().toISOString() });

      const movementRef = doc(coll(storeId, 'stockMovements'));
      const movement: StockMovement = {
        id: movementRef.id,
        storeId,
        productId: item.productId,
        productName: item.productName,
        type: 'sale',
        quantity: -item.quantity,
        reason: `Venda #${saleRef.id}`,
        createdAt: new Date().toISOString(),
        jsonData: JSON.stringify({ saleId: saleRef.id }),
      };
      batch.set(movementRef, movement);
    }
  }

  if (delivery) {
    const deliveryRef = doc(coll(storeId, 'deliveries'));
    const now = new Date().toISOString();
    const deliveryDoc: Delivery = {
      id: deliveryRef.id,
      storeId,
      saleId: saleRef.id,
      customer: delivery.customer,
      address: delivery.address,
      deliveryDate: delivery.deliveryDate,
      deliveryTime: delivery.deliveryTime,
      status: 'pending',
      items,
      observations: delivery.observations || '',
      createdAt: now,
      updatedAt: now,
    };
    batch.set(deliveryRef, deliveryDoc);
  }

  await batch.commit();
  return saleRef.id;
};

export const getSales = async (storeId: string): Promise<Sale[]> => {
  const q = query(coll(storeId, 'sales'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Sale));
};

export const getDeliveries = async (storeId: string): Promise<Delivery[]> => {
  const q = query(coll(storeId, 'deliveries'), orderBy('deliveryDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Delivery));
};

export const getDelivery = async (storeId: string, id: string): Promise<Delivery | null> => {
  const snapshot = await getDoc(ref(storeId, 'deliveries', id));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Delivery;
};

export const updateDelivery = async (storeId: string, id: string, data: Partial<Delivery>): Promise<void> => {
  await updateDoc(ref(storeId, 'deliveries', id), { ...data, updatedAt: new Date().toISOString() });
};

export const getStockMovements = async (storeId: string): Promise<StockMovement[]> => {
  const q = query(coll(storeId, 'stockMovements'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as StockMovement));
};

export const createStockMovement = async (
  storeId: string,
  productId: string,
  productName: string,
  type: StockMovement['type'],
  quantity: number,
  reason: string
): Promise<void> => {
  const movementRef = doc(coll(storeId, 'stockMovements'));
  const movement: StockMovement = {
    id: movementRef.id,
    storeId,
    productId,
    productName,
    type,
    quantity,
    reason,
    createdAt: new Date().toISOString(),
    jsonData: JSON.stringify({}),
  };
  await setDoc(movementRef, movement);
  if (type === 'entry' || type === 'adjustment') {
    const productSnap = await getDoc(ref(storeId, 'products', productId));
    if (productSnap.exists()) {
      const product = productSnap.data() as Product;
      const newQty = type === 'entry' ? product.quantity + quantity : quantity;
      await updateDoc(ref(storeId, 'products', productId), { quantity: newQty, updatedAt: new Date().toISOString() });
    }
  }
};

export const getExpenses = async (storeId: string): Promise<Expense[]> => {
  const q = query(coll(storeId, 'expenses'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Expense));
};

export const createExpense = async (
  storeId: string,
  data: { description: string; value: number; type: ExpenseType; reason: string }
): Promise<Expense> => {
  const expenseRef = doc(coll(storeId, 'expenses'));
  const now = new Date().toISOString();
  const expense: Expense = {
    id: expenseRef.id,
    storeId,
    description: data.description,
    value: data.value,
    type: data.type,
    reason: data.reason,
    createdAt: now,
  };
  await setDoc(expenseRef, expense);
  return expense;
};
