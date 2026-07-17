import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, ShoppingCart, Scan, Package, CircleUser } from 'lucide-react';
import { useERPStore } from '../../store/useERPStore';

export const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setScanDrawerOpen = useERPStore((state) => state.setScanDrawerOpen);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Sales', path: '/sales', icon: ShoppingCart },
    { label: 'Scan', path: '#scan', icon: Scan },
    { label: 'Inventory', path: '/inventory', icon: Package },
    { label: 'Account', path: '/account', icon: CircleUser },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-brand-border px-4 flex items-center justify-around z-45 safe-bottom shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
      {navItems.map((item) => {
        const isActive = item.path === '#scan' ? false : location.pathname === item.path;

        return (
          <button
            key={item.label}
            onClick={() => {
              if (item.path === '#scan') {
                setScanDrawerOpen(true, 'menu');
              } else {
                navigate(item.path);
              }
            }}
            className="relative flex flex-col items-center justify-center w-14 h-12 select-none"
          >
            {/* Active Pill Background */}
            {isActive && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-light-blue rounded-2xl -z-10"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}

            {/* Icon & Label */}
            <motion.div
              animate={{
                scale: isActive ? 1.08 : 1,
                y: isActive ? -1 : 0
              }}
              transition={{ duration: 0.15 }}
              className={`flex flex-col items-center justify-center space-y-0.5 ${isActive ? 'text-primary' : 'text-text-secondary'
                }`}
            >
              <item.icon size={20} className={isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
              <span className="text-[10px] font-semibold tracking-wide">
                {item.label}
              </span>
            </motion.div>
          </button>
        );
      })}
    </div>
  );
};
