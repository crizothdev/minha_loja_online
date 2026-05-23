import { useState, useEffect } from 'react';
import { useAuth } from '../../shared/hooks/useAuth';
import { getExpenses, createExpense } from '../../firebase/firestore';
import { Modal } from '../../shared/components/Modal';
import { Input } from '../../shared/components/Input';
import { Loading } from '../../shared/components/Loading';
import { EmptyState } from '../../shared/components/EmptyState';
import { useToast } from '../../shared/components/Toast';
import { formatCurrency, formatDate } from '../../shared/utils/formatters';
import type { Expense } from '../../shared/utils/types';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  operacional: 'Operacional',
  nao_operacional: 'Não Operacional',
};

const typeBadge = (type: string) => {
  const isOperational = type === 'operacional';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        background: isOperational ? '#eef2ff' : '#fef3c7',
        color: isOperational ? '#4338ca' : '#92400e',
        whiteSpace: 'nowrap',
      }}
    >
      {TYPE_LABELS[type] || type}
    </span>
  );
};

export const DespesasPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [type, setType] = useState<'operacional' | 'nao_operacional'>('operacional');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = async () => {
    if (!user?.storeId) return;
    const data = await getExpenses(user.storeId);
    setExpenses(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleSave = async () => {
    if (!user?.storeId || !description.trim() || !value) return;
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return;
    setSaving(true);
    try {
      await createExpense(user.storeId, {
        description: description.trim(),
        value: numValue,
        type,
        reason: reason.trim(),
      });
      showToast('Despesa registrada!');
      setModalOpen(false);
      setDescription('');
      setValue('');
      setType('operacional');
      setReason('');
      await loadData();
    } catch (err: unknown) {
      showToast(`Erro: ${err instanceof Error ? err.message : 'Erro'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  const totalDespesas = expenses.reduce((sum, e) => sum + e.value, 0);

  return (
    <div style={{ padding: '0 32px' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Despesas</h1>
          <p className="text-slate-500 text-sm mt-1">{expenses.length} despesas registradas</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="bg-white rounded-lg border border-slate-200" style={{ padding: '8px 16px' }}>
            <p className="text-xs text-slate-500">Total de Despesas</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(totalDespesas)}</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            style={{ padding: '14px 16px' }}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 shrink-0"
          >
            <Plus size={18} /> Inserir Despesa
          </button>
        </div>
      </div>

      {expenses.length === 0 ? (
        <EmptyState message="Nenhuma despesa registrada" />
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
              style={{ padding: 24 }}
            >
              <button
                onClick={() => setExpandedId(expandedId === expense.id ? null : expense.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <div style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{expense.description}</p>
                    <p className="text-xs text-slate-400">{formatDate(expense.createdAt)}</p>
                  </div>
                  {typeBadge(expense.type)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="font-semibold text-slate-900">{formatCurrency(expense.value)}</span>
                  {expandedId === expense.id ? (
                    <ChevronUp size={18} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={18} className="text-slate-400" />
                  )}
                </div>
              </button>
              {expandedId === expense.id && expense.reason && (
                <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 16, paddingTop: 16 }}>
                  <p className="text-xs text-slate-400 mb-1">Motivo</p>
                  <p className="text-sm text-slate-600">{expense.reason}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Inserir Despesa" size="md">
        <div className="flex flex-col" style={{ gap: 20 }}>
          <Input
            label="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder="Ex: Conta de energia elétrica"
          />

          <Input
            label="Valor"
            type="number"
            step="0.01"
            min="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            placeholder="0,00"
          />

          <div className="flex flex-col" style={{ gap: 6 }}>
            <label className="text-sm font-medium text-slate-700">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'operacional' | 'nao_operacional')}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="operacional">Operacional</option>
              <option value="nao_operacional">Não Operacional</option>
            </select>
          </div>

          <Input
            label="Motivo (opcional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Aumento sazonal"
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              paddingTop: 16,
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <button
              onClick={() => setModalOpen(false)}
              style={{ padding: '14px 16px' }}
              className="rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !description.trim() || !value}
              style={{ padding: '14px 16px' }}
              className="rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Registrar Despesa'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
