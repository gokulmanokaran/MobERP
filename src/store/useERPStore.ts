import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import {
  loadTransactions, saveTransactions,
  loadProducts, saveProducts,
  loadParkedBills, saveParkedBills,
  loadActivities, saveActivities,
  loadProfile, saveProfile,
  loadDbSyncEnabled, saveDbSyncEnabled,
  clearLocalStore,
} from '../lib/localStore';

// ─────────────────────────── Types ───────────────────────────

export interface Transaction {
  id: string;
  date: string;
  type: 'sale' | 'purchase' | 'expense' | 'payment_received';
  description: string;
  amount: number;
  status: 'completed' | 'pending';
  partyName?: string;
  paymentMode?: 'cash' | 'card' | 'upi';
}

export interface CartItem {
  productId: string;
  sku: string;
  name: string;
  price: number;
  qty: number;
}

export interface ParkedBill {
  id: string;
  customerName: string;
  items: CartItem[];
  timestamp: number;
}

export interface ProductStock {
  id: string;
  name: string;
  stock: number;
  minStock: number;
  salesCount: number;
  revenue: number;
  sku: string;
  purchasePrice?: number;
  sellingPrice?: number;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  description: string;
}

// ─────────────────────────── State Interface ─────────────────

interface ERPState {
  userName: string;
  businessName: string;
  currentDate: string;

  todaySales: number;
  todayPurchase: number;
  todayExpense: number;
  todayProfit: number;
  yesterdaySales: number;
  yesterdayPurchase: number;
  yesterdayExpense: number;
  cashBalance: number;
  bankBalance: number;
  outstandingReceivables: number;
  outstandingPayables: number;
  pendingOrdersCount: number;

  chartSalesData: number[];
  chartExpensesData: number[];
  chartLabels: string[];

  transactions: Transaction[];
  topSellingProducts: ProductStock[];
  lowStockAlerts: ProductStock[];
  products: ProductStock[];
  activities: ActivityLog[];
  parkedBills: ParkedBill[];

  isLoading: boolean;
  isRefreshing: boolean;
  isScanDrawerOpen: boolean;
  scanDrawerTab: 'menu' | 'scan_feed' | 'scan_bill' | 'feed_form' | 'bill_checkout' | 'held_bills';
  dbError: string | null;

  // Offline-first control
  dbSyncEnabled: boolean;
  isOnline: boolean;
  isSyncing: boolean;

