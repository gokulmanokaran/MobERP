import React, { useState, useMemo } from 'react';
import { useERPStore } from '../store/useERPStore';
import { Button } from '../components/ui/Button';
import { 
  Calendar, CreditCard, Landmark, 
  TrendingUp, Download, ShoppingBag 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const Sales: React.FC = () => {
  const { transactions, businessName } = useERPStore();

  // Get first day and last day of current month as default dates
  const todayStr = new Date().toISOString().split('T')[0];
  const firstDayOfMonthStr = (() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  })();

  const [fromDate, setFromDate] = useState(firstDayOfMonthStr);
  const [toDate, setToDate] = useState(todayStr);

  // Filter sales transactions in the range
  const filteredSales = useMemo(() => {
    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    return transactions.filter(tx => {
      if (tx.type !== 'sale') return false;
      // parse date safely: could be ISO, or '2026-07-16 11:22:33'
      const txDate = new Date(tx.date.replace(/-/g, '/')); // replace dash with slash for cross-browser date compatibility
      return txDate >= start && txDate <= end;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, fromDate, toDate]);

  // Aggregate metrics
  const summary = useMemo(() => {
    let total = 0;
    let cash = 0;
    let card = 0;
    let upi = 0;

    filteredSales.forEach(tx => {
      total += tx.amount;
      if (tx.paymentMode === 'cash') cash += tx.amount;
      else if (tx.paymentMode === 'card') card += tx.amount;
      else if (tx.paymentMode === 'upi') upi += tx.amount;
    });

    return {
      total,
      cash,
      card,
      upi,
      count: filteredSales.length
    };
  }, [filteredSales]);

  // PDF Generation Function
  const exportPDF = () => {
    const doc = new jsPDF();
    
    // Title & Header info
    doc.setFontSize(20);
    doc.setTextColor(15, 95, 175); // Primary color #0F5FAF
    doc.text(businessName || 'MobERP', 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Sales Report (${fromDate} to ${toDate})`, 14, 28);
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 14, 34);
    
    // Draw a horizontal line separator
    doc.setDrawColor(220, 225, 230);
    doc.line(14, 38, 196, 38);

    // Summary block (as a mini table)
    autoTable(doc, {
      startY: 44,
      head: [['Metric', 'Value']],
      body: [
        ['Total Sales Amount', `INR ${summary.total.toLocaleString('en-IN')}.00`],
        ['Total Sales Count', `${summary.count}`],
        ['Cash Payments', `INR ${summary.cash.toLocaleString('en-IN')}.00`],
        ['Card Payments', `INR ${summary.card.toLocaleString('en-IN')}.00`],
        ['UPI / Digital Payments', `INR ${summary.upi.toLocaleString('en-IN')}.00`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [15, 95, 175] },
      styles: { fontSize: 10 },
      margin: { left: 14, right: 14 }
    });

    // Detailed transactions table
    const tableRows = filteredSales.map((tx, idx) => [
      idx + 1,
      tx.date.split(' ')[0], // Date only
      tx.description || `Invoice #${tx.id}`,
      tx.partyName || 'Walk-in Customer',
      tx.paymentMode ? tx.paymentMode.toUpperCase() : 'CASH',
      `INR ${tx.amount.toLocaleString('en-IN')}.00`
    ]);

    // get the final Y of previous autoTable
    const lastY = (doc as any).lastAutoTable?.finalY || 100;

    autoTable(doc, {
      startY: lastY + 12,
      head: [['S.No', 'Date', 'Invoice Description', 'Customer', 'Payment Mode', 'Amount']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] }, // Dark slate header
      styles: { fontSize: 9 },
      columnStyles: {
        5: { halign: 'right', fontStyle: 'bold' } // right-align amount
      },
      margin: { left: 14, right: 14 }
    });

    // Save locally
    doc.save(`Sales_Report_${fromDate}_to_${toDate}.pdf`);
  };

  return (
    <div className="pb-24 bg-brand-bg min-h-screen text-text-primary">
      {/* Sticky Header */}
      <header className="pt-6 pb-4 px-4 bg-white shadow-sm border-b border-brand-border sticky top-0 z-10 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Reports Hub</span>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Sales History</h1>
        </div>
        <Button 
          onClick={exportPDF} 
          disabled={filteredSales.length === 0}
          className="flex items-center space-x-1.5 h-9 text-xs px-3 shadow-md active:scale-95 transition-all bg-primary hover:bg-primary/95 text-white rounded-full cursor-pointer"
        >
          <Download size={14} />
          <span>PDF Report</span>
        </Button>
      </header>

      <div className="px-4 mt-5 space-y-5">
        {/* Date Filter Card */}
        <div className="bg-white p-4 rounded-[20px] border border-brand-border shadow-sm space-y-3.5">
          <div className="flex items-center space-x-2 text-text-secondary">
            <Calendar size={16} />
            <h3 className="text-xs font-bold uppercase tracking-wider">Date Period Filter</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-text-secondary mb-1 block">FROM DATE</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full h-11 px-3 border border-brand-border bg-slate-50/50 rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-text-secondary mb-1 block">TO DATE</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full h-11 px-3 border border-brand-border bg-slate-50/50 rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-medium"
              />
            </div>
          </div>
        </div>

        {/* Sales Performance Metrics */}
        <section className="grid grid-cols-2 gap-3">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-primary text-white rounded-[20px] shadow-md shadow-primary/20 flex flex-col justify-between"
          >
            <div className="flex justify-between items-center text-white/70">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Sales</span>
              <TrendingUp size={16} />
            </div>
            <div className="mt-4">
              <h4 className="text-xl font-black">₹{summary.total.toLocaleString('en-IN')}</h4>
              <span className="text-[10px] text-white/80 font-medium mt-1 block">
                {summary.count} Invoice{summary.count !== 1 ? 's' : ''} issued
              </span>
            </div>
          </motion.div>

          <div className="grid grid-rows-3 gap-2.5">
            <div className="bg-white border border-brand-border rounded-[14px] px-3.5 py-2 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold">C</span>
                </div>
                <span className="text-[10px] font-semibold text-text-secondary">Cash</span>
              </div>
              <span className="text-xs font-bold text-text-primary">₹{summary.cash.toLocaleString('en-IN')}</span>
            </div>

            <div className="bg-white border border-brand-border rounded-[14px] px-3.5 py-2 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <CreditCard size={11} />
                </div>
                <span className="text-[10px] font-semibold text-text-secondary">Card</span>
              </div>
              <span className="text-xs font-bold text-text-primary">₹{summary.card.toLocaleString('en-IN')}</span>
            </div>

            <div className="bg-white border border-brand-border rounded-[14px] px-3.5 py-2 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Landmark size={11} />
                </div>
                <span className="text-[10px] font-semibold text-text-secondary">UPI</span>
              </div>
              <span className="text-xs font-bold text-text-primary">₹{summary.upi.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </section>

        {/* Detailed Transactions List */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Sales Entries</h3>
            <span className="text-[10px] font-bold text-text-secondary bg-slate-100 px-2 py-0.5 rounded-full">
              {filteredSales.length} found
            </span>
          </div>

          {filteredSales.length === 0 ? (
            <div className="p-8 bg-white border border-brand-border rounded-[20px] text-center space-y-2">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-text-secondary">
                <ShoppingBag size={22} className="stroke-[1.5]" />
              </div>
              <p className="text-xs font-bold text-text-primary">No Sales Recorded</p>
              <p className="text-[10px] text-text-secondary max-w-[200px] mx-auto leading-relaxed">
                No invoices found within the selected dates. Change filters or make a sale.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSales.map((tx) => (
                <div 
                  key={tx.id}
                  className="bg-white p-4 rounded-[18px] border border-brand-border flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
                >
                  <div className="space-y-1 pr-2 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-text-primary truncate">
                        {tx.description || `Invoice #${tx.id}`}
                      </span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        tx.paymentMode === 'cash' ? 'bg-emerald-50 text-emerald-700' :
                        tx.paymentMode === 'card' ? 'bg-blue-50 text-blue-700' : 'bg-indigo-50 text-indigo-700'
                      }`}>
                        {tx.paymentMode || 'CASH'}
                      </span>
                    </div>
                    <p className="text-[10px] font-medium text-text-secondary truncate">
                      Cust: <span className="font-bold text-text-primary">{tx.partyName || 'Walk-in Customer'}</span>
                    </p>
                    <p className="text-[9px] font-semibold text-text-secondary flex items-center space-x-1">
                      <span>{tx.date.split(' ')[0]}</span>
                      <span>•</span>
                      <span>{tx.date.split(' ')[1] || ''}</span>
                    </p>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-text-primary block">
                      ₹{tx.amount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] text-success font-bold uppercase tracking-wider bg-success/15 px-1.5 py-0.5 rounded-md mt-1 inline-block">
                      Paid ✓
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Sales;
