import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  DollarSign,
  ShoppingCart,
  Calendar,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useState } from 'react';

interface NavItem {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  children?: { to: string; label: string }[];
}

const navItems: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  {
    to: '/estoque',
    icon: Package,
    label: 'Estoque',
    children: [
      { to: '/estoque/produtos', label: 'Produtos' },
      { to: '/estoque/cestas', label: 'Cestas' },
    ],
  },
  {
    to: '/financeiro',
    icon: DollarSign,
    label: 'Financeiro',
    children: [
      { to: '/financeiro/despesas', label: 'Despesas' },
    ],
  },
  { to: '/vender', icon: ShoppingCart, label: 'Vender' },
  { to: '/agenda', icon: Calendar, label: 'Agenda' },
];

const baseLink = 'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors';
const activeLink = `${baseLink} bg-indigo-50 text-indigo-700`;
const inactiveLink = `${baseLink} text-slate-600 hover:bg-slate-100 hover:text-slate-900`;
const childLink = 'flex items-center pl-11 pr-4 py-2 rounded-lg text-sm transition-colors';
const childActive = `${childLink} bg-indigo-50 text-indigo-700 font-medium`;
const childInactive = `${childLink} text-slate-500 hover:bg-slate-50 hover:text-slate-700`;

export const Sidebar = () => {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filteredItems = user?.storeId
    ? navItems.filter((item) => item.to !== '/store')
    : [{ to: '/store', icon: LayoutDashboard, label: 'Criar Loja' }];

  const toggleExpand = (label: string) => {
    setExpanded(expanded === label ? null : label);
  };

  const links = (
    <>
      {filteredItems.map((item) => (
        <div key={item.to}>
          {item.children ? (
            <>
              <button
                onClick={() => toggleExpand(item.label)}
                className={`w-full ${expanded === item.label ? activeLink : inactiveLink}`}
              >
                <item.icon size={20} />
                <span className="flex-1 text-left">{item.label}</span>
                {expanded === item.label ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {expanded === item.label && (
                <div className="mt-1 space-y-1">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      className={({ isActive }) => (isActive ? childActive : childInactive)}
                      onClick={() => setMobileOpen(false)}
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </>
          ) : (
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => {
                if (isActive) return activeLink;
                if (item.children?.some((c) => location.pathname.startsWith(c.to))) return activeLink;
                return inactiveLink;
              }}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          )}
        </div>
      ))}
    </>
  );

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-56 bg-white border-r border-slate-200 flex flex-col transform transition-transform lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-slate-100" style={{ padding: '24px 12px 24px 24px' }}>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Package size={24} className="text-indigo-600" />
            Minha Loja
          </h1>
        </div>

        <nav className="flex-1 overflow-y-auto space-y-1" style={{ padding: '24px 12px 24px 24px' }}>
          {links}
        </nav>

        <div className="border-t border-slate-100" style={{ padding: '24px 12px 24px 24px' }}>
          <div className="mb-3 px-3">
            <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            style={{ padding: '14px 16px' }}
            className="flex items-center gap-2 w-full rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
};