  setLoading: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  setDbSyncEnabled: (enabled: boolean) => Promise<void>;
  setOnline: (online: boolean) => void;
  loadAllData: () => Promise<void>;
  clearData: () => void;
  addTransaction: (tx: Omit<Transaction, 'id' | 'date'>) => Promise<void>;
  finalizeBill: (bill: {
    cart: CartItem[];
    customerName: string;
    paymentMode: 'cash' | 'card' | 'upi';
    invoiceNo: string;
  }) => Promise<Transaction>;
  refreshDashboard: () => Promise<void>;
  updateProfile: (name: string, business: string) => Promise<void>;
  setScanDrawerOpen: (open: boolean, tab?: 'menu' | 'scan_feed' | 'scan_bill' | 'feed_form' | 'bill_checkout' | 'held_bills') => void;
  addProduct: (product: Omit<ProductStock, 'id' | 'salesCount' | 'revenue'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<ProductStock>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  parkBill: (bill: Omit<ParkedBill, 'id' | 'timestamp'>) => Promise<void>;
  removeParkedBill: (id: string) => Promise<void>;
  syncToCloud: () => Promise<void>;
  resetAllData: (isRemoteReset?: boolean) => Promise<void>;
}

// ─────────────────────────── Helpers ─────────────────────────

const toLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const computeDashboardState = (transactions: Transaction[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toLocalDateString(today);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toLocalDateString(yesterday);

  const chartLabels = Array(6).fill('').map((_, index) => {
    const day = new Date(today);
    day.setDate(day.getDate() - (5 - index));
    return index < 5 ? day.toLocaleDateString('en-US', { weekday: 'short' }) : 'Today';
  });

  let chartSalesData: number[] = [0, 0, 0, 0, 0, 0];
  let chartExpensesData: number[] = [0, 0, 0, 0, 0, 0];
  const chartKeys = Array(6).fill('').map((_, index) => {
    const day = new Date(today);
    day.setDate(day.getDate() - (5 - index));
    return toLocalDateString(day);
  });

  let todaySales = 0;
  let todayPurchase = 0;
  let todayExpense = 0;
  let yesterdaySales = 0;
  let yesterdayPurchase = 0;
  let yesterdayExpense = 0;
  let cashBalance = 0;
  let bankBalance = 0;

  for (const tx of transactions) {
    const txDate = tx.date.split(' ')[0];
    const isToday = txDate === todayKey;
    const isYesterday = txDate === yesterdayKey;
    const paymentMode = tx.paymentMode || 'cash';

    const addBalance = (amount: number) => {
      if (paymentMode === 'cash') cashBalance += amount;
      else bankBalance += amount;
    };
    const subtractBalance = (amount: number) => {
      if (paymentMode === 'cash') cashBalance -= amount;
      else bankBalance -= amount;
    };

    if (tx.type === 'sale') {
      if (isToday) todaySales += tx.amount;
      if (isYesterday) yesterdaySales += tx.amount;
      if (tx.status === 'completed') addBalance(tx.amount);
    } else if (tx.type === 'purchase') {
      if (isToday) todayPurchase += tx.amount;
      if (isYesterday) yesterdayPurchase += tx.amount;
      if (tx.status === 'completed') subtractBalance(tx.amount);
    } else if (tx.type === 'expense') {
      if (isToday) todayExpense += tx.amount;
      if (isYesterday) yesterdayExpense += tx.amount;
      subtractBalance(tx.amount);
    } else if (tx.type === 'payment_received') {
      addBalance(tx.amount);
    }

    const chartIndex = chartKeys.indexOf(txDate);
    if (chartIndex >= 0) {
      if (tx.type === 'sale') chartSalesData[chartIndex] += tx.amount;
      if (tx.type === 'expense') chartExpensesData[chartIndex] += tx.amount;
    }
  }



  return {
    todaySales,
    todayPurchase,
    todayExpense,
    todayProfit: todaySales - todayPurchase - todayExpense,
    yesterdaySales,
    yesterdayPurchase,
    yesterdayExpense,
    cashBalance,
    bankBalance,
    chartSalesData,
    chartExpensesData,
    chartLabels,
  };
};

const getUserId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
};

const deriveProductStats = (products: ProductStock[]) => ({
  lowStockAlerts: products.filter(p => p.stock <= p.minStock),
  topSellingProducts: [...products].sort((a, b) => b.salesCount - a.salesCount).slice(0, 5),
});

const mergeById = <T extends { id: string }>(local: T[], cloud: T[]) => {
  const map = new Map<string, T>();
  local.forEach(item => map.set(item.id, item));
  cloud.forEach(item => {
    if (!map.has(item.id)) map.set(item.id, item);
  });
  return Array.from(map.values());
};

const emptyState = {
  todaySales: 0, todayPurchase: 0, todayExpense: 0, todayProfit: 0,
  yesterdaySales: 0, yesterdayPurchase: 0, yesterdayExpense: 0,
  cashBalance: 0, bankBalance: 0, outstandingReceivables: 0,
  outstandingPayables: 0, pendingOrdersCount: 0,
  chartSalesData: [1, 1, 1, 1, 1, 1], chartExpensesData: [1, 1, 1, 1, 1, 1], chartLabels: ['', '', '', '', '', 'Today'],
  transactions: [] as Transaction[], topSellingProducts: [] as ProductStock[],
  lowStockAlerts: [] as ProductStock[], products: [] as ProductStock[],
  activities: [] as ActivityLog[], parkedBills: [] as ParkedBill[],
};

// ─────────────────────────── Store ───────────────────────────

export const useERPStore = create<ERPState>((set, get) => {
  // Load initial values from localStorage synchronously (instant, no await)
  const localProfile = loadProfile();

  return {
    userName: localProfile.userName,
    businessName: localProfile.businessName,
    currentDate: new Date().toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    }),
    ...emptyState,
    isLoading: true,
    isRefreshing: false,
    isScanDrawerOpen: false,
    scanDrawerTab: 'menu',
    dbError: null,
    dbSyncEnabled: loadDbSyncEnabled(),
    isOnline: navigator.onLine,
    isSyncing: false,

    setLoading: (loading) => set({ isLoading: loading }),
    setRefreshing: (refreshing) => set({ isRefreshing: refreshing }),
    setOnline: (online) => set({ isOnline: online }),

    setDbSyncEnabled: async (enabled) => {
      saveDbSyncEnabled(enabled);
      set({ dbSyncEnabled: enabled });
      if (enabled && navigator.onLine) {
        // When turning sync ON, immediately sync to cloud
        await get().syncToCloud();
      }
    },

    // ── Load all data: localStorage first (instant), then cloud merge if online+sync ──
    loadAllData: async () => {
      const userId = await getUserId();
      if (!userId) {
        set({ ...emptyState, isLoading: false });
        return;
      }

      // 1. Load from localStorage immediately (no flicker, no lag)
      const localProducts = loadProducts();
      const localTransactions = loadTransactions();
      const localActivities = loadActivities();
      const localParkedBills = loadParkedBills();
      const localProfile = loadProfile();

      set({
        products: localProducts,
        transactions: localTransactions,
        activities: localActivities,
        parkedBills: localParkedBills,
        userName: localProfile.userName,
        businessName: localProfile.businessName,
        ...computeDashboardState(localTransactions),
        ...deriveProductStats(localProducts),
        isLoading: false,
        dbError: null,
      });

      // 2. If online AND sync enabled, fetch from Supabase in background to merge cloud data
      const { dbSyncEnabled } = get();
      if (dbSyncEnabled && navigator.onLine) {
        try {
          const [productsRes, transactionsRes, activitiesRes, parkedRes] = await Promise.all([
            supabase.from('products').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
            supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
            supabase.from('activities').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
            supabase.from('parked_bills').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
          ]);

          // Profile
          let cloudUserName = localProfile.userName;
          let cloudBusinessName = localProfile.businessName;
          try {
            const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
            if (profileData) {
              cloudUserName = profileData.user_name;
              cloudBusinessName = profileData.business_name;
            }
          } catch { /* profiles table may not exist yet */ }

          if (!productsRes.error && !transactionsRes.error) {
            
            // Check for remote reset markers
            const cloudActivities = activitiesRes.data || [];
            const resetMarkers = cloudActivities.filter(a => a.id.startsWith('RESET-ALL-DATA-'));
            if (resetMarkers.length > 0) {
              const latestReset = Math.max(...resetMarkers.map(a => parseInt(a.id.split('-').pop() || '0')));
              const localReset = Number(localStorage.getItem('erp_last_reset') || '0');
              if (latestReset > localReset) {
                localStorage.setItem('erp_last_reset', latestReset.toString());
                get().resetAllData(true);
                setTimeout(() => window.location.reload(), 50);
                return;
              }
            }
            const products: ProductStock[] = mergeById(localProducts, (productsRes.data || []).map(p => ({
              id: p.id, sku: p.sku, name: p.name,
              stock: p.stock, minStock: p.minStock,
              purchasePrice: p.purchasePrice, sellingPrice: p.sellingPrice,
              salesCount: p.salesCount, revenue: p.revenue,
            })));

            const transactions: Transaction[] = mergeById(localTransactions, (transactionsRes.data || []).map(t => ({
              id: t.id, date: t.date, type: t.type,
              description: t.description, amount: t.amount,
              status: t.status, partyName: t.partyName,
              paymentMode: t.paymentMode,
            })));

            const activities: ActivityLog[] = mergeById(localActivities, cloudActivities
              .filter(a => !a.id.startsWith('RESET-ALL-DATA-'))
              .map(a => ({
                id: a.id, timestamp: a.timestamp, type: a.type, description: a.description,
              }))
            );

            const parkedBills: ParkedBill[] = mergeById(localParkedBills, (parkedRes.data || []).map(pb => ({
              id: pb.id, customerName: pb.customerName,
              items: pb.items, timestamp: pb.timestamp,
            })));

            // Save merged data back to localStorage for future offline use
            saveProducts(products);
            saveTransactions(transactions);
            saveActivities(activities);
            saveParkedBills(parkedBills);
            saveProfile({ userName: cloudUserName, businessName: cloudBusinessName });

            set({
              products, transactions, activities, parkedBills,
              userName: cloudUserName, businessName: cloudBusinessName,
              ...computeDashboardState(transactions),
              ...deriveProductStats(products),
              isRefreshing: false,
            });
          }
        } catch (e) {
          // Cloud fetch failed — silently stay with local data
          console.warn('[Offline-First] Cloud sync failed, using local data:', e);
        }
      }
    },

    // ── Push all local data to Supabase (manual or auto when going online) ──
    syncToCloud: async () => {
      const userId = await getUserId();
      if (!userId || !navigator.onLine) return;

      set({ isSyncing: true });
      try {
        const { products, transactions, activities, parkedBills, userName, businessName } = get();

        await Promise.allSettled([
          // Upsert products
          supabase.from('products').upsert(
            products.map(p => ({
              id: p.id, sku: p.sku, name: p.name, stock: p.stock, minStock: p.minStock,
              purchasePrice: p.purchasePrice, sellingPrice: p.sellingPrice,
              salesCount: p.salesCount, revenue: p.revenue, user_id: userId,
            })),
            { onConflict: 'id' }
          ),
          // Upsert transactions
          supabase.from('transactions').upsert(
            transactions.map(t => ({
              id: t.id, date: t.date, type: t.type, description: t.description,
              amount: t.amount, status: t.status, partyName: t.partyName,
              paymentMode: t.paymentMode, user_id: userId,
            })),
            { onConflict: 'id' }
          ),
          // Upsert activities
          supabase.from('activities').upsert(
            activities.slice(0, 30).map(a => ({
              id: a.id, timestamp: a.timestamp, type: a.type,
              description: a.description, user_id: userId,
            })),
            { onConflict: 'id' }
          ),
          // Upsert parked bills
          supabase.from('parked_bills').upsert(
            parkedBills.map(pb => ({
              id: pb.id, customerName: pb.customerName,
              items: pb.items, timestamp: pb.timestamp, user_id: userId,
            })),
            { onConflict: 'id' }
          ),
          // Upsert profile
          supabase.from('profiles').upsert({
            id: userId, user_name: userName, business_name: businessName,
            updated_at: new Date().toISOString(),
          }),
        ]);
      } catch (e) {
        console.warn('[Sync] Cloud sync failed:', e);
      } finally {
        set({ isSyncing: false });
      }
    },

    // ── Clear data on logout ──
    clearData: () => {
      clearLocalStore();
      set({ ...emptyState, isLoading: false });
    },

    // ── Add Transaction: localStorage first, background cloud ──
    addTransaction: async (tx) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = `${now.getMonth() + 1}`.padStart(2, '0');
      const day = `${now.getDate()}`.padStart(2, '0');
      const hours = `${now.getHours()}`.padStart(2, '0');
      const minutes = `${now.getMinutes()}`.padStart(2, '0');

      const newTx: Transaction = {
        ...tx,
        id: `TX-${Date.now()}`,
        date: `${year}-${month}-${day} ${hours}:${minutes}`,
      };

      set(state => {
        const transactions = [newTx, ...state.transactions];
        saveTransactions(transactions); // localStorage (instant)
        return { transactions, ...computeDashboardState(transactions) };
      });

      const newActivity: ActivityLog = {
        id: `ACT-${Date.now()}`,
        timestamp: 'Just now',
        type: tx.type === 'expense' ? 'warning' : tx.type === 'purchase' ? 'info' : 'success',
        description: `${tx.description} of ₹${tx.amount.toLocaleString('en-IN')} recorded.`,
      };
      set(state => {
        const activities = [newActivity, ...state.activities.slice(0, 49)];
        saveActivities(activities);
        return { activities };
      });

      // Background cloud sync
      const { dbSyncEnabled } = get();
      if (dbSyncEnabled && navigator.onLine) {
        const userId = await getUserId();
        if (userId) {
          supabase.from('transactions').insert({
            id: newTx.id, date: newTx.date, type: newTx.type,
            description: newTx.description, amount: newTx.amount,
            status: newTx.status, partyName: newTx.partyName,
            paymentMode: newTx.paymentMode, user_id: userId,
          }).then(({ error }) => { if (error) console.warn('[Sync] tx insert failed:', error.message); });
          supabase.from('activities').insert({
            id: newActivity.id, timestamp: newActivity.timestamp,
            type: newActivity.type, description: newActivity.description, user_id: userId,
          }).then(({ error }) => { if (error) console.warn('[Sync] activity insert failed:', error.message); });
        }
      }
    },

