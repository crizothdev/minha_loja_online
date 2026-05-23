import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../shared/hooks/useAuth';
import { getOrCreateCart, updateCart, getProducts, getBaskets, finalizeSale as finalizeSaleDb } from '../../firebase/firestore';
import { Modal } from '../../shared/components/Modal';
import { Input } from '../../shared/components/Input';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { Loading } from '../../shared/components/Loading';
import { EmptyState } from '../../shared/components/EmptyState';
import { useToast } from '../../shared/components/Toast';
import { formatCurrency } from '../../shared/utils/formatters';
import type { CartItem, Product, Basket, Cart } from '../../shared/utils/types';
import { Plus, Minus, Trash2, Gift, Truck, Check } from 'lucide-react';

export const CartPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [cart, setCart] = useState<Cart | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [baskets, setBaskets] = useState<Basket[]>([]);
  const [loading, setLoading] = useState(true);
  const [productModal, setProductModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [deliveryModal, setDeliveryModal] = useState(false);
  const [isDelivery, setIsDelivery] = useState<boolean | null>(null);
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [address, setAddress] = useState({ street: '', number: '', complement: '', district: '', city: '' });
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [observations, setObservations] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);

  const loadCart = useCallback(async () => {
    if (!user?.storeId) return;
    const c = await getOrCreateCart(user.storeId);
    setCart(c);
    return c;
  }, [user]);

  const loadData = useCallback(async () => {
    if (!user?.storeId) return;
    const [c, p, b] = await Promise.all([getOrCreateCart(user.storeId), getProducts(user.storeId), getBaskets(user.storeId)]);
    setCart(c);
    setProducts(p.filter((pr) => pr.active));
    setBaskets(b.filter((bk) => bk.active));
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const saveItems = async (items: CartItem[]) => {
    if (!user?.storeId || !cart) return;
    await updateCart(user.storeId, cart.id, items);
    setCart({ ...cart, items });
  };

  const addProduct = (product: Product) => {
    const items = [...(cart?.items || [])];
    const existing = items.find((i) => i.productId === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      items.push({ productId: product.id, productName: product.name, salePrice: product.salePrice, quantity: 1 });
    }
    saveItems(items);
    showToast(`${product.name} adicionado`);
  };

  const addBasket = async (basket: Basket) => {
    const items = [...(cart?.items || [])];
    for (const bi of basket.items) {
      const product = products.find((p) => p.id === bi.productId);
      if (!product) continue;
      const existing = items.find((i) => i.productId === bi.productId);
      if (existing) {
        existing.quantity += bi.quantity;
      } else {
        items.push({ productId: product.id, productName: product.name, salePrice: product.salePrice, quantity: bi.quantity });
      }
    }
    saveItems(items);
    showToast(`Cesta "${basket.name}" adicionada`);
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty < 1) return;
    saveItems((cart?.items || []).map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)));
  };

  const removeItem = (productId: string) => {
    saveItems((cart?.items || []).filter((i) => i.productId !== productId));
    showToast('Item removido');
  };

  const clearCart = () => {
    saveItems([]);
    showToast('Carrinho limpo');
  };

  const total = (cart?.items || []).reduce((sum, i) => sum + i.salePrice * i.quantity, 0);

  const handleFinalize = () => {
    setIsDelivery(null);
    setDeliveryModal(true);
  };

  const confirmFinalize = async () => {
    if (!user?.storeId || !cart) return;
    if (isDelivery === null) return;

    const hasInsufficient = cart.items.some((item) => {
      const product = products.find((p) => p.id === item.productId);
      return product && product.quantity < item.quantity;
    });

    if (hasInsufficient) {
      showToast('Estoque insuficiente para alguns itens!', 'error');
      return;
    }

    setFinalizing(true);
    try {
      await finalizeSaleDb(
        user.storeId,
        cart.id,
        cart.items,
        total,
        isDelivery
          ? {
              customer,
              address: { street: address.street, number: address.number, complement: address.complement, district: address.district, city: address.city },
              deliveryDate,
              deliveryTime,
              observations,
            }
          : undefined
      );
      showToast('Venda finalizada com sucesso!');
      setDeliveryModal(false);
      await loadCart();
      await loadData();
    } catch {
      showToast('Erro ao finalizar venda', 'error');
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) return <Loading />;

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || p.categories.includes(filterCat);
    return matchSearch && matchCat;
  });

  const categories = [...new Set(products.flatMap((p) => p.categories))];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Carrinho</h1>
          <p className="text-slate-500 text-sm mt-1">{cart?.items.length || 0} itens</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-4">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <button onClick={() => setProductModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                <Plus size={18} /> Adicionar Produto
              </button>
              {(cart?.items.length || 0) > 0 && (
                <button onClick={() => setClearConfirm(true)} className="inline-flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 size={18} /> Limpar Carrinho
                </button>
              )}
            </div>

            {!cart?.items.length ? (
              <EmptyState message="Carrinho vazio" />
            ) : (
              <div className="space-y-2">
                {cart.items.map((item) => (
                  <div key={item.productId} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{item.productName}</p>
                      <p className="text-xs text-slate-500">{formatCurrency(item.salePrice)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="p-1 rounded hover:bg-slate-200 text-slate-500">
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button onClick={() => updateQty(item.productId, item.quantity + 1)} className="p-1 rounded hover:bg-slate-200 text-slate-500">
                        <Plus size={14} />
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 w-24 text-right">{formatCurrency(item.salePrice * item.quantity)}</p>
                    <button onClick={() => removeItem(item.productId)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sticky top-8">
            <h3 className="font-semibold text-slate-900 mb-4">Resumo</h3>
            <div className="space-y-2 mb-4">
              {cart?.items.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-slate-600">{item.productName} x{item.quantity}</span>
                  <span className="text-slate-900">{formatCurrency(item.salePrice * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 pt-3 mb-4">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-900">Total</span>
                <span className="font-bold text-lg text-slate-900">{formatCurrency(total)}</span>
              </div>
            </div>
            <button
              onClick={handleFinalize}
              disabled={!cart?.items.length}
              className="w-full py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check size={18} />
              Finalizar Compra
            </button>
          </div>
        </div>
      </div>

      <Modal open={productModal} onClose={() => setProductModal(false)} title="Adicionar Produtos" size="lg">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por nome..."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <h4 className="text-sm font-medium text-slate-700 mb-2">Cestas</h4>
          <div className="flex flex-wrap gap-2">
            {baskets.map((basket) => (
              <button
                key={basket.id}
                onClick={() => { addBasket(basket); setProductModal(false); }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 text-sm transition-colors"
              >
                <Gift size={16} />
                {basket.name}
              </button>
            ))}
            {baskets.length === 0 && <p className="text-xs text-slate-400">Nenhuma cesta disponível</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-y-auto">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => { addProduct(product); }}
              className="text-left p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
            >
              <p className="text-sm font-medium text-slate-900 group-hover:text-indigo-700">{product.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{formatCurrency(product.salePrice)}</p>
              <p className="text-xs text-slate-400">{product.quantity} un.</p>
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={deliveryModal} onClose={() => setDeliveryModal(false)} title="Finalizar Venda" size="lg">
        {isDelivery === null ? (
          <div className="text-center py-6">
            <p className="text-slate-600 mb-6">Esta venda é para entrega?</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => setIsDelivery(true)} className="flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
                <Truck size={18} /> Sim, é entrega
              </button>
              <button onClick={() => setIsDelivery(false)} className="flex items-center gap-2 px-6 py-3 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50">
                <Check size={18} /> Não, só venda
              </button>
            </div>
          </div>
        ) : isDelivery ? (
          <div className="space-y-4">
            <h4 className="font-medium text-slate-900">Dados do Cliente</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Nome do Cliente" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} required />
              <Input label="Telefone" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} required />
            </div>

            <h4 className="font-medium text-slate-900 pt-2">Endereço de Entrega</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2"><Input label="Rua" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} required /></div>
              <Input label="Número" value={address.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} required />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Complemento" value={address.complement} onChange={(e) => setAddress({ ...address, complement: e.target.value })} />
              <Input label="Bairro" value={address.district} onChange={(e) => setAddress({ ...address, district: e.target.value })} required />
              <Input label="Cidade" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} required />
            </div>

            <h4 className="font-medium text-slate-900 pt-2">Data e Horário</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Data de Entrega" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} required />
              <Input label="Horário" type="time" value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} required />
            </div>

            <Input label="Observações" value={observations} onChange={(e) => setObservations(e.target.value)} />

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button onClick={() => setIsDelivery(null)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50">Voltar</button>
              <button
                onClick={confirmFinalize}
                disabled={finalizing || !customer.name || !address.street || !deliveryDate || !deliveryTime}
                className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {finalizing ? 'Finalizando...' : `Finalizar - ${formatCurrency(total)}`}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 space-y-4">
            <div className="text-left bg-slate-50 rounded-lg p-4 max-h-60 overflow-y-auto space-y-1">
              {cart?.items.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-slate-600">{item.productName} x{item.quantity}</span>
                  <span className="text-slate-900 font-medium">{formatCurrency(item.salePrice * item.quantity)}</span>
                </div>
              ))}
            </div>
            <p className="font-bold text-lg text-slate-900">Total: {formatCurrency(total)}</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setIsDelivery(null)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50">Voltar</button>
              <button
                onClick={confirmFinalize}
                disabled={finalizing}
                className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {finalizing ? 'Finalizando...' : 'Confirmar Venda'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={clearConfirm}
        onClose={() => setClearConfirm(false)}
        onConfirm={clearCart}
        title="Limpar Carrinho"
        message="Tem certeza que deseja remover todos os itens do carrinho?"
        confirmLabel="Limpar"
        danger
      />
    </div>
  );
};
