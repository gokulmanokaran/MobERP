import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { AppRoutes } from './routes/AppRoutes';
import { useERPStore } from './store/useERPStore';
import { useAuthStore } from './store/useAuthStore';
import { Login } from './pages/Login';
import dicLogo from './assets/DIC no back.png';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

const GlobalLoader = () => {
  const { isLoading } = useERPStore();

  // No overlay for offline anymore — app works offline!
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/90 backdrop-blur-md"
        >
          <div className="relative flex items-center justify-center w-12 h-12">
            <div className="absolute inset-0 border-[2.5px] border-slate-100 border-t-primary rounded-full animate-spin shadow-sm"></div>
            <img src={dicLogo} alt="Logo" className="w-7 h-7 object-contain animate-pulse relative z-10" />
          </div>
          <div className="mt-5 text-center px-6">
            <p className="text-primary font-bold text-xs animate-pulse uppercase tracking-[0.2em]">Loading</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const AppContent: React.FC = () => {
  const { user, isAuthLoading, initialize } = useAuthStore();
  const loadAllData = useERPStore(s => s.loadAllData);
  const setOnline = useERPStore(s => s.setOnline);
  const syncToCloud = useERPStore(s => s.syncToCloud);
  const dbSyncEnabled = useERPStore(s => s.dbSyncEnabled);

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Track online/offline and auto-sync when coming back online
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      if (dbSyncEnabled) syncToCloud();
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline, syncToCloud, dbSyncEnabled]);

  // Load all data when user logs in
  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user, loadAllData]);

  // Show nothing while auth is being determined
  if (isAuthLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white">
        <div className="relative flex items-center justify-center w-12 h-12">
          <div className="absolute inset-0 border-[2.5px] border-slate-100 border-t-primary rounded-full animate-spin"></div>
          <img src={dicLogo} alt="Logo" className="w-7 h-7 object-contain animate-pulse relative z-10" />
        </div>
      </div>
    );
  }

  // Not logged in → show login
  if (!user) {
    return <Login />;
  }

  // Logged in → show app
  return (
    <>
      <GlobalLoader />
      <AppRoutes />
    </>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
