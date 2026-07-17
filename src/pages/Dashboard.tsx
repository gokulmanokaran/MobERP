import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Landmark,
  Clock,
  Search,
  Filter,
  AlertTriangle,
  FileText,
  Users,
  Package,
  PlusCircle,
  X,
  CheckCircle2
} from 'lucide-react';
import { useERPStore } from '../store/useERPStore';
import { PullToRefresh } from '../components/ui/PullToRefresh';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';

// Custom lightweight SVG Curved Area Chart
const CurvedAreaChart: React.FC<{ data: number[]; color: string; id: string }> = ({ data, color, id }) => {
  const max = Math.max(...data) * 1.1;
  const min = Math.min(...data) * 0.9;
  const range = max - min;
  const width = 320;
  const height = 120;

  const points = useMemo(() => {
    return data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 20) - 10;
      return { x, y };
    });
  }, [data, min, range]);

  // Generate cubic bezier curve path
  const pathD = useMemo(() => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return d;
  }, [points]);

  const closedPathD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.00" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="#D6E8F7" strokeWidth="0.5" strokeDasharray="4 4" />
      <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="#D6E8F7" strokeWidth="0.5" strokeDasharray="4 4" />
      <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="#D6E8F7" strokeWidth="0.5" strokeDasharray="4 4" />

      {/* Area path */}
      <motion.path
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        d={closedPathD}
        fill={`url(#grad-${id})`}
      />
      {/* Curve line */}
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: 'easeInOut' }}
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Points */}
      {points.map((p, i) => (
        <motion.circle
          key={i}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5 + i * 0.05, type: 'spring' }}
          cx={p.x}
          cy={p.y}
          r="4"
          fill="#FFFFFF"
          stroke={color}
          strokeWidth="2"
        />
      ))}
    </svg>
  );
};

// Custom lightweight SVG Bar Chart
const BarChart: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const max = Math.max(...data) * 1.1;
  const width = 320;
  const height = 120;
  const barWidth = 26;
  const gap = (width - barWidth * data.length) / (data.length - 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
      {data.map((val, i) => {
        const barHeight = (val / max) * (height - 20);
        const x = i * (barWidth + gap);
        const y = height - barHeight;
        return (
          <g key={i}>
            <motion.rect
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
              style={{ originY: '120px' }}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="6"
              fill={color}
              className="opacity-90"
            />
          </g>
        );
      })}
    </svg>
  );
};

