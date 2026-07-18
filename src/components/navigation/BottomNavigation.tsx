import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, ShoppingCart, ReceiptIndianRupee, Package, CircleUser } from 'lucide-react';
import { useERPStore } from '../../store/useERPStore';

export const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setScanDrawerOpen = useERPStore((state) => state.setScanDrawerOpen);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Sales', path: '/sales', icon: ShoppingCart },
    { label: 'Bill', path: '#scan', icon: ReceiptIndianRupee },
    { label: 'Inventory', path: '/inventory', icon: Package },
    { label: 'Account', path: '/account', icon: CircleUser },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-45 safe-bottom pointer-events-none pb-4">
      <div className="relative mx-4 h-[72px] bg-white shadow-[0_10px_40px_rgba(0,0,0,0.08)] rounded-[40px] flex items-center justify-around px-2 pointer-events-auto border border-slate-100">
        {navItems.map((item) => {
          const isScan = item.path === '#scan';
          const isActive = isScan ? false : location.pathname === item.path;

          if (isScan) {
            return (
              <div key={item.label} className="relative flex flex-col items-center justify-start h-full px-2" style={{ marginTop: '-42px' }}>
                {/* Glowing ring container */}
                <div className="rounded-full bg-blue-50 p-1.5 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                  <motion.button
                    onClick={() => setScanDrawerOpen(true, 'scan_bill')}
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                    className="relative flex items-center justify-center w-[58px] h-[58px] rounded-full select-none border-[3px] border-white"
                    style={{
                      background: 'linear-gradient(180deg, #60A5FA 0%, #3B82F6 100%)',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
                    }}
                  >
                    <item.icon size={26} className="text-white stroke-[2.2]" />
                  </motion.button>
                </div>
                <span className="text-[11px] font-medium tracking-wide text-blue-500 mt-1.5">
                  {item.label}
                </span>
              </div>
            );
          }

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center justify-center w-14 h-full select-none group pt-2"
            >
              {/* Icon & Label */}
              <motion.div
                animate={{
                  y: isActive ? -2 : 0,
                  scale: isActive ? 1.05 : 1
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="flex flex-col items-center justify-center space-y-1.5"
              >
                <div className={`relative flex items-center justify-center transition-colors duration-300 ${isActive ? 'text-blue-500' : 'text-slate-600'
                  }`}>
                  <item.icon size={24} className={isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'} />
                </div>

                <span className={`text-[10px] font-medium tracking-wide transition-colors duration-300 ${isActive ? 'text-blue-500' : 'text-slate-500'
                  }`}>
                  {item.label}
                </span>
              </motion.div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
