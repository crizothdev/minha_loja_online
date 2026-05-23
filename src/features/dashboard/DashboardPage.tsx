import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import { getSales, getDeliveries, getProducts, getExpenses } from '../../firebase/firestore';
import { formatCurrency } from '../../shared/utils/formatters';
import { Loading } from '../../shared/components/Loading';
import { DollarSign, Truck, AlertTriangle, ShoppingCart, Package, Gift, Calendar, TrendingUp, TrendingDown, History } from 'lucide-react';
import type { Sale, Delivery, Product, Expense } from '../../shared/utils/types';

export const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.storeId) return;
    Promise.all([
      getSales(user.storeId),
      getDeliveries(user.storeId),
      getProducts(user.storeId),
      getExpenses(user.storeId),
    ]).then(([s, d, p, pc]) => {
      setSales(s);
      setDeliveries(d);
      setProducts(p);
      setExpenses(pc);
      setLoading(false);
    });
  }, [user]);

  if (loading) return <Loading />;

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);
  const monthSales = sales.filter((s) => s.createdAt.slice(0, 7) === thisMonth);
  const monthRevenue = monthSales.reduce((sum, s) => sum + s.total, 0);
  const monthSoldCost = monthSales.reduce((sum, sale) => {
    return sum + sale.items.reduce((itemSum, item) => {
      const product = products.find((p) => p.id === item.productId);
      return itemSum + (product?.costPrice || 0) * item.quantity;
    }, 0);
  }, 0);
  const monthExpenses = expenses.filter((p) => p.createdAt.slice(0, 7) === thisMonth);
  const monthSpent = monthExpenses.reduce((sum, p) => sum + p.value, 0);
  const monthProfit = monthRevenue - monthSoldCost - monthSpent;

  const pendingDeliveries = deliveries.filter((d) => !['delivered', 'cancelled'].includes(d.status));
  const lowStock = products.filter((p) => p.active && p.quantity < 5);

  const last6Months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    last6Months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const chartData = last6Months.map((m) => {
    const monthLabel = new Date(m + '-01').toLocaleDateString('pt-BR', { month: 'short' });
    const ms = sales.filter((s) => s.createdAt.slice(0, 7) === m);
    const me = expenses.filter((p) => p.createdAt.slice(0, 7) === m);
    const revenue = ms.reduce((sum, s) => sum + s.total, 0);
    const spent = me.reduce((sum, p) => sum + p.value, 0);
    const cost = ms.reduce((sum, sale) => {
      return sum + sale.items.reduce((itemSum, item) => {
        const product = products.find((pr) => pr.id === item.productId);
        return itemSum + (product?.costPrice || 0) * item.quantity;
      }, 0);
    }, 0);
    const profit = revenue - cost - spent;
    return { month: monthLabel, revenue, spent, profit };
  });

  const maxValue = Math.max(...chartData.map((d) => Math.max(d.revenue, d.spent, Math.abs(d.profit))), 1);

  const cards = [
    { label: 'Faturamento Mês', value: formatCurrency(monthRevenue), icon: DollarSign, color: '#eef2ff', iconColor: '#6366f1' },
    { label: 'Lucro Mês', value: formatCurrency(monthProfit), icon: TrendingUp, color: monthProfit >= 0 ? '#f0fdf4' : '#fef2f2', iconColor: monthProfit >= 0 ? '#16a34a' : '#ef4444' },
    { label: 'Despesas Mês', value: formatCurrency(monthSpent), icon: TrendingDown, color: '#fefce8', iconColor: '#ca8a04' },
    { label: 'Entregas Pendentes', value: pendingDeliveries.length.toString(), icon: Truck, color: '#eff6ff', iconColor: '#2563eb' },
    { label: 'Estoque Baixo', value: lowStock.length.toString(), icon: AlertTriangle, color: '#fffbeb', iconColor: '#d97706' },
  ];

  return (
    <div style={{ padding: '0 32px' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Resumo da sua loja</p>
        </div>
        <button
          onClick={() => navigate('/historico')}
          style={{ padding: '14px 16px' }}
          className="inline-flex items-center gap-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
        >
          <History size={18} /> Histórico
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm border border-slate-200" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <p className="text-sm text-slate-500 font-medium">{card.label}</p>
              <div style={{ width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: card.color }}>
                <card.icon size={20} style={{ color: card.iconColor }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900" style={{ marginTop: 12 }}>{card.value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider" style={{ marginBottom: 16 }}>Ações Rápidas</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 32 }}>
        {[
          { label: 'Vender', icon: ShoppingCart, to: '/vender', bg: '#4f46e5' },
          { label: 'Produtos', icon: Package, to: '/estoque/produtos', bg: '#16a34a' },
          { label: 'Cestas', icon: Gift, to: '/estoque/cestas', bg: '#d97706' },
          { label: 'Despesas', icon: TrendingDown, to: '/financeiro/despesas', bg: '#dc2626' },
          { label: 'Agenda', icon: Calendar, to: '/agenda', bg: '#2563eb' },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={() => navigate(btn.to)}
            style={{ background: btn.bg, border: 'none', cursor: 'pointer', padding: '14px 16px', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
            className="text-white hover:opacity-90 transition-opacity"
          >
            <btn.icon size={24} />
            <span className="text-sm font-medium">{btn.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200" style={{ padding: 24, marginBottom: 32 }}>
        <h3 className="font-semibold text-slate-900" style={{ marginBottom: 20 }}>Últimos 6 Meses</h3>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: '#6366f1' }} />
            <span className="text-xs text-slate-500">Vendas</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: '#ef4444' }} />
            <span className="text-xs text-slate-500">Despesas</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: '#16a34a' }} />
            <span className="text-xs text-slate-500">Lucro</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${chartData.length}, 1fr)`, gap: 24, alignItems: 'end' }}>
          {chartData.map((d) => (
            <div key={d.month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 200 }}>
                <div style={{ width: 16, height: Math.max((d.revenue / maxValue) * 200, 4), background: '#6366f1', borderRadius: '3px 3px 0 0' }} title={`Vendas: ${formatCurrency(d.revenue)}`} />
                <div style={{ width: 16, height: Math.max((d.spent / maxValue) * 200, 4), background: '#ef4444', borderRadius: '3px 3px 0 0' }} title={`Despesas: ${formatCurrency(d.spent)}`} />
                {d.profit >= 0 && (
                  <div style={{ width: 16, height: Math.max((d.profit / maxValue) * 200, 4), background: '#16a34a', borderRadius: '3px 3px 0 0' }} title={`Lucro: ${formatCurrency(d.profit)}`} />
                )}
              </div>
              <span className="text-xs text-slate-400">{d.month}</span>
            </div>
          ))}
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200" style={{ padding: 24 }}>
          <h3 className="font-semibold text-slate-900" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} className="text-amber-500" />
            Produtos com Estoque Baixo
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {lowStock.map((product, i) => (
              <div key={product.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < lowStock.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <p className="text-sm text-slate-700">{product.name}</p>
                <span style={{ padding: '2px 10px', borderRadius: 9999, fontSize: 13, fontWeight: 500, background: '#fef3c7', color: '#92400e' }}>{product.quantity} un.</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
