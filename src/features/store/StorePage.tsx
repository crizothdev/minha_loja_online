import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save } from 'lucide-react';
import { useAuth } from '../../shared/hooks/useAuth';
import { createStore, getStore, updateStore as updateStoreDb, updateUserStore } from '../../firebase/auth';
import { useToast } from '../../shared/components/Toast';
import type { Store as StoreType } from '../../shared/utils/types';

export const StorePage = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [store, setStore] = useState<StoreType | null>(null);

  useEffect(() => {
    if (user?.storeId) {
      getStore(user.storeId).then((s) => {
        if (s) {
          setStore(s);
          setName(s.name);
          setPhone(s.phone || '');
          setEmail(s.email || '');
        }
      });
    }
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (store) {
        await updateStoreDb(store.id, { name, phone, email });
        showToast('Loja atualizada com sucesso!');
      } else if (user) {
        const newStore = await createStore(name, phone, email);
        await updateUserStore(user.id, newStore.id);
        await refreshUser();
        showToast('Loja criada com sucesso!');
        navigate('/');
      } else {
        showToast('Usuário não encontrado. Tente recarregar a página.', 'error');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      showToast(`Erro: ${message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '0 32px' }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">{store ? 'Editar Loja' : 'Criar Loja'}</h1>
        <p className="text-slate-500 text-sm mt-1">Configure os dados da sua loja</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 max-w-lg" style={{ padding: 24 }}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Loja</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Nome da sua loja"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="(11) 99999-9999"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="loja@email.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '14px 16px' }}
            className="w-full rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {loading ? 'Salvando...' : store ? 'Atualizar Loja' : 'Criar Loja'}
          </button>
        </form>
      </div>
    </div>
  );
};
