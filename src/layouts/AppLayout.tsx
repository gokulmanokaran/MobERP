import React from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNavigation } from '../components/navigation/BottomNavigation';
import { ScanDrawer } from '../components/ui/ScanDrawer';

export const AppLayout: React.FC = () => {
  return (
    <div className="w-full max-w-md mx-auto h-screen bg-brand-bg flex flex-col relative shadow-xl shadow-slate-100 border-x border-brand-border">
      {/* Main Viewport Content */}
      <main className="flex-1 w-full overflow-y-auto pb-16">
        <Outlet />
      </main>

      {/* Bottom Nav Bar */}
      <BottomNavigation />

      {/* Global Scan Drawer Overlay */}
      <ScanDrawer />
    </div>
  );
};
export default AppLayout;
