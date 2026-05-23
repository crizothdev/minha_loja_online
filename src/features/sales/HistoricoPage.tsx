import { useState, useEffect } from 'react';
import { useAuth } from '../../shared/hooks/useAuth';
import { getSales } from '../../firebase/firestore';
import { Loading } from '../../shared/components/Loading';
import { EmptyState } from '../../shared/components/EmptyState';
import { formatCurrency, formatDateTime } from '../../shared/utils/formatters';
import type { Sale } from '../../shared/utils/types';
import { ChevronDown, ChevronUp } from 'lucide-react';

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export const HistoricoPage = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateStart, setDateStart] = useState(daysAgo(30));
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().slice(0, 10));
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.storeId) return;
    getSales(user.storeId).then((s) => { setSales(s); setLoading(false); });
  }, [user]);

  const filtered = sales.filter((s) => {
    const d = s.createdAt.slice(0, 10);
    return d >= dateStart && d <= dateEnd;
  });

  const totalRevenue = filtered.reduce((sum, s) => sum + s.total, 0);

  if (loading) return <Loading />;

  return (
    <div style={{ padding: '0 32px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-2xl font-bold text-slate-900">Histórico de Vendas</h1>
        <p className="text-slate-500 text-sm mt-1">{filtered.length} vendas no período</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">De</label>
            <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Até</label>
            <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <button onClick={() => { setDateStart(daysAgo(30)); setDateEnd(new Date().toISOString().slice(0, 10)); }} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50">Últimos 30 dias</button>
          <button onClick={() => { setDateStart('2020-01-01'); setDateEnd(new Date().toISOString().slice(0, 10)); }} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50">Todo período</button>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <p className="text-xs text-slate-500">Total no período</p>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="Nenhuma venda no período selecionado" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((sale) => (
            <div key={sale.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" style={{ padding: 24 }}>
              <button
                onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <div style={{ textAlign: 'left' }}>
                  <p className="text-sm font-medium text-slate-900">{sale.items.length} itens</p>
                  <p className="text-xs text-slate-400">{formatDateTime(sale.createdAt)}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="font-semibold text-slate-900">{formatCurrency(sale.total)}</span>
                  {expandedId === sale.id ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </div>
              </button>
              {expandedId === sale.id && (
                <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 16, paddingTop: 16 }}>
                  {sale.items.map((item) => (
                    <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                      <span className="text-sm text-slate-600">{item.productName} x{item.quantity}</span>
                      <span className="text-sm font-medium text-slate-900">{formatCurrency(item.salePrice * item.quantity)}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <span className="font-semibold text-slate-900">Total</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(sale.total)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