    finalizeBill: async ({ cart, customerName, paymentMode, invoiceNo }) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = `${now.getMonth() + 1}`.padStart(2, '0');
      const day = `${now.getDate()}`.padStart(2, '0');
      const hours = `${now.getHours()}`.padStart(2, '0');
      const minutes = `${now.getMinutes()}`.padStart(2, '0');
      const totalAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

      const newTx: Transaction = {
        id: `TX-${Date.now()}`,
        date: `${year}-${month}-${day} ${hours}:${minutes}`,
        type: 'sale',
        description: `Invoice #${invoiceNo} (POS Scan)`,
        amount: totalAmount,
        status: 'completed',
        partyName: customerName,
        paymentMode,
      };

      const updatedProducts = get().products.map((product) => {
        const line = cart.find((item) => item.productId === product.id);
        if (!line) return product;
        return {
          ...product,
          stock: Math.max(0, product.stock - line.qty),
          salesCount: product.salesCount + line.qty,
          revenue: product.revenue + line.price * line.qty,
        };
      });

      const transactions = [newTx, ...get().transactions];
      const newActivity: ActivityLog = {
        id: `ACT-${Date.now()}`,
        timestamp: 'Just now',
        type: 'success',
        description: `Invoice #${invoiceNo} generated for ₹${totalAmount.toLocaleString('en-IN')}.`,
      };
      const activities = [newActivity, ...get().activities.slice(0, 49)];

