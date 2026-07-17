// ─────────────────────────────────────────────────────────────
// LocalStore: All ERP data is persisted in localStorage.
// This is the primary (always-available) data layer.
// Supabase is secondary (synced only when online + sync enabled).
// ─────────────────────────────────────────────────────────────

import type { Transaction, ProductStock, ParkedBill, ActivityLog } from '../store/useERPStore';

const KEYS = {
  transactions: 'erp_transactions',
  products: 'erp_products',
  parkedBills: 'erp_parked_bills',
  activities: 'erp_activities',
  profile: 'erp_profile',
  dbSyncEnabled: 'erp_db_sync_enabled',
} as const;

function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[LocalStore] Failed to save:', key, e);
  }
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ── Transactions ──
export const saveTransactions = (data: Transaction[]) => save(KEYS.transactions, data);
export const loadTransactions = (): Transaction[] => load<Transaction[]>(KEYS.transactions, []);

// ── Products ──
export const saveProducts = (data: ProductStock[]) => save(KEYS.products, data);
export const loadProducts = (): ProductStock[] => load<ProductStock[]>(KEYS.products, []);

// ── Parked Bills ──
export const saveParkedBills = (data: ParkedBill[]) => save(KEYS.parkedBills, data);
export const loadParkedBills = (): ParkedBill[] => load<ParkedBill[]>(KEYS.parkedBills, []);

// ── Activities ──
export const saveActivities = (data: ActivityLog[]) => save(KEYS.activities, data);
export const loadActivities = (): ActivityLog[] => load<ActivityLog[]>(KEYS.activities, []);

// ── Profile ──
export const saveProfile = (profile: { userName: string; businessName: string }) =>
  save(KEYS.profile, profile);
export const loadProfile = (): { userName: string; businessName: string } =>
  load(KEYS.profile, { userName: 'Admin', businessName: 'My Business' });

// ── DB Sync Toggle ──
export const loadDbSyncEnabled = (): boolean => load<boolean>(KEYS.dbSyncEnabled, true);
export const saveDbSyncEnabled = (enabled: boolean) => save(KEYS.dbSyncEnabled, enabled);

// ── Clear all local data (on logout) ──
export const clearLocalStore = () => {
  Object.values(KEYS).forEach(k => {
    // Keep dbSyncEnabled preference across logouts
    if (k !== KEYS.dbSyncEnabled) localStorage.removeItem(k);
  });
};
