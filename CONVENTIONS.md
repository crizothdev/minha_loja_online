# Convenções do Projeto — Minha Loja Online

## Stack
- React + Vite + TypeScript
- Tailwind CSS v4 (plugin @tailwindcss/vite)
- Firebase (Auth + Firestore)
- React Router v7
- Lucide React (ícones)

## Regra de Ouro: Padding e Espaçamento

**SEMPRE usar estilo inline para padding interno de componentes e containers.**

Tailwind v4 com `@tailwindcss/vite` não processa classes de padding (`p-4`, `p-6`, `px-4`, etc.) de forma confiável. Para garantir que o conteúdo nunca fique colado nas bordas, todo container/card/tabela deve usar padding inline:

```tsx
// CORRETO - padding garante funcionamento
<div className="bg-white rounded-xl shadow-sm border border-slate-200" style={{ padding: 24 }}>
  conteúdo
</div>

// Tabelas - padding nas células
<th style={{ padding: '12px 24px' }}>Nome</th>
<td style={{ padding: '12px 24px' }}>Valor</td>

// ERRADO - padding em classe Tailwind pode não funcionar
<div className="bg-white rounded-xl p-6">  ← NÃO USAR
```

### Valores padrão de padding

| Elemento | Padding |
|----------|---------|
| Cards, containers, modais, sidebar | `padding: 24` |
| Células de tabela (th, td) | `padding: '12px 24px'` |
| Cards do dashboard | `padding: 20` |
| Itens de lista (carrinho, cestas) | `padding: 16` |
| Botões pequenos | `padding: '8px 16px'` |
| Padding lateral das páginas (root div) | `padding: '0 32px'` |

### Centralização de conteúdo

Para centralizar um bloco dentro de um card (ex: formulário de login com largura 60%):

```tsx
<div className="bg-white rounded-xl ..." style={{ padding: '32px 24px' }}>
  <div style={{ width: '60%', margin: '0 auto', padding: '2rem 0' }}>
    conteúdo centralizado
  </div>
</div>
```

## Layout Global

O `AppLayout` define o padding externo da área de conteúdo:
```tsx
<div style={{ padding: '32px 32px 24px 32px' }}>
  <Outlet />
</div>
```

Cada página também define seu próprio padding lateral no container raiz:
```tsx
<div style={{ padding: '0 32px' }}>
  conteúdo da página
</div>
```

## O que NÃO usar do Tailwind

| Não usar | Substituir por |
|----------|---------------|
| `p-4`, `p-6`, `p-8`, `px-6 py-4` | `style={{ padding: 24 }}` |
| `w-[60%] mx-auto` | `style={{ width: '60%', margin: '0 auto' }}` |
| Ícones absolutos em inputs (`<Search> + pl-10`) | Input simples com `px-3` |
| `gap-[valor]` | `style={{ gap: valor }}` |

## O que CONTINUAR usando do Tailwind

- Cores: `bg-white`, `text-slate-900`, `bg-indigo-600`
- Bordas: `rounded-xl`, `border`, `border-slate-200`
- Layout: `flex`, `grid`, `grid-cols-*`
- Tipografia: `text-sm`, `font-medium`, `font-bold`
- Sombras: `shadow-sm`, `shadow-xl`
- Hover/transições: `hover:bg-slate-50`, `transition-colors`

## TypeScript

- `verbatimModuleSyntax: true` — usar `import type` para imports somente de tipo
- `noUnusedLocals: true` — remover imports e variáveis não usadas
- `noUnusedParameters: true` — remover parâmetros não usados

## Firebase/Firestore

- `doc(collection(db, 'stores'))` para criar documento com ID automático
- **NÃO usar `doc(db, 'stores')`** — gera referência inválida (1 segmento)
- Coleções aninhadas: padrão `stores/{storeId}/products/{productId}`

## Inputs

- Sempre usar `px-3 py-2 rounded-lg border border-slate-200 text-sm` (classes Tailwind OK para inputs)
- Foco: `focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent`
- Placeholder: `placeholder:text-slate-400`
- Labels: `text-sm font-medium text-slate-700`