      saveProducts(updatedProducts);
      saveTransactions(transactions);
      saveActivities(activities);

      set({
        products: updatedProducts,
        transactions,
        activities,
        ...computeDashboardState(transactions),
        ...deriveProductStats(updatedProducts),
      });

      const { dbSyncEnabled } = get();
      if (dbSyncEnabled && navigator.onLine) {
        const userId = await getUserId();
        if (userId) {
          supabase.from('transactions').insert({
            id: newTx.id, date: newTx.date, type: newTx.type,
            description: newTx.description, amount: newTx.amount,
            status: newTx.status, partyName: newTx.partyName,
            paymentMode: newTx.paymentMode, user_id: userId,
          }).then(({ error }) => { if (error) console.warn('[Sync] tx insert failed:', error.message); });

          supabase.from('activities').insert({
            id: newActivity.id, timestamp: newActivity.timestamp,
            type: newActivity.type, description: newActivity.description, user_id: userId,
          }).then(({ error }) => { if (error) console.warn('[Sync] activity insert failed:', error.message); });

          supabase.from('products').upsert(
            updatedProducts.map(p => ({
              id: p.id, sku: p.sku, name: p.name, stock: p.stock, minStock: p.minStock,
              purchasePrice: p.purchasePrice, sellingPrice: p.sellingPrice,
              salesCount: p.salesCount, revenue: p.revenue, user_id: userId,
            })),
            { onConflict: 'id' }
          ).then(({ error }) => { if (error) console.warn('[Sync] product upsert failed:', error.message); });
        }
      }

