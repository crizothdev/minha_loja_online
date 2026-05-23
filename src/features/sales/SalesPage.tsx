import { useState, useEffect } from 'react';
import { useAuth } from '../../shared/hooks/useAuth';
import { getSales } from '../../firebase/firestore';
import { Loading } from '../../shared/components/Loading';
import { EmptyState } from '../../shared/components/EmptyState';
import { formatCurrency, formatDateTime } from '../../shared/utils/formatters';
import type { Sale } from '../../shared/utils/types';
import { History, ChevronDown, ChevronUp } from 'lucide-react';

export const SalesPage = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.storeId) return;
    getSales(user.storeId).then((s) => {
      setSales(s);
      setLoading(false);
    });
  }, [user]);

  if (loading) return <Loading />;

  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Histórico de Vendas</h1>
          <p className="text-slate-500 text-sm mt-1">{sales.length} vendas realizadas</p>
        </div>
        <div className="bg-white rounded-lg px-4 py-2 border border-slate-200">
          <p className="text-xs text-slate-500">Total Vendido</p>
          <p className="text-lg font-bold text-slate-900">{formatCurrency(totalRevenue)}</p>
        </div>
      </div>

      {sales.length === 0 ? (
        <EmptyState message="Nenhuma venda realizada" />
      ) : (
        <div className="space-y-3">
          {sales.map((sale) => (
            <div key={sale.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <History size={20} className="text-indigo-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-900">Venda com {sale.items.length} itens</p>
                    <p className="text-xs text-slate-400">{formatDateTime(sale.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900">{formatCurrency(sale.total)}</span>
                  {expandedId === sale.id ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </div>
              </button>
              {expandedId === sale.id && (
                <div className="px-6 pb-4 border-t border-slate-100">
                  <div className="pt-3 space-y-2">
                    {sale.items.map((item) => (
                      <div key={item.productId} className="flex justify-between text-sm">
                        <span className="text-slate-600">{item.productName} x{item.quantity}</span>
                        <span className="text-slate-900 font-medium">{formatCurrency(item.salePrice * item.quantity)}</span>
                      </div>
                    ))}
                    <div className="border-t border-slate-100 pt-2 flex justify-between font-semibold text-slate-900">
                      <span>Total</span>
                      <span>{formatCurrency(sale.total)}</span>
                    </div>
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
