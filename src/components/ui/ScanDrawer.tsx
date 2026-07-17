import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ArrowLeft, Scan, QrCode, Package,
  ChevronRight, Printer, ShieldCheck, CheckCircle2, AlertCircle,
  ShoppingCart, Trash2, Plus, Minus, Search
} from 'lucide-react';
import { useERPStore, type CartItem } from '../../store/useERPStore';
import { Input } from './Input';
import { Button } from './Button';
import { CameraScanner } from './CameraScanner';

// Local receipt type
type ReceiptTx = {
  id: string;
  date: string;
  description: string;
  amount: number;
  partyName?: string;
  paymentMode?: 'cash' | 'card' | 'upi';
  items: CartItem[];
};

// Programmatic Beep Sound using Web Audio API (Offline & lightweight)
const playBeep = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime); // 1000Hz (standard scanner beep)
    
    // Smooth volume fade out to avoid speaker pop/clicking sound
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.12); // 120ms duration

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.12);
  } catch (e) {
    console.warn('Browser audio blocked beep:', e);
  }
};

export const ScanDrawer: React.FC = () => {
  const {
    isScanDrawerOpen,
    scanDrawerTab,
    setScanDrawerOpen,
    addProduct,
    addTransaction,
    finalizeBill,
    products,
    updateProduct,
    parkedBills,
    parkBill,
    removeParkedBill,
  } = useERPStore();

  // Product feed form states
  const [feedSku, setFeedSku] = useState('');
  const [feedName, setFeedName] = useState('');
  const [feedPurchasePrice, setFeedPurchasePrice] = useState('');
  const [feedSellingPrice, setFeedSellingPrice] = useState('');
  const [feedStock, setFeedStock] = useState('20');
  const [feedMinStock, setFeedMinStock] = useState('5');

  // Bill cart states (POS mode)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'card' | 'upi'>('cash');
  const [billGeneratedTx, setBillGeneratedTx] = useState<ReceiptTx | null>(null);

  // Use a ref to access the latest cart inside the scanner callback without causing stale closures
  const cartRef = React.useRef<CartItem[]>(cart);
  React.useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  // Cooldown refs to prevent rapid duplicate scans from the camera
  const lastScannedRef = React.useRef<string>('');
  const lastScannedTimeRef = React.useRef<number>(0);

  // Shared states
  const [isSuccessState, setIsSuccessState] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [scanError, setScanError] = useState('');
  const [scanFeedback, setScanFeedback] = useState<{ 
    text: string; 
    type: 'success' | 'error';
    actionText?: string;
    onAction?: () => void;
  } | null>(null);

  // Manual search states
  const [manualSearch, setManualSearch] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Duplicate product found in feed section — show stock update UI
  const [duplicateProduct, setDuplicateProduct] = useState<typeof products[0] | null>(null);
  const [stockToAdd, setStockToAdd] = useState(1);
  
  const searchResults = React.useMemo(() => {
    if (!manualSearch.trim()) return [];
    const q = manualSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)).slice(0, 5);
  }, [manualSearch, products]);

  /* ─── PRODUCT FEED HANDLERS ─── */
  const handleBarcodeScanned = useCallback((value: string) => {
    const trimmed = value.trim();

    // Check if product with this SKU already exists in inventory
    const existing = products.find(
      (p) => p.sku.toLowerCase() === trimmed.toLowerCase()
    );

    if (existing) {
      playBeep();
      setDuplicateProduct(existing);
      setStockToAdd(1);
      setScanError('');
      return;
    }

    playBeep();
    setScanError('');
    setDuplicateProduct(null);
    setFeedSku(trimmed);
    setFeedName('');
    setFeedPurchasePrice('');
    setFeedSellingPrice('');
    setFeedStock('20');
    setFeedMinStock('5');
    setScanDrawerOpen(true, 'feed_form');
  }, [setScanDrawerOpen, products]);

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedName || !feedSellingPrice) return;

    // Final duplicate guard: check if SKU already exists before saving
    const duplicate = products.find(
      (p) => p.sku.toLowerCase() === feedSku.toLowerCase()
    );
    if (duplicate) {
      setScanError(`Product with SKU "${feedSku}" already exists: ${duplicate.name}`);
      return;
    }

    addProduct({
      name: feedName,
      sku: feedSku,
      stock: parseInt(feedStock) || 0,
      minStock: parseInt(feedMinStock) || 0,
      purchasePrice: parseFloat(feedPurchasePrice) || 0,
      sellingPrice: parseFloat(feedSellingPrice) || 0,
    });
    setSuccessMessage(`"${feedName}" (${feedSku}) registered in inventory.`);
    setIsSuccessState(true);
  };

  /* ─── POS BILL SCAN HANDLERS ─── */
  const handleProductQrScanned = useCallback((value: string) => {
    const trimmed = value.trim();
    const now = Date.now();

    // Cooldown: ignore same barcode scanned within 1500ms
    if (
      trimmed === lastScannedRef.current &&
      now - lastScannedTimeRef.current < 1500
    ) {
      return;
    }
    lastScannedRef.current = trimmed;
    lastScannedTimeRef.current = now;

    playBeep();

    // Search by SKU or product name (case-insensitive)
    const found = products.find(
      (p) => p.sku.toLowerCase() === trimmed.toLowerCase()
        || p.name.toLowerCase() === trimmed.toLowerCase()
        || p.id.toLowerCase() === trimmed.toLowerCase()
    );

    if (!found) {
      setScanFeedback({ text: `"${trimmed}" — Product not found in inventory`, type: 'error' });
      setTimeout(() => setScanFeedback(null), 2500);
      return;
    }

    const price = found.sellingPrice || found.revenue / (found.salesCount || 1) || 0;

    // Use cartRef (always latest) to check for duplicates synchronously
    const alreadyInCart = cartRef.current.some(
      (c) => c.productId === found.id || c.sku.toLowerCase() === found.sku.toLowerCase()
    );

    if (alreadyInCart) {
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      setScanFeedback({
        text: `Already in bill: ${found.name}`,
        type: 'error',
        actionText: 'Increase +1',
        onAction: () => updateCartQty(found.id, 1)
      });
      setTimeout(() => setScanFeedback(null), 4000);
      return; // Do NOT call setCart — just return
    }

    // Safe to add
    setCart((prev) => {
      // Double-check inside updater for absolute safety
      if (prev.some((c) => c.productId === found.id || c.sku.toLowerCase() === found.sku.toLowerCase())) {
        return prev;
      }
      return [...prev, { productId: found.id, sku: found.sku, name: found.name, price, qty: 1 }];
    });

    setScanFeedback({ text: `✓ ${found.name} added`, type: 'success' });
    setTimeout(() => setScanFeedback(null), 1500);
  }, [products]);

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => c.productId === productId ? { ...c, qty: c.qty + delta } : c)
        .filter((c) => c.qty > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const cartItemCount = cart.reduce((sum, c) => sum + c.qty, 0);

  const handleHoldBill = () => {
    if (cart.length === 0) return;
    parkBill({
      customerName: customerName.trim() === 'Walk-in Customer' || !customerName ? `Customer ${parkedBills.length + 1}` : customerName,
      items: [...cart],
    });
    setCart([]);
    setCustomerName('Walk-in Customer');
    setScanFeedback({ text: 'Bill placed on hold. Parallel billing enabled.', type: 'success' });
    setTimeout(() => setScanFeedback(null), 2000);
  };

  const handleGenerateBill = async () => {
    if (cart.length === 0) return;
    const invoiceNo = `INV-POS-${Math.floor(1000 + Math.random() * 9000)}`;

    const tx = await finalizeBill({
      cart,
      customerName,
      paymentMode,
      invoiceNo,
    });

    setBillGeneratedTx({
      id: invoiceNo,
      date: tx.date,
      description: `Invoice #${invoiceNo}`,
      amount: cartTotal,
      partyName: customerName,
      paymentMode,
      items: [...cart],
    });
    setIsSuccessState(true);
  };

  const resetAll = () => {
    setIsSuccessState(false);
    setSuccessMessage('');
    setBillGeneratedTx(null);
    setCart([]);
    setCustomerName('Walk-in Customer');
    setScanError('');
    setScanFeedback(null);
    setScanDrawerOpen(false, 'menu');
  };

  if (!isScanDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-start">
      <style>{`
        @keyframes laserSweep {
          0%   { top: 4px; opacity: 1; }
          50%  { top: calc(100% - 4px); opacity: 1; }
          100% { top: 4px; opacity: 1; }
        }
        .laser-line { position: absolute; animation: laserSweep 2s infinite linear; }
        @keyframes flashGreen { 0% { opacity: 1; } 100% { opacity: 0; } }
        .scan-flash { animation: flashGreen 0.4s ease-out; }
      `}</style>

      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={resetAll}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '-100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        className="relative bg-white rounded-b-[24px] max-h-[92vh] w-full max-w-md mx-auto z-50 flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-brand-border flex-shrink-0">
          <div className="flex items-center space-x-2">
            {scanDrawerTab !== 'menu' && !isSuccessState && (
              <button
                onClick={() => { setScanError(''); setScanFeedback(null); setScanDrawerOpen(true, 'menu'); }}
                className="p-1.5 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors -ml-1 cursor-pointer"
              >
                <ArrowLeft size={18} className="text-text-secondary" />
              </button>
            )}
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
              {scanDrawerTab === 'menu'         && 'Scanner Hub'}
              {scanDrawerTab === 'scan_feed'    && 'Scan Barcode'}
              {scanDrawerTab === 'scan_bill'    && 'POS Scanner'}
              {scanDrawerTab === 'feed_form'    && (isSuccessState ? 'Product Added ✓' : 'Register Product')}
              {scanDrawerTab === 'bill_checkout'&& (isSuccessState ? 'Payment Successful ✓' : 'Checkout')}
              {scanDrawerTab === 'held_bills'   && 'Held Bills'}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            {/* Cart badge in scan_bill mode */}
            {scanDrawerTab === 'scan_bill' && cart.length > 0 && (
              <button
                onClick={() => setScanDrawerOpen(true, 'bill_checkout')}
                className="relative p-2 bg-primary/10 rounded-full cursor-pointer active:scale-95 transition-all"
              >
                <ShoppingCart size={16} className="text-primary" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartItemCount}
                </span>
              </button>
            )}
            <button
              onClick={resetAll}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors active:scale-95 cursor-pointer"
            >
              <X size={15} className="text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">

            {/* ── MENU ── */}
            {scanDrawerTab === 'menu' && (
              <motion.div key="menu"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-4 p-2"
              >
                {parkedBills.length > 0 && (
                  <button onClick={() => setScanDrawerOpen(true, 'held_bills')}
                    className="w-full flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-2xl hover:bg-orange-100 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                        <AlertCircle size={24} />
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-orange-900 text-sm">Held Bills ({parkedBills.length})</h3>
                        <p className="text-xs text-orange-700">Resume parked sales</p>
                      </div>
                    </div>
                    <ChevronRight className="text-orange-400" />
                  </button>
                )}

                <p className="text-xs text-text-secondary font-medium leading-relaxed pb-1">
                  Use your camera to scan product barcodes or create bills by scanning items.
                </p>

                {/* Products Feed */}
                <button
                  onClick={() => setScanDrawerOpen(true, 'scan_feed')}
                  className="w-full flex items-center p-4 bg-brand-surface border border-brand-border/60 hover:border-emerald-200 rounded-[18px] text-left active:scale-[0.98] transition-all group cursor-pointer"
                >
                  <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-[14px] mr-4 group-hover:scale-105 transition-transform">
                    <Package size={22} className="stroke-[2]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-0.5">Products Feed</h4>
                    <p className="text-[11px] text-text-secondary font-medium">
                      Scan barcode → register new product to inventory
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-brand-border group-hover:text-emerald-500 transition-colors ml-2" />
                </button>

                {/* Quick Bill (POS) */}
                <button
                  onClick={() => { setCart([]); setScanDrawerOpen(true, 'scan_bill'); }}
                  className="w-full flex items-center p-4 bg-brand-surface border border-brand-border/60 hover:border-blue-200 rounded-[18px] text-left active:scale-[0.98] transition-all group cursor-pointer"
                >
                  <div className="p-3.5 bg-blue-50 text-primary rounded-[14px] mr-4 group-hover:scale-105 transition-transform">
                    <QrCode size={22} className="stroke-[2]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-0.5">Quick Bill (POS)</h4>
                    <p className="text-[11px] text-text-secondary font-medium">
                      Scan saved products → build cart → generate invoice
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-brand-border group-hover:text-primary transition-colors ml-2" />
                </button>

                {/* Info */}
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl">
                  <p className="text-[11px] text-amber-800 font-semibold leading-relaxed">
                    💡 <strong>POS Bill:</strong> First add products via "Products Feed" scan. Then use "Quick Bill" to scan their SKU codes to build a bill — just like real POS software!
                  </p>
                </div>

                {/* Registered products count */}
                <div className="flex items-center justify-center space-x-2 pt-1 text-[10px] text-text-secondary font-semibold">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  <span>{products.length} products registered in inventory</span>
                </div>
              </motion.div>
            )}

            {/* ── SCAN FEED (barcode → register) ── */}
            {scanDrawerTab === 'scan_feed' && (
              <motion.div key="scan_feed"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <CameraScanner mode="barcode" onResult={handleBarcodeScanned} onError={(e) => setScanError(e)} />
                
                {/* Duplicate Product — Stock Update UI */}
                {duplicateProduct ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl space-y-3"
                  >
                    <div className="flex items-center space-x-2">
                      <AlertCircle size={16} className="text-amber-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Already in Inventory</p>
                        <p className="text-sm font-extrabold text-text-primary truncate">{duplicateProduct.name}</p>
                        <p className="text-[10px] text-text-secondary">SKU: {duplicateProduct.sku} &bull; Stock: {duplicateProduct.stock} units</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-amber-100">
                      <span className="text-xs font-bold text-text-secondary">Add Stock:</span>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setStockToAdd(s => Math.max(1, s - 1))}
                          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center active:scale-90 cursor-pointer font-bold text-lg"
                        >-</button>
                        <span className="text-base font-black text-primary w-8 text-center">{stockToAdd}</span>
                        <button
                          onClick={() => setStockToAdd(s => s + 1)}
                          className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center active:scale-90 cursor-pointer font-bold text-lg"
                        >+</button>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => setDuplicateProduct(null)}
                        className="flex-1 py-2 rounded-xl border border-brand-border text-xs font-bold text-text-secondary bg-white active:scale-95"
                      >Cancel</button>
                      <button
                        onClick={() => {
                          updateProduct(duplicateProduct.id, { stock: duplicateProduct.stock + stockToAdd });
                          setDuplicateProduct(null);
                          setScanFeedback({ text: `✓ ${duplicateProduct.name}: +${stockToAdd} stock added`, type: 'success' });
                          setTimeout(() => setScanFeedback(null), 2000);
                        }}
                        className="flex-1 py-2 rounded-xl bg-primary text-white text-xs font-bold active:scale-95"
                      >Save +{stockToAdd} Units</button>
                    </div>
                  </motion.div>
                ) : scanError ? (
                  <div className="flex items-start space-x-2 p-3 bg-danger/5 border border-danger/20 rounded-xl">
                    <AlertCircle size={15} className="text-danger flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-danger font-medium">{scanError}</p>
                  </div>
                ) : null}

                {/* Success feedback after stock update */}
                <AnimatePresence>
                  {scanFeedback && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="p-2.5 rounded-xl text-xs font-bold text-center bg-emerald-50 text-emerald-700 border border-emerald-200"
                    >
                      {scanFeedback.text}
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="text-[11px] text-text-secondary text-center font-medium">
                  Point camera at a product barcode to register it.
                </p>
              </motion.div>
            )}

            {/* ── POS SCANNER (continuous scan → add to cart) ── */}
            {scanDrawerTab === 'scan_bill' && (
              <motion.div key="scan_bill"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <CameraScanner
                  mode="barcode"
                  continuous={true}
                  onResult={handleProductQrScanned}
                  onError={(e) => setScanError(e)}
                />

                {/* Manual Product Search */}
                <div className="relative z-50">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input
                      type="text"
                      placeholder="Or type product name/SKU to add..."
                      value={manualSearch}
                      onFocus={() => setShowSearchDropdown(true)}
                      onChange={(e) => {
                        setManualSearch(e.target.value);
                        setShowSearchDropdown(true);
                      }}
                      className="w-full h-10 pl-9 pr-4 bg-slate-50 border border-brand-border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    />
                    {manualSearch && (
                      <button 
                        onClick={() => { setManualSearch(''); setShowSearchDropdown(false); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  
                  {/* Dropdown Results */}
                  <AnimatePresence>
                    {showSearchDropdown && searchResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-brand-border rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto"
                      >
                        {searchResults.map(prod => (
                          <button
                            key={prod.id}
                            onClick={() => {
                              handleProductQrScanned(prod.sku);
                              setManualSearch('');
                              setShowSearchDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 border-b border-brand-border last:border-0 flex justify-between items-center"
                          >
                            <div>
                              <p className="font-bold text-text-primary">{prod.name}</p>
                              <p className="text-[10px] text-text-secondary">{prod.sku}</p>
                            </div>
                            <span className="font-extrabold text-primary">₹{(prod.sellingPrice || prod.revenue / (prod.salesCount || 1) || 0).toLocaleString('en-IN')}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {showSearchDropdown && manualSearch.trim() && searchResults.length === 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-brand-border rounded-xl shadow-xl p-3 text-center text-xs text-text-secondary">
                      No products found.
                    </div>
                  )}
                </div>

                {/* Scan feedback toast */}
                <AnimatePresence>
                  {scanFeedback && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                      className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-md ${
                        scanFeedback.type === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-600 border border-red-200'
                      }`}
                    >
                      <span>{scanFeedback.text}</span>
                      {scanFeedback.onAction && (
                        <button
                          onClick={() => {
                            scanFeedback.onAction?.();
                            setScanFeedback(null);
                          }}
                          className="ml-3 px-3 py-1 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-lg text-[10px] font-extrabold uppercase transition-all shrink-0 cursor-pointer"
                        >
                          {scanFeedback.actionText || 'Add'}
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Live cart preview */}
                {cart.length > 0 ? (
                  <div className="border border-brand-border rounded-[18px] bg-brand-surface p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                        Cart ({cartItemCount} items)
                      </h4>
                      <span className="text-xs font-extrabold text-primary">₹{cartTotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item.productId} className="flex items-center justify-between text-xs">
                          <div className="flex-1 min-w-0 mr-2">
                            <p className="font-bold text-text-primary truncate">{item.name}</p>
                            <p className="text-[10px] text-text-secondary">₹{item.price.toLocaleString('en-IN')} × {item.qty}</p>
                          </div>
                          <div className="flex items-center space-x-1.5 flex-shrink-0">
                            <button onClick={() => updateCartQty(item.productId, -1)}
                              className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center active:scale-90 cursor-pointer">
                              <Minus size={12} />
                            </button>
                            <span className="w-5 text-center font-bold text-xs">{item.qty}</span>
                            <button onClick={() => updateCartQty(item.productId, 1)}
                              className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center active:scale-90 cursor-pointer">
                              <Plus size={12} />
                            </button>
                            <button onClick={() => removeFromCart(item.productId)}
                              className="w-6 h-6 rounded-full bg-danger/10 text-danger flex items-center justify-center active:scale-90 cursor-pointer ml-1">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Button onClick={handleHoldBill}
                        className="w-1/3 bg-orange-100 text-orange-700 font-bold text-xs h-10 hover:bg-orange-200">
                        Hold Bill
                      </Button>
                      <Button onClick={() => setScanDrawerOpen(true, 'bill_checkout')}
                        className="flex-1 bg-primary text-white font-bold text-xs h-10">
                        Checkout — ₹{cartTotal.toLocaleString('en-IN')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border border-dashed border-brand-border rounded-[18px] text-center">
                    <ShoppingCart size={24} className="text-text-secondary mx-auto mb-2 opacity-40" />
                    <p className="text-[11px] text-text-secondary font-medium">
                      Cart is empty. Scan product QR/barcode codes to add items.
                    </p>
                    <p className="text-[10px] text-text-secondary mt-1">
                      Available SKUs: {products.map(p => p.sku).join(', ')}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── FEED FORM ── */}
            {scanDrawerTab === 'feed_form' && (
              <motion.div key="feed_form"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              >
                {!isSuccessState ? (
                  <form onSubmit={handleSaveProduct} className="space-y-4">
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center space-x-3">
                      <Scan size={18} className="text-emerald-600 flex-shrink-0" />
                      <div>
                        <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest block">Scanned Code</span>
                        <span className="text-xs font-bold text-text-primary font-mono">{feedSku}</span>
                      </div>
                    </div>
                    <Input label="Product Name *" placeholder="e.g. Wireless Keyboard" value={feedName} onChange={(e) => setFeedName(e.target.value)} required />
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Purchase Price (₹)" type="number" placeholder="1500" value={feedPurchasePrice} onChange={(e) => setFeedPurchasePrice(e.target.value)} />
                      <Input label="Selling Price (₹) *" type="number" placeholder="2400" value={feedSellingPrice} onChange={(e) => setFeedSellingPrice(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Initial Stock" type="number" value={feedStock} onChange={(e) => setFeedStock(e.target.value)} />
                      <Input label="Min Alert" type="number" value={feedMinStock} onChange={(e) => setFeedMinStock(e.target.value)} />
                    </div>
                    <Button type="submit" disabled={!feedName || !feedSellingPrice}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-11">
                      Save to Inventory
                    </Button>
                    <button type="button" onClick={() => setScanDrawerOpen(true, 'scan_feed')}
                      className="w-full text-xs text-text-secondary font-semibold py-2 cursor-pointer">← Re-scan</button>
                  </form>
                ) : (
                  <div className="flex flex-col items-center text-center py-8 space-y-4">
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full">
                      <CheckCircle2 size={38} className="stroke-[2]" />
                    </div>
                    <h3 className="text-base font-bold text-text-primary">Product Registered!</h3>
                    <p className="text-xs text-text-secondary max-w-[260px]">{successMessage}</p>
                    <div className="flex w-full space-x-3 pt-2">
                      <Button onClick={() => { setIsSuccessState(false); setScanDrawerOpen(true, 'scan_feed'); }}
                        className="flex-1 border border-brand-border bg-white text-text-primary text-xs font-bold">Scan Another</Button>
                      <Button onClick={resetAll} className="flex-1 bg-emerald-600 text-white text-xs font-bold">Done</Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── BILL CHECKOUT ── */}
            {scanDrawerTab === 'bill_checkout' && (
              <motion.div key="bill_checkout"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              >
                {!isSuccessState ? (
                  <div className="space-y-4">
                    {/* Customer name */}
                    <Input
                      label="Customer Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Walk-in Customer"
                    />

                    {/* Cart items */}
                    <div className="border border-brand-border rounded-[18px] bg-brand-surface p-4 space-y-3">
                      <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                        Invoice Items ({cartItemCount})
                      </h4>
                      <div className="space-y-2.5 max-h-48 overflow-y-auto">
                        {cart.map((item) => (
                          <div key={item.productId} className="flex justify-between items-center text-xs">
                            <div className="flex-1 min-w-0 mr-3">
                              <p className="font-bold text-text-primary truncate">{item.name}</p>
                              <p className="text-[10px] text-text-secondary">{item.sku} · ₹{item.price.toLocaleString('en-IN')} × {item.qty}</p>
                            </div>
                            <div className="flex items-center space-x-1.5 flex-shrink-0">
                              <button onClick={() => updateCartQty(item.productId, -1)}
                                className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center active:scale-90 cursor-pointer">
                                <Minus size={12} />
                              </button>
                              <span className="w-5 text-center font-bold">{item.qty}</span>
                              <button onClick={() => updateCartQty(item.productId, 1)}
                                className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center active:scale-90 cursor-pointer">
                                <Plus size={12} />
                              </button>
                              <span className="font-semibold text-text-primary ml-2 w-14 text-right">₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-brand-border/60 pt-3 flex justify-between items-center">
                        <span className="text-xs font-bold text-text-secondary">Total</span>
                        <span className="text-base font-extrabold text-primary">₹{cartTotal.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* Payment mode */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Payment</h4>
                      <div className="flex gap-2">
                        <button type="button"
                          className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                            paymentMode === 'cash' ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-text-secondary border-brand-border hover:bg-slate-50'
                          }`}
                          onClick={() => setPaymentMode('cash')}
                        >
                          Cash
                        </button>
                        <button type="button"
                          className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                            paymentMode === 'card' ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-text-secondary border-brand-border hover:bg-slate-50'
                          }`}
                          onClick={() => setPaymentMode('card')}
                        >
                          Card
                        </button>
                        <button type="button"
                          className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                            paymentMode === 'upi' ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-text-secondary border-brand-border hover:bg-slate-50'
                          }`}
                          onClick={() => setPaymentMode('upi')}
                        >
                          UPI
                        </button>
                      </div>
                    </div>

                    <Button onClick={handleGenerateBill} disabled={cart.length === 0}
                      className="w-full bg-primary text-white font-bold uppercase text-xs h-11">
                      Generate Bill — ₹{cartTotal.toLocaleString('en-IN')}
                    </Button>
                    <button onClick={() => setScanDrawerOpen(true, 'scan_bill')}
                      className="w-full text-xs text-text-secondary font-semibold py-2 cursor-pointer">
                      ← Scan more items
                    </button>
                  </div>
                ) : (
                  /* Receipt */
                  billGeneratedTx && (
                    <div className="space-y-4">
                      <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 space-y-4 relative">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary rounded-t-2xl" />
                        <div className="flex justify-between items-start pt-1">
                          <div className="flex items-center space-x-2 text-xs font-bold text-primary">
                            <ShieldCheck size={17} className="text-emerald-500" />
                            <span className="uppercase tracking-wide">MobERP Receipt</span>
                          </div>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 uppercase">Paid</span>
                        </div>
                        <div>
                          <p className="text-[10px] text-text-secondary uppercase font-semibold">Customer</p>
                          <p className="text-xs font-bold text-text-primary">{billGeneratedTx.partyName}</p>
                        </div>

                        {/* Receipt items */}
                        <div className="space-y-1.5 border-y border-brand-border/50 py-3">
                          {billGeneratedTx.items.map((it, i) => (
                            <div key={i} className="flex justify-between text-[11px]">
                              <span className="text-text-primary">{it.name} ×{it.qty}</span>
                              <span className="font-semibold">₹{(it.price * it.qty).toLocaleString('en-IN')}</span>
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="text-[9px] text-text-secondary uppercase font-semibold">Invoice</p>
                            <p className="font-bold text-text-primary">{billGeneratedTx.id}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-text-secondary uppercase font-semibold">Date</p>
                            <p className="font-bold text-text-primary">{billGeneratedTx.date}</p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center bg-white border border-brand-border/40 p-3 rounded-xl">
                          <div>
                            <p className="text-[9px] text-text-secondary uppercase font-bold">Via</p>
                            <p className="text-[10px] font-bold text-text-primary uppercase">{billGeneratedTx.paymentMode}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] text-text-secondary uppercase font-bold">Total</p>
                            <p className="text-base font-extrabold text-primary">₹{billGeneratedTx.amount.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      </div>

                      <button onClick={() => alert('Receipt shared!')}
                        className="w-full flex items-center justify-center space-x-2 py-3 bg-white border border-brand-border rounded-[14px] text-xs font-bold active:bg-slate-50 cursor-pointer">
                        <Printer size={15} />
                        <span>Print / Share</span>
                      </button>
                      <Button onClick={resetAll} className="w-full bg-primary text-white text-xs font-bold h-11">
                        Done
                      </Button>
                    </div>
                  )
                )}
              </motion.div>
            )}

            {/* ── HELD BILLS ── */}
            {scanDrawerTab === 'held_bills' && (
              <motion.div key="held_bills"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {parkedBills.length === 0 ? (
                  <div className="p-4 border border-dashed border-brand-border rounded-[18px] text-center">
                    <AlertCircle size={24} className="text-text-secondary mx-auto mb-2 opacity-40" />
                    <p className="text-[11px] text-text-secondary font-medium">No held bills found.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                    {parkedBills.map(bill => (
                      <div key={bill.id} className="border border-brand-border rounded-[18px] bg-brand-surface p-4 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-text-primary text-sm">{bill.customerName}</p>
                          <p className="text-[10px] text-text-secondary mt-0.5">
                            {bill.items.length} items • ₹{bill.items.reduce((s, c) => s + c.price * c.qty, 0).toLocaleString('en-IN')}
                          </p>
                          <p className="text-[9px] text-text-secondary mt-1">{new Date(bill.timestamp).toLocaleTimeString()}</p>
                        </div>
                        <Button 
                          onClick={() => {
                            setCustomerName(bill.customerName);
                            setCart(bill.items);
                            removeParkedBill(bill.id);
                            setScanDrawerOpen(true, 'scan_bill');
                          }}
                          className="bg-primary text-white text-xs px-4 py-2"
                        >
                          Resume
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default ScanDrawer;