export const Dashboard: React.FC = () => {
  const {
    userName,
    todaySales,
    todayPurchase,
    todayExpense,
    todayProfit,
    yesterdaySales,
    yesterdayPurchase,
    yesterdayExpense,
    cashBalance,
    bankBalance,
    outstandingReceivables,
    outstandingPayables,
    pendingOrdersCount,
    chartSalesData,
    chartExpensesData,
    chartLabels,
    transactions,
    topSellingProducts,
    lowStockAlerts,
    activities,
    addTransaction,
    refreshDashboard,
  } = useERPStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'purchase' | 'expense' | 'payment_received'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formDefaultType, setFormDefaultType] = useState<'sale' | 'purchase' | 'expense' | 'payment_received'>('sale');

  const handleRefresh = useCallback(async () => {
    await refreshDashboard();
  }, [refreshDashboard]);

  // React Hook Form for slide-up sheet
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{
    partyName: string;
    amount: number;
    description: string;
    status: 'completed' | 'pending';
  }>();

  const openFormDrawer = (type: 'sale' | 'purchase' | 'expense' | 'payment_received') => {
    setFormDefaultType(type);
    reset();
    setIsFormOpen(true);
  };

  const onSubmit = (data: {
    partyName: string;
    amount: number;
    description: string;
    status: 'completed' | 'pending';
  }) => {
    addTransaction({
      type: formDefaultType,
      partyName: data.partyName,
      amount: Number(data.amount),
      description: data.description,
      status: data.status,
    });
    setIsFormOpen(false);
  };

  // Filtered transactions computation
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.partyName && tx.partyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        tx.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter = filterType === 'all' || tx.type === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [transactions, searchTerm, filterType]);

  const metricsData = useMemo(() => {
    const calcPerc = (current: number, prev: number) => {
      if (prev === 0) return current > 0 ? 100 : 0;
      return ((current - prev) / prev) * 100;
    };

    return {
      salesPerc: calcPerc(todaySales, yesterdaySales),
      expensePerc: calcPerc(todayExpense, yesterdayExpense),
      margin: todaySales > 0 ? (todayProfit / todaySales) * 100 : 0,
    };
  }, [todaySales, yesterdaySales, todayExpense, yesterdayExpense, todayProfit]);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="pb-12 bg-brand-bg min-h-screen relative text-text-primary px-4">
        {/* TOP STATUS BAR SPACE / HEADER */}
        <header className="pt-6 pb-4 flex justify-between items-center">
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
            Dashboard
          </h1>
          <div className="w-10 h-10 rounded-full bg-light-blue border border-brand-border flex items-center justify-center font-bold text-primary select-none text-sm shadow-sm">
            {userName.split(' ').map(n => n[0]).join('')}
          </div>
        </header>

        {/* PRIMARY FINANCIAL CARD (CASH & BANK) */}
        <section className="mb-5">
          <div className="p-5 bg-gradient-to-tr from-primary to-secondary text-white rounded-[20px] shadow-lg shadow-primary/20 space-y-4">
            <div className="flex justify-between items-center opacity-90">
              <span className="text-xs font-semibold tracking-wider uppercase">Total Liquidity Balance</span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">LIVE SYNCED</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight">
              ₹{(cashBalance + bankBalance).toLocaleString('en-IN')}
            </h2>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/10">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                  <Wallet size={16} className="text-accent-blue" />
                </div>
                <div>
                  <span className="text-[10px] text-white/70 block font-medium">Cash Balance</span>
                  <span className="text-xs font-bold">₹{cashBalance.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                  <Landmark size={16} className="text-accent-blue" />
                </div>
                <div>
                  <span className="text-[10px] text-white/70 block font-medium">Bank Accounts</span>
                  <span className="text-xs font-bold">₹{bankBalance.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FINANCIAL SUMMARY METRICS GRID */}
        <section className="mb-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary px-1">Today's Operations</h3>
          <div className="grid grid-cols-2 gap-3">
            {/* Sales Card */}
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="p-4 bg-brand-surface border border-brand-border rounded-[18px] flex flex-col justify-between"
            >
              <div className="flex justify-between items-center text-text-secondary mb-1">
                <span className="text-xs font-semibold">Today's Sales</span>
                <span className="text-success bg-success/10 p-1 rounded-full"><TrendingUp size={14} /></span>
              </div>
              <h4 className="text-lg font-bold text-text-primary">₹{todaySales.toLocaleString('en-IN')}</h4>
              <span className={`text-[10px] font-medium mt-1 ${metricsData.salesPerc >= 0 ? 'text-success' : 'text-danger'}`}>
                {metricsData.salesPerc >= 0 ? '▲' : '▼'} {Math.abs(metricsData.salesPerc).toFixed(1)}% vs yesterday
              </span>
            </motion.div>

            {/* Purchase Card */}
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="p-4 bg-brand-surface border border-brand-border rounded-[18px] flex flex-col justify-between"
            >
              <div className="flex justify-between items-center text-text-secondary mb-1">
                <span className="text-xs font-semibold">Purchases</span>
                <span className="text-primary bg-light-blue p-1 rounded-full"><TrendingDown size={14} /></span>
              </div>
              <h4 className="text-lg font-bold text-text-primary">₹{todayPurchase.toLocaleString('en-IN')}</h4>
              <span className="text-[10px] text-text-secondary font-medium mt-1">Based on records</span>
            </motion.div>

            {/* Expense Card */}
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="p-4 bg-brand-surface border border-brand-border rounded-[18px] flex flex-col justify-between"
            >
              <div className="flex justify-between items-center text-text-secondary mb-1">
                <span className="text-xs font-semibold">Expenses</span>
                <span className="text-danger bg-danger/10 p-1 rounded-full"><TrendingDown size={14} /></span>
              </div>
              <h4 className="text-lg font-bold text-text-primary">₹{todayExpense.toLocaleString('en-IN')}</h4>
              <span className={`text-[10px] font-medium mt-1 ${metricsData.expensePerc <= 0 ? 'text-success' : 'text-danger'}`}>
                {metricsData.expensePerc <= 0 ? '▼' : '▲'} {Math.abs(metricsData.expensePerc).toFixed(1)}% vs yesterday
              </span>
            </motion.div>

            {/* Net Profit Card */}
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="p-4 bg-brand-surface border border-brand-border rounded-[18px] flex flex-col justify-between"
            >
              <div className="flex justify-between items-center text-text-secondary mb-1">
                <span className="text-xs font-semibold">Today's Profit</span>
                <span className="text-success bg-success/10 p-1 rounded-full"><TrendingUp size={14} /></span>
              </div>
              <h4 className="text-lg font-bold text-success">₹{todayProfit.toLocaleString('en-IN')}</h4>
              <span className="text-[10px] text-success font-medium mt-1">Margin: {metricsData.margin.toFixed(1)}%</span>
            </motion.div>
          </div>
        </section>

        {/* OUTSTANDING METRICS SUB-BAR */}
        <section className="grid grid-cols-3 gap-2 mb-5">
          <div className="p-3 bg-white border border-brand-border rounded-[14px] flex flex-col items-center justify-center text-center">
            <span className="text-[9px] font-semibold text-text-secondary uppercase">Receivables</span>
            <span className="text-xs font-bold text-text-primary mt-0.5">₹{outstandingReceivables.toLocaleString('en-IN')}</span>
          </div>
          <div className="p-3 bg-white border border-brand-border rounded-[14px] flex flex-col items-center justify-center text-center">
            <span className="text-[9px] font-semibold text-text-secondary uppercase">Payables</span>
            <span className="text-xs font-bold text-danger mt-0.5">₹{outstandingPayables.toLocaleString('en-IN')}</span>
          </div>
          <div className="p-3 bg-white border border-brand-border rounded-[14px] flex flex-col items-center justify-center text-center">
            <span className="text-[9px] font-semibold text-text-secondary uppercase">Pending Orders</span>
            <span className="text-xs font-bold text-primary mt-0.5 flex items-center space-x-1">
              <span>{pendingOrdersCount}</span>
              <Clock size={10} />
            </span>
          </div>
        </section>

        {/* QUICK ACTIONS ROW */}
        <section className="mb-6">
          <div className="p-4 bg-white border border-brand-border rounded-[18px] space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Quick Ledger Entry</h3>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={() => openFormDrawer('sale')}
                className="flex flex-col items-center p-2.5 rounded-[14px] bg-brand-surface border border-brand-border/60 active:scale-95 transition-all text-center select-none"
              >
                <div className="w-10 h-10 bg-light-blue text-primary rounded-full flex items-center justify-center mb-1">
                  <FileText size={18} />
                </div>
                <span className="text-[10px] font-bold text-text-primary">Create Invoice</span>
              </button>

              <button
                onClick={() => openFormDrawer('purchase')}
                className="flex flex-col items-center p-2.5 rounded-[14px] bg-brand-surface border border-brand-border/60 active:scale-95 transition-all text-center select-none"
              >
                <div className="w-10 h-10 bg-slate-100 text-text-primary rounded-full flex items-center justify-center mb-1">
                  <Package size={18} />
                </div>
                <span className="text-[10px] font-bold text-text-primary">Add Purchase</span>
              </button>

              <button
                onClick={() => openFormDrawer('expense')}
                className="flex flex-col items-center p-2.5 rounded-[14px] bg-brand-surface border border-brand-border/60 active:scale-95 transition-all text-center select-none"
              >
                <div className="w-10 h-10 bg-danger/10 text-danger rounded-full flex items-center justify-center mb-1">
                  <TrendingDown size={18} />
                </div>
                <span className="text-[10px] font-bold text-text-primary">Add Expense</span>
              </button>

              <button
                onClick={() => openFormDrawer('payment_received')}
                className="flex flex-col items-center p-2.5 rounded-[14px] bg-brand-surface border border-brand-border/60 active:scale-95 transition-all text-center select-none"
              >
                <div className="w-10 h-10 bg-success/10 text-success rounded-full flex items-center justify-center mb-1">
                  <CheckCircle2 size={18} />
                </div>
                <span className="text-[10px] font-bold text-text-primary">Receive Pay</span>
              </button>

              <button
                onClick={() => { }}
                className="flex flex-col items-center p-2.5 rounded-[14px] bg-brand-surface border border-brand-border/60 active:scale-95 transition-all text-center select-none opacity-50"
              >
                <div className="w-10 h-10 bg-amber-50 text-warning rounded-full flex items-center justify-center mb-1">
                  <Users size={18} />
                </div>
                <span className="text-[10px] font-bold text-text-primary">Add Customer</span>
              </button>

              <button
                onClick={() => { }}
                className="flex flex-col items-center p-2.5 rounded-[14px] bg-brand-surface border border-brand-border/60 active:scale-95 transition-all text-center select-none opacity-50"
              >
                <div className="w-10 h-10 bg-sky-50 text-accent-blue rounded-full flex items-center justify-center mb-1">
                  <PlusCircle size={18} />
                </div>
                <span className="text-[10px] font-bold text-text-primary">Add Product</span>
              </button>
            </div>
          </div>
        </section>

        {/* HIGH-PERFORMANCE INTERACTIVE CHARTS */}
        <section className="mb-6 space-y-4">
          {/* Sales Chart Card */}
          <div className="p-4 bg-white border border-brand-border rounded-[18px] space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wide">6-Day Trend</span>
                <h3 className="text-sm font-extrabold text-text-primary">Sales & Revenue</h3>
              </div>
              <span className={`text-xs font-bold flex items-center space-x-1 ${metricsData.salesPerc >= 0 ? 'text-success' : 'text-danger'}`}>
                <span>{metricsData.salesPerc >= 0 ? '+' : ''}{metricsData.salesPerc.toFixed(1)}%</span>
                {metricsData.salesPerc >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              </span>
            </div>
            <div className="pt-2">
              <CurvedAreaChart data={chartSalesData} color="#0F5FAF" id="sales" />
            </div>
            <div className="flex justify-between text-[10px] text-text-secondary font-semibold pt-1 border-t border-slate-50">
              {chartLabels.map((label, idx) => <span key={idx}>{label}</span>)}
            </div>
          </div>

          {/* Expenses Chart Card */}
          <div className="p-4 bg-white border border-brand-border rounded-[18px] space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wide">6-Day Run-Rate</span>
                <h3 className="text-sm font-extrabold text-text-primary">Expense Distribution</h3>
              </div>
              <span className={`text-xs font-bold flex items-center space-x-1 ${metricsData.expensePerc <= 0 ? 'text-success' : 'text-danger'}`}>
                <span>{metricsData.expensePerc <= 0 ? '' : '+'}{metricsData.expensePerc.toFixed(1)}%</span>
                {metricsData.expensePerc <= 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
              </span>
            </div>
            <div className="pt-2">
              <BarChart data={chartExpensesData} color="#DC2626" />
            </div>
            <div className="flex justify-between text-[10px] text-text-secondary font-semibold pt-1 border-t border-slate-50">
              {chartLabels.map((label, idx) => <span key={idx}>{label}</span>)}
            </div>
          </div>
        </section>

        {/* ALERTS SECTION (LOW STOCK ALERT) */}
        {lowStockAlerts.length > 0 && (
          <section className="mb-6">
            <div className="p-4 bg-red-50/50 border border-danger/20 rounded-[18px] space-y-3">
              <div className="flex items-center space-x-2 text-danger">
                <AlertTriangle size={16} className="stroke-[2.5]" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Low Stock Inventory Alerts</h3>
              </div>
              <div className="space-y-2">
                {lowStockAlerts.map((prod) => (
                  <div key={prod.id} className="flex justify-between items-center text-xs p-2 bg-white rounded-[10px] border border-danger/10">
                    <span className="font-semibold text-text-primary">{prod.name}</span>
                    <span className="text-danger font-bold">Only {prod.stock} units left! <span className="text-text-secondary font-normal text-[10px]">(Min: {prod.minStock})</span></span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* RECENT TRANSACTIONS LEDGER LIST */}
        <section className="mb-6">
          <div className="p-4 bg-white border border-brand-border rounded-[18px] space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <div className="flex flex-col space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Recent Ledger Transactions</h3>

              {/* Search and filter toolbar */}
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search ledger entries..."
                    className="w-full h-9 bg-brand-surface border border-brand-border rounded-[12px] text-xs pl-9 pr-3 focus:border-primary focus:ring-1 focus:ring-primary/10"
                  />
                </div>

                <div className="relative">
                  <select
                    value={filterType}
                    onChange={(e: any) => setFilterType(e.target.value)}
                    className="h-9 px-3 bg-brand-surface border border-brand-border rounded-[12px] text-xs font-semibold text-text-primary appearance-none pr-8 cursor-pointer"
                  >
                    <option value="all">All Logs</option>
                    <option value="sale">Sales</option>
                    <option value="purchase">Purchases</option>
                    <option value="expense">Expenses</option>
                    <option value="payment_received">Receipts</option>
                  </select>
                  <Filter size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                </div>
              </div>
            </div>

            {/* List entries */}
            <div className="space-y-1 divide-y divide-brand-border/40">
              <AnimatePresence initial={false}>
                {filteredTransactions.length === 0 ? (
                  <EmptyState
                    title="No Transactions Found"
                    description={searchTerm ? `No ledger matches for "${searchTerm}"` : "You haven't recorded any transactions yet."}
                    Icon={Search}
                  />
                ) : (
                  filteredTransactions.map((tx) => {
                    const isIncome = tx.type === 'sale' || tx.type === 'payment_received';
                    return (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="py-3 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3 w-[70%]">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'sale'
                              ? 'bg-success/15 text-success'
                              : tx.type === 'payment_received'
                                ? 'bg-light-blue text-primary'
                                : tx.type === 'purchase'
                                  ? 'bg-slate-100 text-text-primary'
                                  : 'bg-danger/10 text-danger'
                            }`}>
                            {tx.type === 'sale' && <TrendingUp size={16} />}
                            {tx.type === 'payment_received' && <CheckCircle2 size={16} />}
                            {tx.type === 'purchase' && <Package size={16} />}
                            {tx.type === 'expense' && <TrendingDown size={16} />}
                          </div>
                          <div className="truncate">
                            <span className="text-xs font-bold text-text-primary block truncate">{tx.description}</span>
                            <span className="text-[10px] text-text-secondary block mt-0.5 truncate">
                              {tx.date} • {tx.partyName || 'Cash Ledger'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-xs font-bold block ${isIncome ? 'text-success' : 'text-text-primary'}`}>
                            {isIncome ? '+' : '-'} ₹{tx.amount.toLocaleString('en-IN')}
                          </span>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded-full inline-block mt-1 font-bold ${tx.status === 'completed' ? 'bg-success/10 text-success' : 'bg-amber-100 text-warning'
                            }`}>
                            {tx.status}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* TOP SELLING PRODUCTS */}
        <section className="mb-6">
          <div className="p-4 bg-white border border-brand-border rounded-[18px] space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Top Revenue Products</h3>
            <div className="space-y-3.5 pt-1">
              {topSellingProducts.map((p) => {
                const percentage = (p.stock / 150) * 100;
                return (
                  <div key={p.id} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <div className="font-semibold text-text-primary">{p.name}</div>
                      <div className="font-bold">₹{p.revenue.toLocaleString('en-IN')}</div>
                    </div>
                    {/* Linear inventory indicator */}
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${p.stock < p.minStock ? 'bg-danger' : 'bg-primary'}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-text-secondary">
                      <span>{p.sku}</span>
                      <span>{p.salesCount} sold • {p.stock} in stock</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* RECENT ACTIVITIES TIMELINE */}
        <section className="mb-8">
          <div className="p-4 bg-white border border-brand-border rounded-[18px] space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">System Activity Logs</h3>
            <div className="relative pl-4 border-l border-brand-border/60 space-y-4 pt-1">
              {activities.map((act) => (
                <div key={act.id} className="relative">
                  {/* Circle dot on line */}
                  <span className={`absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white ${act.type === 'success' ? 'bg-success' : act.type === 'warning' ? 'bg-warning' : act.type === 'danger' ? 'bg-danger' : 'bg-primary'
                    }`} />
                  <div className="text-xs">
                    <p className="text-text-primary leading-relaxed">{act.description}</p>
                    <span className="text-[9px] text-text-secondary block mt-0.5">{act.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ */}
        {/* NATIVE SLIDE-UP BOTTOM SHEET DRAWER (LEDGER ENTRY FORM) */}
        {/* ------------------------------------------------------------ */}
        <AnimatePresence>
          {isFormOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900 z-50 pointer-events-auto"
                onClick={() => setIsFormOpen(false)}
              />

              {/* Bottom Sheet Drawer */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 240 }}
                className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[24px] z-50 px-5 pt-4 pb-8 shadow-2xl safe-bottom border-t border-brand-border/60 pointer-events-auto"
              >
                {/* Drag handle line */}
                <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4" />

                {/* Drawer Header */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-extrabold text-text-primary capitalize flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${formDefaultType === 'sale' ? 'bg-success' : formDefaultType === 'expense' ? 'bg-danger' : 'bg-primary'
                      }`} />
                    <span>New {formDefaultType.replace('_', ' ')} Entry</span>
                  </h3>
                  <button
                    onClick={() => setIsFormOpen(false)}
                    className="p-1 text-text-secondary/70 hover:bg-slate-100 rounded-full"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Form fields */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <Input
                    label="Party / Contact Name"
                    placeholder="Enter name (e.g. Apex Enterprises)"
                    error={errors.partyName?.message}
                    {...register('partyName', { required: 'Party name is required' })}
                  />

                  <Input
                    label="Amount (₹)"
                    type="number"
                    placeholder="0.00"
                    error={errors.amount?.message}
                    {...register('amount', {
                      required: 'Amount is required',
                      min: { value: 1, message: 'Amount must be greater than 0' }
                    })}
                  />

                  <Input
                    label="Brief Description"
                    placeholder="e.g. GST Tax Invoice #INV-0043"
                    error={errors.description?.message}
                    {...register('description', { required: 'Description is required' })}
                  />

                  <Select
                    label="Payment Status"
                    options={[
                      { value: 'completed', label: 'Completed (Paid)' },
                      { value: 'pending', label: 'Pending (Due)' },
                    ]}
                    {...register('status')}
                  />

                  <div className="pt-3 flex space-x-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsFormOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1 capitalize">
                      Add {formDefaultType.split('_')[0]}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </PullToRefresh>
  );
};
export default Dashboard;
