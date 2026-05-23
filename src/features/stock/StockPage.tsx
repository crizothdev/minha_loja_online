import { useState, useEffect } from 'react';
import { useAuth } from '../../shared/hooks/useAuth';
import { getStockMovements, getProducts, createStockMovement } from '../../firebase/firestore';
import { Modal } from '../../shared/components/Modal';
import { Input } from '../../shared/components/Input';
import { Select } from '../../shared/components/Select';
import { Loading } from '../../shared/components/Loading';
import { EmptyState } from '../../shared/components/EmptyState';
import { useToast } from '../../shared/components/Toast';
import { formatDateTime } from '../../shared/utils/formatters';
import type { StockMovement, Product, StockMovementType } from '../../shared/utils/types';
import { ArrowDown, ArrowUp, Plus, BarChart3 } from 'lucide-react';

const MOVEMENT_LABELS: Record<StockMovementType, string> = {
  entry: 'Entrada',
  exit: 'Saída',
  sale: 'Venda',
  adjustment: 'Ajuste',
};

const MOVEMENT_COLORS: Record<StockMovementType, string> = {
  entry: 'text-green-600 bg-green-50',
  exit: 'text-red-600 bg-red-50',
  sale: 'text-blue-600 bg-blue-50',
  adjustment: 'text-amber-600 bg-amber-50',
};

export const StockPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [type, setType] = useState<StockMovementType>('entry');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    if (!user?.storeId) return;
    const [m, p] = await Promise.all([getStockMovements(user.storeId), getProducts(user.storeId)]);
    setMovements(m);
    setProducts(p.filter((pr) => pr.active));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  const handleAddMovement = async () => {
    if (!user?.storeId || !productId || quantity <= 0) return;
    setSaving(true);
    try {
      const product = products.find((p) => p.id === productId);
      if (!product) throw new Error('Produto não encontrado');
      const effectiveQty = type === 'exit' ? -quantity : quantity;
      await createStockMovement(user.storeId, productId, product.name, type, effectiveQty, reason || `${MOVEMENT_LABELS[type]} manual`);
      showToast('Movimentação registrada!');
      setModalOpen(false);
      setProductId('');
      setQuantity(1);
      setReason('');
      await loadData();
    } catch {
      showToast('Erro ao registrar movimentação', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  const entrySum = movements.filter((m) => m.type === 'entry').reduce((s, m) => s + m.quantity, 0);
  const exitSum = movements.filter((m) => m.type === 'exit' || m.type === 'sale').reduce((s, m) => s + Math.abs(m.quantity), 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Movimentações de Estoque</h1>
          <p className="text-slate-500 text-sm mt-1">{movements.length} movimentações registradas</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shrink-0">
          <Plus size={18} /> Nova Movimentação
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <ArrowDown size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Entradas</p>
              <p className="text-lg font-bold text-slate-900">{entrySum}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <ArrowUp size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Saídas</p>
              <p className="text-lg font-bold text-slate-900">{exitSum}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <BarChart3 size={20} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Registros</p>
              <p className="text-lg font-bold text-slate-900">{movements.length}</p>
            </div>
          </div>
        </div>
      </div>

      {movements.length === 0 ? (
        <EmptyState message="Nenhuma movimentação registrada" />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Produto</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Tipo</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Qtd.</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Motivo</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {movements.map((mov) => (
                  <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      <p className="text-sm font-medium text-slate-900">{mov.productName}</p>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${MOVEMENT_COLORS[mov.type]}`}>
                        {MOVEMENT_LABELS[mov.type]}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-sm font-medium ${mov.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {mov.quantity > 0 ? '+' : ''}{mov.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">{mov.reason}</td>
                    <td className="px-6 py-3 text-sm text-slate-500">{formatDateTime(mov.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Movimentação" size="sm">
        <div className="space-y-4">
          <Select
            label="Tipo"
            value={type}
            onChange={(e) => setType(e.target.value as StockMovementType)}
            options={[
              { value: 'entry', label: 'Entrada' },
              { value: 'exit', label: 'Saída' },
              { value: 'adjustment', label: 'Ajuste' },
            ]}
          />
          <Select
            label="Produto"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            options={[
              { value: '', label: 'Selecione um produto' },
              ...products.map((p) => ({ value: p.id, label: `${p.name} (${p.quantity} un.)` })),
            ]}
          />
          <Input label="Quantidade" type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} min={1} />
          <Input label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: Reposição de estoque" />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50">Cancelar</button>
            <button onClick={handleAddMovement} disabled={saving || !productId || quantity <= 0} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Registrar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
