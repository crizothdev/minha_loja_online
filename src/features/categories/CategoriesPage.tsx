import { useState, useEffect } from 'react';
import { useAuth } from '../../shared/hooks/useAuth';
import { getCategories, createCategory, updateCategory } from '../../firebase/firestore';
import { Modal } from '../../shared/components/Modal';
import { Input } from '../../shared/components/Input';
import { Loading } from '../../shared/components/Loading';
import { EmptyState } from '../../shared/components/EmptyState';
import { useToast } from '../../shared/components/Toast';
import type { Category } from '../../shared/utils/types';
import { Plus, Edit2, Tags } from 'lucide-react';

export const CategoriesPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');

  const load = async () => {
    if (!user?.storeId) return;
    const cats = await getCategories(user.storeId);
    setCategories(cats);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const openCreate = () => { setEditing(null); setName(''); setModalOpen(true); };
  const openEdit = (cat: Category) => { setEditing(cat); setName(cat.name); setModalOpen(true); };

  const handleSave = async () => {
    if (!user?.storeId || !name.trim()) return;
    try {
      if (editing) {
        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        await updateCategory(user.storeId, editing.id, { name: name.trim(), slug });
        showToast('Categoria atualizada!');
      } else {
        await createCategory(user.storeId, name.trim());
        showToast('Categoria criada!');
      }
      setModalOpen(false);
      await load();
    } catch {
      showToast('Erro ao salvar categoria', 'error');
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categorias</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie as categorias de produtos</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shrink-0">
          <Plus size={18} /> Nova Categoria
        </button>
      </div>

      {categories.length === 0 ? (
        <EmptyState message="Nenhuma categoria cadastrada" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Tags size={20} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{cat.name}</p>
                  <p className="text-xs text-slate-400">{cat.slug}</p>
                </div>
              </div>
              <button onClick={() => openEdit(cat)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors">
                <Edit2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Categoria' : 'Nova Categoria'} size="sm">
        <Input label="Nome da Categoria" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Canecas" />
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50">Cancelar</button>
          <button onClick={handleSave} disabled={!name.trim()} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">Salvar</button>
        </div>
      </Modal>
    </div>
  );
};
