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
import { Plus, Minus, Trash2, Gift, Check, Truck } from 'lucide-react';

const card = { background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 32 } as const;
const gridContainer = { display: 'flex', gap: 32, flexDirection: 'row' as const };

export const VenderPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [cart, setCart] = useState<Cart | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [baskets, setBaskets] = useState<Basket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [activeTab, setActiveTab] = useState<'produtos' | 'cestas'>('produtos');
  const [deliveryModal, setDeliveryModal] = useState(false);
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [address, setAddress] = useState({ street: '', number: '', complement: '', district: '', city: '' });
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [observations, setObservations] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);

  const loadData = useCallback(async () => {
    setError('');
    if (!user?.storeId) { setLoading(false); return; }
    try {
      const [c, p, b] = await Promise.all([getOrCreateCart(user.storeId), getProducts(user.storeId), getBaskets(user.storeId)]);
      setCart(c);
      setProducts(p.filter((pr) => pr.active));
      setBaskets(b.filter((bk) => bk.active));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [user?.storeId]);

  useEffect(() => { loadData(); }, [loadData]);

  const saveItems = async (items: CartItem[]) => {
    if (!user?.storeId || !cart) return;
    await updateCart(user.storeId, cart.id, items);
    setCart({ ...cart, items });
  };

  const addProduct = (product: Product) => {
    const items = [...(cart?.items || [])];
    const existing = items.find((i) => i.productId === product.id);
    if (existing) { existing.quantity += 1; }
    else { items.push({ productId: product.id, productName: product.name, salePrice: product.salePrice, quantity: 1 }); }
    saveItems(items);
    showToast(`${product.name} adicionado`);
  };

  const addBasket = async (basket: Basket) => {
    const items = [...(cart?.items || [])];
    for (const bi of basket.items) {
      const product = products.find((p) => p.id === bi.productId);
      if (!product) continue;
      const existing = items.find((i) => i.productId === bi.productId);
      if (existing) { existing.quantity += bi.quantity; }
      else { items.push({ productId: product.id, productName: product.name, salePrice: product.salePrice, quantity: bi.quantity }); }
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

  const clearCart = () => { saveItems([]); showToast('Carrinho limpo'); };

  const total = (cart?.items || []).reduce((sum, i) => sum + i.salePrice * i.quantity, 0);
  const hasItems = (cart?.items.length || 0) > 0;

  const handleVender = async () => {
    if (!user?.storeId || !cart || !hasItems) return;
    const insuf = cart.items.some((item) => {
      const product = products.find((p) => p.id === item.productId);
      return product && product.quantity < item.quantity;
    });
    if (insuf) { showToast('Estoque insuficiente!', 'error'); return; }
    setFinalizing(true);
    try {
      await finalizeSaleDb(user.storeId, cart.id, cart.items, total);
      showToast('Venda finalizada!');
      await loadData();
    } catch (err: unknown) {
      showToast(`Erro: ${err instanceof Error ? err.message : 'Erro'}`, 'error');
    } finally { setFinalizing(false); }
  };

  const handleAgendar = () => setDeliveryModal(true);

  const confirmDelivery = async () => {
    if (!user?.storeId || !cart || !hasItems) return;
    if (!customer.name || !address.street || !deliveryDate || !deliveryTime) return;
    const insuf = cart.items.some((item) => {
      const product = products.find((p) => p.id === item.productId);
      return product && product.quantity < item.quantity;
    });
    if (insuf) { showToast('Estoque insuficiente!', 'error'); return; }
    setFinalizing(true);
    try {
      await finalizeSaleDb(user.storeId, cart.id, cart.items, total, { customer, address: { street: address.street, number: address.number, complement: address.complement, district: address.district, city: address.city }, deliveryDate, deliveryTime, observations });
      showToast('Entrega agendada!');
      setDeliveryModal(false);
      setCustomer({ name: '', phone: '' });
      setAddress({ street: '', number: '', complement: '', district: '', city: '' });
      setDeliveryDate('');
      setDeliveryTime('');
      setObservations('');
      await loadData();
    } catch (err: unknown) {
      showToast(`Erro: ${err instanceof Error ? err.message : 'Erro'}`, 'error');
    } finally { setFinalizing(false); }
  };

  if (loading) return <Loading />;
  if (error && products.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Vender</h1>
        <div style={card}>
          <p className="text-red-600 text-sm mb-2">{error}</p>
          <button onClick={loadData} className="text-indigo-600 text-sm font-medium">Tentar novamente</button>
        </div>
      </div>
    );
  }

  const filteredProducts = products.filter((p) => {
    const s = search.toLowerCase();
    const matchSearch = !s || p.name.toLowerCase().includes(s) || p.internalCode.toLowerCase().includes(s) || p.barcode.toLowerCase().includes(s);
    const matchCat = !filterCat || p.categories.includes(filterCat);
    return matchSearch && matchCat;
  });
  const categories = [...new Set(products.flatMap((p) => p.categories))];

  return (
    <div style={{ width: '100%', padding: '0 32px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-2xl font-bold text-slate-900">Vender</h1>
        <p className="text-slate-500 text-sm mt-1">{cart?.items.length || 0} itens no carrinho</p>
      </div>

      <div style={{ ...gridContainer, height: 'calc(100vh - 210px)' }} className="flex-col lg:flex-row">
        <div style={{ ...card, flex: 3, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexShrink: 0 }}>
            <h2 className="font-semibold text-slate-900">Carrinho</h2>
            {hasItems && (
              <button onClick={() => setClearConfirm(true)} className="inline-flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50">
                <Trash2 size={14} /> Limpar
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {!hasItems ? (
              <div style={{ padding: '24px 0' }}><EmptyState message="Carrinho vazio" /></div>
            ) : (
              <div>
                {cart?.items.map((item) => (
                  <div key={item.productId} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12, background: '#f8fafc', borderRadius: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <p className="text-sm font-medium text-slate-900">{item.productName}</p>
                      <p className="text-xs text-slate-500">{formatCurrency(item.salePrice)}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="p-1 rounded hover:bg-slate-200 text-slate-500"><Minus size={14} /></button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button onClick={() => updateQty(item.productId, item.quantity + 1)} className="p-1 rounded hover:bg-slate-200 text-slate-500"><Plus size={14} /></button>
                    </div>
                    <p className="text-sm font-semibold text-slate-900" style={{ width: 96, textAlign: 'right' }}>{formatCurrency(item.salePrice * item.quantity)}</p>
                    <button onClick={() => removeItem(item.productId)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16, flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span className="font-semibold text-slate-900">Total</span>
              <span className="font-bold text-lg text-slate-900">{formatCurrency(total)}</span>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
              <button onClick={handleVender} disabled={!hasItems || finalizing} style={{ flex: 1, padding: '14px 0', borderRadius: 8, background: '#16a34a', color: '#fff', fontSize: 14, fontWeight: 500, border: 'none', cursor: !hasItems ? 'not-allowed' : 'pointer', opacity: !hasItems ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Check size={18} />{finalizing ? 'Finalizando...' : 'Vender'}
              </button>
              <button onClick={handleAgendar} disabled={!hasItems || finalizing} style={{ flex: 1, padding: '14px 0', borderRadius: 8, background: '#4f46e5', color: '#fff', fontSize: 14, fontWeight: 500, border: 'none', cursor: !hasItems ? 'not-allowed' : 'pointer', opacity: !hasItems ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Truck size={18} />Agendar Entrega
              </button>
            </div>
          </div>
        </div>

        <div style={{ ...card, flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', margin: '-32px -32px 0', flexShrink: 0 }}>
            <button onClick={() => setActiveTab('produtos')} style={{ flex: 1, padding: '14px 0', textAlign: 'center', fontSize: 14, fontWeight: 500, background: 'none', border: 'none', borderBottom: activeTab === 'produtos' ? '2px solid #4f46e5' : '2px solid transparent', color: activeTab === 'produtos' ? '#4f46e5' : '#64748b', cursor: 'pointer' }}>Produtos</button>
            <button onClick={() => setActiveTab('cestas')} style={{ flex: 1, padding: '14px 0', textAlign: 'center', fontSize: 14, fontWeight: 500, background: 'none', border: 'none', borderBottom: activeTab === 'cestas' ? '2px solid #4f46e5' : '2px solid transparent', color: activeTab === 'cestas' ? '#4f46e5' : '#64748b', cursor: 'pointer' }}>Cestas</button>
          </div>

          {activeTab === 'produtos' && (
            <div style={{ display: 'flex', gap: 12, margin: '16px 0', flexShrink: 0 }}>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, código ou código de barras..." className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="">Todas</option>
                {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {activeTab === 'produtos' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredProducts.map((product) => (
                    <button key={product.id} onClick={() => addProduct(product)} className="text-left rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 group" style={{ background: 'none', cursor: 'pointer', padding: 16 }}>
                      <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatCurrency(product.salePrice)}</p>
                      <p className="text-xs text-slate-400">{product.quantity} un.</p>
                    </button>
                ))}
                {filteredProducts.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">Nenhum produto</div>}
              </div>
            ) : (
              <div style={{ height: '100%' }}>
                {baskets.map((basket) => (
                  <div key={basket.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Gift size={20} className="text-amber-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{basket.name}</p>
                        <p className="text-xs text-slate-500">{basket.items.length} itens</p>
                      </div>
                    </div>
                    <button onClick={() => addBasket(basket)} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700" style={{ border: 'none', cursor: 'pointer' }}>Adicionar</button>
                  </div>
                ))}
                {baskets.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">Nenhuma cesta</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={deliveryModal} onClose={() => setDeliveryModal(false)} title="Agendar Entrega" size="lg">
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
            <button onClick={() => setDeliveryModal(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50">Cancelar</button>
            <button onClick={confirmDelivery} disabled={finalizing || !customer.name || !address.street || !deliveryDate || !deliveryTime} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {finalizing ? 'Salvando...' : 'Confirmar Entrega'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={clearConfirm} onClose={() => setClearConfirm(false)} onConfirm={clearCart} title="Limpar Carrinho" message="Tem certeza que deseja remover todos os itens do carrinho?" confirmLabel="Limpar" danger />
    </div>
  );
};
