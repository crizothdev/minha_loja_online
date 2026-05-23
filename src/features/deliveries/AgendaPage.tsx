import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import { getDeliveries, updateDelivery } from '../../firebase/firestore';
import { Badge } from '../../shared/components/Badge';
import { Loading } from '../../shared/components/Loading';
import { EmptyState } from '../../shared/components/EmptyState';
import { useToast } from '../../shared/components/Toast';
import { formatCurrency } from '../../shared/utils/formatters';
import type { Delivery, DeliveryStatus } from '../../shared/utils/types';
import { DELIVERY_STATUS_LABELS, DELIVERY_STATUS_COLORS } from '../../shared/utils/types';
import { Calendar, MapPin, Phone, ChevronDown, ChevronUp, Plus } from 'lucide-react';

const STATUS_ORDER: DeliveryStatus[] = ['pending', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];

const STATUS_FLOW: Record<DeliveryStatus, DeliveryStatus[]> = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export const AgendaPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    if (!user?.storeId) return;
    const d = await getDeliveries(user.storeId);
    setDeliveries(d);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const changeStatus = async (id: string, newStatus: DeliveryStatus) => {
    if (!user?.storeId) return;
    await updateDelivery(user.storeId, id, { status: newStatus });
    showToast(`Status alterado para ${DELIVERY_STATUS_LABELS[newStatus]}`);
    await load();
  };

  const today = new Date().toISOString().slice(0, 10);

  const filtered = deliveries.filter((d) => {
    const matchSearch = !search || d.customer.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || d.status === filterStatus;
    let matchDate = true;
    if (filterDate === 'today') matchDate = d.deliveryDate === today;
    else if (filterDate === 'future') matchDate = d.deliveryDate > today;
    else if (filterDate === 'past') matchDate = d.deliveryDate < today;
    return matchSearch && matchStatus && matchDate;
  });

  if (loading) return <Loading />;

  return (
    <div style={{ padding: '0 32px' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agenda de Entregas</h1>
          <p className="text-slate-500 text-sm mt-1">{deliveries.length} pedidos registrados</p>
        </div>
        <button
          onClick={() => navigate('/vender')}
          style={{ padding: '14px 16px' }}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shrink-0"
        >
          <Plus size={18} /> Novo Pedido
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-4" style={{ padding: 24 }}>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Todos status</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{DELIVERY_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="all">Todas datas</option>
            <option value="today">Hoje</option>
            <option value="future">Futuras</option>
            <option value="past">Atrasadas</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="Nenhum pedido encontrado" />
      ) : (
        <div className="space-y-3">
          {filtered.map((delivery) => (
            <div key={delivery.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === delivery.id ? null : delivery.id)}
                 className="w-full flex items-center justify-between hover:bg-slate-50 transition-colors" style={{ padding: 24 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Calendar size={20} className="text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-900">{delivery.customer.name}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(delivery.deliveryDate + 'T00:00:00').toLocaleDateString('pt-BR')} às {delivery.deliveryTime}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge color={DELIVERY_STATUS_COLORS[delivery.status]} label={DELIVERY_STATUS_LABELS[delivery.status]} />
                  {expandedId === delivery.id ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </div>
              </button>
              {expandedId === delivery.id && (
                 <div className="border-t border-slate-100" style={{ padding: 24 }}>
                  <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                        <Phone size={14} className="text-slate-400" />
                        {delivery.customer.phone}
                      </div>
                      <div className="flex items-start gap-2 text-sm text-slate-600">
                        <MapPin size={14} className="text-slate-400 mt-0.5" />
                        <span>{delivery.address.street}, {delivery.address.number}{delivery.address.complement ? ` - ${delivery.address.complement}` : ''} - {delivery.address.district}, {delivery.address.city}</span>
                      </div>
                      {delivery.observations && (
                        <p className="text-sm text-slate-500 mt-2 italic">Obs: {delivery.observations}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase mb-2">Itens</p>
                      <div className="space-y-1">
                        {delivery.items.map((item) => (
                          <div key={item.productId} className="flex justify-between text-sm">
                            <span className="text-slate-600">{item.productName} x{item.quantity}</span>
                            <span className="text-slate-900">{formatCurrency(item.salePrice * item.quantity)}</span>
                          </div>
                        ))}
                        <div className="border-t border-slate-100 pt-1 flex justify-between font-semibold text-slate-900">
                          <span>Total</span>
                          <span>{formatCurrency(delivery.items.reduce((s, i) => s + i.salePrice * i.quantity, 0))}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {STATUS_FLOW[delivery.status].length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                      {STATUS_FLOW[delivery.status].map((nextStatus) => (
                        <button
                          key={nextStatus}
                          onClick={() => changeStatus(delivery.id, nextStatus)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            nextStatus === 'cancelled'
                              ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                          }`}
                        >
                          {nextStatus === 'cancelled' ? 'Cancelar' : `Marcar como "${DELIVERY_STATUS_LABELS[nextStatus]}"`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
