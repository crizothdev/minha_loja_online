import { useState, useEffect } from 'react';
import { useAuth } from '../../shared/hooks/useAuth';
import { getProducts, createProduct, updateProduct, deleteProduct, getCategories, createCategory } from '../../firebase/firestore';
import { Modal } from '../../shared/components/Modal';
import { Input } from '../../shared/components/Input';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { Loading } from '../../shared/components/Loading';
import { EmptyState } from '../../shared/components/EmptyState';
import { useToast } from '../../shared/components/Toast';
import { formatCurrency, generateInternalCode } from '../../shared/utils/formatters';
import type { Product, Category } from '../../shared/utils/types';
import { Plus, Edit2, Power, PowerOff, Upload, Trash2, Copy } from 'lucide-react';

interface ProductForm {
  name: string;
  internalCode: string;
  barcode: string;
  categories: string[];
  quantity: number;
  costPrice: number;
  salePrice: number;
  description: string;
  active: boolean;
}

const emptyForm: ProductForm = {
  name: '', internalCode: '', barcode: '', categories: [],
  quantity: 0, costPrice: 0, salePrice: 0, description: '', active: true,
};

export const ProductsPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const loadData = async () => {
    if (!user?.storeId) return;
    const [p, c] = await Promise.all([getProducts(user.storeId), getCategories(user.storeId)]);
    setProducts(p);
    setCategories(c);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.internalCode.toLowerCase().includes(search.toLowerCase()) || p.barcode.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategory || p.categories.includes(filterCategory);
    return matchSearch && matchCat;
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, internalCode: generateInternalCode() });
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name, internalCode: product.internalCode, barcode: product.barcode,
      categories: product.categories, quantity: product.quantity,
      costPrice: product.costPrice, salePrice: product.salePrice,
      description: product.description, active: product.active,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!user?.storeId) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateProduct(user.storeId, editingId, { ...form, updatedAt: new Date().toISOString() });
        showToast('Produto atualizado!');
      } else {
        await createProduct(user.storeId, { ...form, storeId: user.storeId });
        showToast('Produto criado!');
      }
      setModalOpen(false);
      await loadData();
    } catch {
      showToast('Erro ao salvar produto', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (product: Product) => {
    if (!user?.storeId) return;
    await updateProduct(user.storeId, product.id, { active: !product.active, updatedAt: new Date().toISOString() });
    showToast(product.active ? 'Produto inativado' : 'Produto ativado');
    await loadData();
  };

  const handleDelete = async () => {
    if (!user?.storeId || !deleteTarget) return;
    await deleteProduct(user.storeId, deleteTarget.id);
    showToast('Produto excluído');
    setDeleteTarget(null);
    await loadData();
  };

  const handleCreateCategory = async () => {
    if (!user?.storeId || !newCategoryName.trim()) return;
    const cat = await createCategory(user.storeId, newCategoryName.trim());
    setCategories([...categories, cat]);
    setForm({ ...form, categories: [...form.categories, cat.slug] });
    setNewCategoryName('');
    setShowNewCategory(false);
    showToast('Categoria criada!');
  };

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; }
      else if ((char === ',' || char === ';') && !inQuotes) { result.push(current.trim()); current = ''; }
      else { current += char; }
    }
    result.push(current.trim());
    return result;
  };

  const handleCsvImport = async () => {
    if (!user?.storeId || !csvText.trim()) return;
    setImporting(true);
    const lines = csvText.split('\n').filter((l) => l.trim());
    let imported = 0;
    let skipped = 0;
    try {
      const existingCats = await getCategories(user.storeId);
      const existingSlugs = new Set(existingCats.map((c) => c.slug));
      const newCatSlugs = new Set<string>();

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const rawCats = cols[3]?.trim();
        if (rawCats) {
          rawCats.split(',').map((c) => c.trim().toLowerCase().replace(/\s+/g, '-')).filter((s) => s && !existingSlugs.has(s)).forEach((s) => newCatSlugs.add(s));
        }
      }

      for (const slug of newCatSlugs) {
        const name = slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
        await createCategory(user.storeId, name);
      }

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const name = cols[0]?.trim();
        if (!name || name.startsWith('#')) { skipped++; continue; }
        const internalCode = cols[1]?.trim() || generateInternalCode();
        const barcode = cols[2]?.trim() || '';
        const cats = cols[3]?.trim() ? cols[3].split(',').map((c) => c.trim().toLowerCase().replace(/\s+/g, '-')) : [];
        const quantity = parseInt(cols[4]) || 0;
        const costPrice = parseFloat(cols[5]?.replace(',', '.')) || 0;
        const salePrice = parseFloat(cols[6]?.replace(',', '.')) || 0;
        const description = cols[7]?.trim() || '';
        await createProduct(user.storeId, {
          storeId: user.storeId,
          name, internalCode, barcode, categories: cats,
          quantity, costPrice, salePrice, description, active: true,
        });
        imported++;
      }
      showToast(`${imported} produtos, ${newCatSlugs.size} categorias importados${skipped > 0 ? `, ${skipped} ignorados` : ''}`);
      setCsvModalOpen(false);
      setCsvText('');
      await loadData();
    } catch (err: unknown) {
      showToast(`Erro ao importar: ${err instanceof Error ? err.message : 'Erro'}`, 'error');
    } finally {
      setImporting(false);
    }
  };

  const csvFormatText = `Formato CSV para importar produtos no sistema Minha Loja Online.

Colunas na ordem exata (separadas por vírgula ou ponto-e-vírgula):

1. nome            (obrigatório) — Nome do produto
2. codigo          (opcional)    — Código interno. Se vazio, gerado automaticamente
3. codigo_barras   (opcional)    — Código de barras EAN/UPC
4. categorias      (opcional)    — Nomes das categorias separados por vírgula. Ex: canecas,cafe
5. quantidade      (opcional)    — Quantidade inicial em estoque. Padrão: 0
6. preco_custo     (opcional)    — Preço de custo. Use ponto (10.00) ou vírgula (10,00)
7. preco_venda     (opcional)    — Preço de venda
8. descricao       (opcional)    — Descrição do produto

Regras:
- Campos vazios entre vírgulas (,,) são ignorados e assumem o valor padrão
- O separador pode ser vírgula ou ponto-e-vírgula
- Linhas iniciadas com # são ignoradas (comentários)
- Valores decimais aceitam ponto (10.00) ou vírgula (10,00)
- A primeira linha é tratada como cabeçalho e ignorada

Exemplo:
nome,codigo,codigo_barras,categorias,quantidade,preco_custo,preco_venda,descricao
Caneca,,,canecas,10,10.00,25.00,Caneca branca 300ml
Cesta Café Premium,,,cestas,cafe,5,30.00,80.00,Cesta de café da manhã completa
Chocolate Belga,PROD002,7891234567890,chocolates,20,5.50,15.00,Chocolate belga 200g`;

  if (loading) return <Loading />;

  return (
    <div style={{ padding: '0 32px' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Produtos</h1>
          <p className="text-slate-500 text-sm mt-1">{products.length} produtos cadastrados</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setCsvModalOpen(true)} style={{ padding: '14px 16px' }} className="inline-flex items-center gap-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors shrink-0">
            <Upload size={18} /> Importar CSV
          </button>
          <button onClick={openCreate} style={{ padding: '14px 16px' }} className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shrink-0">
            <Plus size={18} /> Novo Produto
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-4" style={{ padding: 24 }}>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nome, código ou código de barras..."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            <option value="">Todas categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="Nenhum produto encontrado" />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" style={{ padding: 24 }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider" style={{ padding: '12px 24px' }}>Produto</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider" style={{ padding: '12px 24px' }}>Código</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider" style={{ padding: '12px 24px' }}>Estoque</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider" style={{ padding: '12px 24px' }}>Preço</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider" style={{ padding: '12px 24px' }}>Status</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider" style={{ padding: '12px 24px' }}>Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td style={{ padding: '12px 24px' }}>
                      <p className="text-sm font-medium text-slate-900">{product.name}</p>
                      <p className="text-xs text-slate-400">{product.categories.join(', ')}</p>
                    </td>
                    <td className="text-sm text-slate-600 font-mono" style={{ padding: '12px 24px' }}>{product.internalCode}</td>
                    <td style={{ padding: '12px 24px' }}>
                      <span className={`text-sm font-medium ${product.quantity < 5 ? 'text-amber-600' : 'text-slate-600'}`}>
                        {product.quantity}
                      </span>
                    </td>
                    <td style={{ padding: '12px 24px' }}>
                      <p className="text-sm font-medium text-slate-900">{formatCurrency(product.salePrice)}</p>
                      <p className="text-xs text-slate-400">Custo: {formatCurrency(product.costPrice)}</p>
                    </td>
                    <td style={{ padding: '12px 24px' }}>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${product.active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {product.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 24px' }}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(product)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => toggleActive(product)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-amber-600 transition-colors">
                          {product.active ? <PowerOff size={16} /> : <Power size={16} />}
                        </button>
                        <button onClick={() => setDeleteTarget(product)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-600 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Produto' : 'Novo Produto'} size="lg">
        <div className="space-y-4">
          <Input label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Código Interno" value={form.internalCode} onChange={(e) => setForm({ ...form, internalCode: e.target.value })} />
            <Input label="Código de Barras" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Estoque" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
            <Input label="Valor Custo" type="number" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })} />
            <Input label="Valor Venda" type="number" step="0.01" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categorias</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    const cats = form.categories.includes(cat.slug)
                      ? form.categories.filter((c) => c !== cat.slug)
                      : [...form.categories, cat.slug];
                    setForm({ ...form, categories: cats });
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    form.categories.includes(cat.slug)
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            {showNewCategory ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nome da categoria"
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button onClick={handleCreateCategory} className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">Salvar</button>
                <button onClick={() => setShowNewCategory(false)} className="px-3 py-1.5 text-slate-500 text-sm hover:text-slate-700">Cancelar</button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowNewCategory(true)} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                + Nova categoria
              </button>
            )}
          </div>
          <Input label="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button onClick={() => setModalOpen(false)} style={{ padding: '14px 16px' }} className="rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50">Cancelar</button>
            <button onClick={handleSave} disabled={saving || !form.name} style={{ padding: '14px 16px' }} className="rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={csvModalOpen} onClose={() => setCsvModalOpen(false)} title="Importar Produtos via CSV" size="lg">
        <div className="flex flex-col" style={{ gap: 20 }}>
          <div className="flex items-center justify-between shrink-0">
            <label className="text-sm font-medium text-slate-700">Formato esperado</label>
            <button
              onClick={() => { navigator.clipboard.writeText(csvFormatText); showToast('Instruções copiadas!'); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 shrink-0"
            >
              <Copy size={14} /> Copiar instruções
            </button>
          </div>
          <pre className="bg-slate-50 rounded-lg p-4 text-xs text-slate-600 overflow-auto whitespace-pre-wrap" style={{ maxHeight: 160 }}>
{csvFormatText}
          </pre>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cole o conteúdo do CSV</label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              placeholder="nome,codigo,codigo_barras,categorias,quantidade,preco_custo,preco_venda,descricao&#10;Caneca,PROD001,,canecas,10,10.00,25.00,Caneca branca"
              style={{ padding: 12 }}
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 shrink-0">
            <button onClick={() => { setCsvModalOpen(false); setCsvText(''); }} style={{ padding: '14px 16px' }} className="rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50">Cancelar</button>
            <button onClick={handleCsvImport} disabled={importing || !csvText.trim()} style={{ padding: '14px 16px' }} className="rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {importing ? 'Importando...' : 'Importar'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir Produto"
        message={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        danger
      />
    </div>
  );
};