      return newTx;
    },

    refreshDashboard: async () => {
      set({ isRefreshing: true });
      await get().loadAllData();
      set({ isRefreshing: false });
    },

    updateProfile: async (name, business) => {
      set({ userName: name, businessName: business });
      saveProfile({ userName: name, businessName: business });

      const { dbSyncEnabled } = get();
      if (dbSyncEnabled && navigator.onLine) {
        const userId = await getUserId();
        if (userId) {
          supabase.from('profiles').upsert({
            id: userId, user_name: name, business_name: business,
            updated_at: new Date().toISOString(),
          }).then(({ error }) => { if (error) console.warn('[Sync] profile upsert failed:', error.message); });
        }
      }
    },

    setScanDrawerOpen: (open, tab = 'menu') => set({ isScanDrawerOpen: open, scanDrawerTab: tab }),

    addProduct: async (product) => {
      const newProduct: ProductStock = {
        ...product, id: `P-${Date.now()}`, salesCount: 0, revenue: 0,
      };

      set(state => {
        const products = [...state.products, newProduct];
        saveProducts(products);
        return { products, ...deriveProductStats(products) };
      });

      const newActivity: ActivityLog = {
        id: `ACT-${Date.now()}`,
        timestamp: 'Just now',
        type: 'info',
        description: `Product "${product.name}" (${product.sku}) registered into inventory.`,
      };
      set(state => {
        const activities = [newActivity, ...state.activities.slice(0, 49)];
        saveActivities(activities);
        return { activities };
      });

      const { dbSyncEnabled } = get();
      if (dbSyncEnabled && navigator.onLine) {
        const userId = await getUserId();
        if (userId) {
          supabase.from('products').insert({
            id: newProduct.id, sku: newProduct.sku, name: newProduct.name,
            stock: newProduct.stock, minStock: newProduct.minStock,
            purchasePrice: newProduct.purchasePrice, sellingPrice: newProduct.sellingPrice,
            salesCount: 0, revenue: 0, user_id: userId,
          }).then(({ error }) => { if (error) console.warn('[Sync] product insert failed:', error.message); });
          supabase.from('activities').insert({
            id: newActivity.id, timestamp: newActivity.timestamp,
            type: newActivity.type, description: newActivity.description, user_id: userId,
          }).then(({ error }) => { if (error) console.warn('[Sync] activity insert failed:', error.message); });
        }
      }
    },

    updateProduct: async (id, updates) => {
      set(state => {
        const products = state.products.map(p => p.id === id ? { ...p, ...updates } : p);
        saveProducts(products);
        return { products, ...deriveProductStats(products) };
      });

      const { dbSyncEnabled } = get();
      if (dbSyncEnabled && navigator.onLine) {
        const userId = await getUserId();
        if (userId) {
          const dbUpdates: Record<string, unknown> = {};
          if (updates.name !== undefined) dbUpdates.name = updates.name;
          if (updates.sku !== undefined) dbUpdates.sku = updates.sku;
          if (updates.stock !== undefined) dbUpdates.stock = updates.stock;
          if (updates.minStock !== undefined) dbUpdates.minStock = updates.minStock;
          if (updates.purchasePrice !== undefined) dbUpdates.purchasePrice = updates.purchasePrice;
          if (updates.sellingPrice !== undefined) dbUpdates.sellingPrice = updates.sellingPrice;
          if (updates.salesCount !== undefined) dbUpdates.salesCount = updates.salesCount;
          if (updates.revenue !== undefined) dbUpdates.revenue = updates.revenue;
          supabase.from('products').update(dbUpdates).eq('id', id).eq('user_id', userId)
            .then(({ error }) => { if (error) console.warn('[Sync] product update failed:', error.message); });
        }
      }
    },

    deleteProduct: async (id) => {
      set(state => {
        const products = state.products.filter(p => p.id !== id);
        saveProducts(products);
        return { products, ...deriveProductStats(products) };
      });

      const { dbSyncEnabled } = get();
      if (dbSyncEnabled && navigator.onLine) {
        const userId = await getUserId();
        if (userId) {
          supabase.from('products').delete().eq('id', id).eq('user_id', userId)
            .then(({ error }) => { if (error) console.warn('[Sync] product delete failed:', error.message); });
        }
      }
    },

    parkBill: async (bill) => {
      const newParkedBill: ParkedBill = {
        ...bill, id: `PB-${Date.now()}`, timestamp: Date.now(),
      };

      set(state => {
        const parkedBills = [newParkedBill, ...state.parkedBills];
        saveParkedBills(parkedBills);
        return { parkedBills };
      });

      const { dbSyncEnabled } = get();
      if (dbSyncEnabled && navigator.onLine) {
        const userId = await getUserId();
        if (userId) {
          supabase.from('parked_bills').insert({
            id: newParkedBill.id, customerName: newParkedBill.customerName,
            items: newParkedBill.items, timestamp: newParkedBill.timestamp, user_id: userId,
          }).then(({ error }) => { if (error) console.warn('[Sync] park bill failed:', error.message); });
        }
      }
    },

    removeParkedBill: async (id) => {
      set(state => {
        const parkedBills = state.parkedBills.filter(pb => pb.id !== id);
        saveParkedBills(parkedBills);
        return { parkedBills };
      });

      const { dbSyncEnabled } = get();
      if (dbSyncEnabled && navigator.onLine) {
        const userId = await getUserId();
        if (userId) {
          supabase.from('parked_bills').delete().eq('id', id).eq('user_id', userId)
            .then(({ error }) => { if (error) console.warn('[Sync] remove parked bill failed:', error.message); });
        }
      }
    },

    resetAllData: async (isRemoteReset = false) => {
      const { dbSyncEnabled } = get();
      if (!isRemoteReset && dbSyncEnabled && navigator.onLine) {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (userId) {
          try {
            await Promise.all([
              supabase.from('transactions').delete().eq('user_id', userId),
              supabase.from('products').delete().eq('user_id', userId),
              supabase.from('activities').delete().eq('user_id', userId),
              supabase.from('parked_bills').delete().eq('user_id', userId)
            ]);
            
            // Set a remote marker so other devices know to reset locally
            const resetTimestamp = Date.now();
            localStorage.setItem('erp_last_reset', resetTimestamp.toString());
            await supabase.from('activities').insert({
              id: `RESET-ALL-DATA-${resetTimestamp}`,
              timestamp: new Date().toISOString(),
              type: 'danger',
              description: 'SYSTEM_RESET_MARKER',
              user_id: userId
            });
          } catch (e) {
            console.error('[Sync] Failed to delete cloud data:', e);
          }
        }
      }

      clearLocalStore();
      set({
        transactions: [],
        products: [],
        parkedBills: [],
        activities: [],
        todaySales: 0,
        todayPurchase: 0,
        todayExpense: 0,
        todayProfit: 0,
        yesterdaySales: 0,
        yesterdayExpense: 0,
        cashBalance: 0,
        bankBalance: 0,
        outstandingReceivables: 0,
        outstandingPayables: 0,
        pendingOrdersCount: 0,
        chartSalesData: [0, 0, 0, 0, 0, 0],
        chartExpensesData: [0, 0, 0, 0, 0, 0],
        topSellingProducts: [],
        lowStockAlerts: []
      });
    },
  };
});
