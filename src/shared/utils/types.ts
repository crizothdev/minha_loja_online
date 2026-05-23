export interface User {
  id: string;
  name: string;
  email: string;
  storeId: string | null;
}

export interface Store {
  id: string;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  internalCode: string;
  barcode: string;
  categories: string[];
  quantity: number;
  costPrice: number;
  salePrice: number;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: string;
}

export interface BasketItem {
  productId: string;
  productName?: string;
  productPrice?: number;
  quantity: number;
}

export interface Basket {
  id: string;
  storeId: string;
  name: string;
  description: string;
  items: BasketItem[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  productName: string;
  salePrice: number;
  quantity: number;
}

export interface Cart {
  id: string;
  storeId: string;
  status: 'open' | 'closed';
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  storeId: string;
  cartId: string;
  items: CartItem[];
  total: number;
  createdAt: string;
  jsonData: string;
}

export interface DeliveryAddress {
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  zipCode?: string;
}

export interface DeliveryCustomer {
  name: string;
  phone: string;
}

export type DeliveryStatus = 'pending' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface Delivery {
  id: string;
  storeId: string;
  saleId: string;
  customer: DeliveryCustomer;
  address: DeliveryAddress;
  deliveryDate: string;
  deliveryTime: string;
  status: DeliveryStatus;
  items: CartItem[];
  observations: string;
  createdAt: string;
  updatedAt: string;
}

export type StockMovementType = 'entry' | 'exit' | 'sale' | 'adjustment';

export interface StockMovement {
  id: string;
  storeId: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  quantity: number;
  reason: string;
  createdAt: string;
  jsonData: string;
}

export type ExpenseType = 'operacional' | 'nao_operacional';

export interface Expense {
  id: string;
  storeId: string;
  description: string;
  value: number;
  type: ExpenseType;
  reason: string;
  createdAt: string;
}

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'Pendente',
  preparing: 'Preparando',
  ready: 'Pronto',
  out_for_delivery: 'Saiu para Entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

export const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-blue-100 text-blue-800',
  ready: 'bg-green-100 text-green-800',
  out_for_delivery: 'bg-purple-100 text-purple-800',
  delivered: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};
