import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, type LucideIcon } from 'lucide-react';

interface FABAction {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  color?: string;
}

interface FABProps {
  actions?: FABAction[];
  mainIcon?: LucideIcon;
  onClickMain?: () => void;
}

export const FAB: React.FC<FABProps> = ({
  actions = [],
  mainIcon: MainIcon = Plus,
  onClickMain,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => {
    if (actions.length === 0) {
      if (onClickMain) onClickMain();
      return;
    }
    setIsOpen(!isOpen);
  };

  const handleActionClick = (actionFn: () => void) => {
    actionFn();
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-24 right-5 z-40 flex flex-col items-end space-y-3">
      {/* Sub-actions menu */}
      <AnimatePresence>
        {isOpen && actions.length > 0 && (
          <div className="flex flex-col items-end space-y-2 mb-1">
            {actions.map((act, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 15 }}
                transition={{ duration: 0.15, delay: index * 0.03 }}
                className="flex items-center space-x-3 pointer-events-auto cursor-pointer"
                onClick={() => handleActionClick(act.onClick)}
              >
                {/* Floating label */}
                <div className="bg-text-primary text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-md select-none">
                  {act.label}
                </div>
                {/* Small button */}
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer ${
                    act.color || 'bg-secondary'
                  }`}
                >
                  <act.icon size={20} className="stroke-[2]" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/10 backdrop-blur-[1px] z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main button */}
      <motion.button
        onClick={toggleOpen}
        whileTap={{ scale: 0.94 }}
        animate={isOpen ? { rotate: 135 } : { rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-xl shadow-primary/30 z-40 relative outline-none select-none"
        aria-label="Add entry"
      >
        <MainIcon size={26} className="stroke-[2.5]" />
      </motion.button>
    </div>
  );
};
