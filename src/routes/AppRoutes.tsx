import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { Skeleton } from '../components/ui/Skeleton';
import { type LucideIcon, CreditCard } from 'lucide-react';

// Lazy load the Dashboard page
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Inventory = lazy(() => import('../pages/Inventory'));
const Account = lazy(() => import('../pages/Account'));
const Sales = lazy(() => import('../pages/Sales'));

// Reusable elegant "Module Coming Soon" view
const ComingSoonModule: React.FC<{ moduleName: string; Icon: LucideIcon }> = ({ moduleName, Icon }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-brand-bg min-h-[calc(100vh-64px)]">
      <div className="p-5 bg-light-blue text-primary rounded-full mb-5 shadow-sm">
        <Icon size={32} className="stroke-[1.5]" />
      </div>
      <h2 className="text-xl font-bold text-text-primary mb-2">{moduleName} Module</h2>
      <p className="text-text-secondary text-sm max-w-[280px] leading-relaxed mb-6">
        This module is scheduled for development in the next phase of the ERP roadmap.
      </p>
      <div className="flex items-center space-x-2 text-xs text-primary font-bold bg-light-blue/50 px-4 py-2 rounded-full">
        <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
        <span>DEVELOPMENT QUEUED</span>
      </div>
    </div>
  );
};

export const AppRoutes: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div className="p-4 space-y-6 bg-brand-bg min-h-screen max-w-md mx-auto border-x border-brand-border">
          <div className="flex justify-between items-center py-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-6 w-44" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          <div className="h-44 bg-slate-100 rounded-[20px] animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-[18px] animate-pulse" />
            ))}
          </div>
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="sales" element={<Sales />} />
          <Route path="purchase" element={<ComingSoonModule moduleName="Purchases & Bills" Icon={CreditCard} />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="account" element={<Account />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};
export default AppRoutes;
