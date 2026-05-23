import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Calendar } from 'lucide-react';

const mobileLinks = [
  { to: '/', icon: LayoutDashboard, label: 'Início' },
  { to: '/estoque/produtos', icon: Package, label: 'Estoque' },
  { to: '/vender', icon: ShoppingCart, label: 'Vender' },
  { to: '/agenda', icon: Calendar, label: 'Agenda' },
];

export const BottomNav = () => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40">
      <div className="flex items-center justify-around h-16">
        {mobileLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 min-w-0 px-2 py-1 ${
                isActive ? 'text-indigo-600' : 'text-slate-400'
              }`
            }
          >
            <link.icon size={22} />
            <span className="text-[10px] font-medium truncate">{link.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
