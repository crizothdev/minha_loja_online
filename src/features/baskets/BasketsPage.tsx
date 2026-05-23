import { useState, useEffect } from 'react';
import { useAuth } from '../../shared/hooks/useAuth';
import { getBaskets, createBasket, updateBasket, getProducts } from '../../firebase/firestore';
import { Modal } from '../../shared/components/Modal';
import { Input } from '../../shared/components/Input';
import { Loading } from '../../shared/components/Loading';
import { EmptyState } from '../../shared/components/EmptyState';
import { useToast } from '../../shared/components/Toast';
import { formatCurrency } from '../../shared/utils/formatters';
import type { Basket, BasketItem, Product } from '../../shared/utils/types';
import { Plus, Edit2, Gift, X } from 'lucide-react';

interface BasketForm {
  name: string;
  description: string;
  items: BasketItem[];
  active: boolean;
}

const emptyForm: BasketForm = { name: '', description: '', items: [], active: true };

export const BasketsPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [baskets, setBaskets] = useState<Basket[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BasketForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);

  const loadData = async () => {
    if (!user?.storeId) return;
    const [b, p] = await Promise.all([getBaskets(user.storeId), getProducts(user.storeId)]);
    setBaskets(b);
    setProducts(p.filter((p) => p.active));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (basket: Basket) => {
    setEditingId(basket.id);
    setForm({ name: basket.name, description: basket.description, items: basket.items, active: basket.active });
    setModalOpen(true);
  };

  const addProductToBasket = (product: Product) => {
    const existing = form.items.find((i) => i.productId === product.id);
    if (existing) return;
    setForm({
      ...form,
      items: [...form.items, { productId: product.id, productName: product.name, productPrice: product.salePrice, quantity: 1 }],
    });
    setProductSearch('');
    setShowProductPicker(false);
  };

  const removeItem = (productId: string) => {
    setForm({ ...form, items: form.items.filter((i) => i.productId !== productId) });
  };

  const updateItemQty = (productId: string, quantity: number) => {
    setForm({
      ...form,
      items: form.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
    });
  };

  const handleSave = async () => {
    if (!user?.storeId) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateBasket(user.storeId, editingId, form);
        showToast('Cesta atualizada!');
      } else {
        await createBasket(user.storeId, { ...form, storeId: user.storeId });
        showToast('Cesta criada!');
      }
      setModalOpen(false);
      await loadData();
    } catch {
      showToast('Erro ao salvar cesta', 'error');
    } finally {
      setSaving(false);
    }
  };

  const calculateTotal = (items: BasketItem[]) => {
    return items.reduce((sum, i) => sum + (i.productPrice || 0) * i.quantity, 0);
  };

  if (loading) return <Loading />;

  return (
    <div style={{ padding: '0 32px' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cestas</h1>
          <p className="text-slate-500 text-sm mt-1">Monte cestas de produtos</p>
        </div>
        <button onClick={openCreate} style={{ padding: '14px 16px' }} className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shrink-0">
          <Plus size={18} /> Nova Cesta
        </button>
      </div>

      {baskets.length === 0 ? (
        <EmptyState message="Nenhuma cesta cadastrada" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {baskets.map((basket) => (
            <div key={basket.id} className="bg-white rounded-xl shadow-sm border border-slate-200" style={{ padding: 24 }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Gift size={20} className="text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900">{basket.name}</h3>
                    <p className="text-xs text-slate-400">{basket.items.length} itens</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(basket)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600">
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>
              {basket.description && <p className="text-sm text-slate-500 mb-3">{basket.description}</p>}
              <div className="space-y-1.5 mb-3">
                {basket.items.slice(0, 4).map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span className="text-slate-600">{item.productName}</span>
                    <span className="text-slate-400 text-xs">{item.quantity}x</span>
                  </div>
                ))}
                {basket.items.length > 4 && <p className="text-xs text-slate-400">+{basket.items.length - 4} itens</p>}
              </div>
              <p className="text-sm font-semibold text-slate-900">{formatCurrency(calculateTotal(basket.items))}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Cesta' : 'Nova Cesta'} size="lg">
        <div className="space-y-4">
          <Input label="Nome da Cesta" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Produtos</label>
              <button type="button" onClick={() => setShowProductPicker(!showProductPicker)} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                + Adicionar Produto
              </button>
            </div>

            {showProductPicker && (
              <div className="mb-3 border border-slate-200 rounded-lg" style={{ padding: 24 }}>
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Buscar produto..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                  autoFocus
                />
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {products
                    .filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()) && !form.items.find((i) => i.productId === p.id))
                    .map((p) => (
                      <button key={p.id} onClick={() => addProductToBasket(p)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-sm text-slate-700">
                        {p.name} - {formatCurrency(p.salePrice)}
                      </button>
                    ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {form.items.map((item) => (
                <div key={item.productId} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{item.productName}</p>
                    <p className="text-xs text-slate-500">{formatCurrency(item.productPrice || 0)}</p>
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItemQty(item.productId, Number(e.target.value))}
                    className="w-16 px-2 py-1 rounded border border-slate-200 text-sm text-center"
                  />
                  <button onClick={() => removeItem(item.productId)} className="p-1 text-slate-400 hover:text-red-500">
                    <X size={16} />
                  </button>
                </div>
              ))}
              {form.items.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Nenhum produto adicionado</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button onClick={() => setModalOpen(false)} style={{ padding: '14px 16px' }} className="rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50">Cancelar</button>
            <button onClick={handleSave} disabled={saving || !form.name} style={{ padding: '14px 16px' }} className="rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
