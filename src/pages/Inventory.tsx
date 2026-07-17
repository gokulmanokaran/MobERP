import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Search, Plus, Filter, ShieldAlert, Edit2, Trash2, X } from 'lucide-react';
import { useERPStore } from '../store/useERPStore';

type ProductStock = {
  id: string;
  name: string;
  stock: number;
  minStock: number;
  salesCount: number;
  revenue: number;
  sku: string;
  purchasePrice?: number;
  sellingPrice?: number;
};
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export const Inventory: React.FC = () => {
  const { products, setScanDrawerOpen, updateProduct, deleteProduct } = useERPStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'low_stock'>('all');
  
  const [editingProduct, setEditingProduct] = useState<ProductStock | null>(null);

  // Edit form states
  const [editName, setEditName] = useState('');
  const [editPurchasePrice, setEditPurchasePrice] = useState('');
  const [editSellingPrice, setEditSellingPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editMinStock, setEditMinStock] = useState('');

  const openEdit = (product: ProductStock) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditPurchasePrice(product.purchasePrice?.toString() || '');
    setEditSellingPrice(product.sellingPrice?.toString() || (product.revenue / (product.salesCount || 1)).toString() || '');
    setEditStock(product.stock.toString());
    setEditMinStock(product.minStock.toString());
  };

  const closeEdit = () => {
    setEditingProduct(null);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    updateProduct(editingProduct.id, {
      name: editName,
      purchasePrice: parseFloat(editPurchasePrice) || 0,
      sellingPrice: parseFloat(editSellingPrice) || 0,
      stock: parseInt(editStock) || 0,
      minStock: parseInt(editMinStock) || 0,
    });
    
    closeEdit();
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      deleteProduct(id);
    }
  };

  // Filter products based on search and low stock filter
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        product.sku.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = filter === 'low_stock' ? product.stock <= product.minStock : true;
      
      return matchesSearch && matchesFilter;
    });
  }, [products, searchQuery, filter]);

  const totalValue = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.stock * (p.purchasePrice || p.revenue / (p.salesCount || 1) || 0)), 0);
  }, [products]);

  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col pb-20 relative">
      {/* Header */}
      <div className="bg-primary px-5 pt-12 pb-6 text-white rounded-b-[32px] shadow-lg relative overflow-hidden flex-shrink-0 z-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        
        <div className="relative z-10 flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
            <p className="text-primary-100 text-sm mt-0.5">Manage your products & stock</p>
          </div>
          <button 
            onClick={() => setScanDrawerOpen(true, 'scan_feed')}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center transition-colors cursor-pointer"
          >
            <Plus size={20} className="text-white" />
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
            <p className="text-primary-100 text-xs font-semibold mb-1 uppercase tracking-wider">Total Value</p>
            <p className="text-xl font-bold">₹{totalValue.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
            <p className="text-primary-100 text-xs font-semibold mb-1 uppercase tracking-wider">Total Items</p>
            <p className="text-xl font-bold">{products.length}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 -mt-4 relative z-20">
        {/* Search & Filter */}
        <div className="bg-white rounded-2xl shadow-sm border border-brand-border p-3 flex items-center space-x-3 mb-5">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or SKU..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-xl h-10 pl-10 pr-4 text-sm focus:ring-0 focus:bg-slate-100 transition-colors outline-none"
            />
          </div>
          <button 
            onClick={() => setFilter(f => f === 'all' ? 'low_stock' : 'all')}
            className={`p-2.5 rounded-xl border transition-colors flex-shrink-0 cursor-pointer ${
              filter === 'low_stock' 
                ? 'bg-warning/10 border-warning text-warning-700' 
                : 'bg-white border-brand-border text-text-secondary hover:bg-slate-50'
            }`}
          >
            <Filter size={18} />
            {filter === 'low_stock' && lowStockCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-danger rounded-full border-2 border-white" />
            )}
          </button>
        </div>

        {/* Filters display */}
        {filter === 'low_stock' && (
          <div className="flex items-center space-x-2 mb-4 px-1">
            <span className="text-xs font-bold text-text-primary">Showing Low Stock</span>
            <button onClick={() => setFilter('all')} className="text-xs text-primary font-semibold hover:underline cursor-pointer">
              Clear filter
            </button>
          </div>
        )}

        {/* Product List */}
        <div className="space-y-3 pb-6">
          <AnimatePresence mode="popLayout">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => {
                const isLowStock = product.stock <= product.minStock;
                const price = product.sellingPrice || (product.revenue / (product.salesCount || 1)) || 0;

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    key={product.id}
                    className="bg-white border border-brand-border rounded-2xl p-4 shadow-sm group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="pr-3">
                        <h3 className="font-bold text-text-primary text-sm leading-tight">{product.name}</h3>
                        <p className="text-[11px] text-text-secondary font-mono mt-0.5">{product.sku}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-extrabold text-primary text-sm">₹{price.toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-border/60">
                      <div className="flex items-center space-x-2">
                        {isLowStock ? (
                          <div className="flex items-center space-x-1.5 px-2 py-1 bg-danger/10 text-danger rounded-lg">
                            <ShieldAlert size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Low Stock: {product.stock}</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg">
                            <Package size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Stock: {product.stock}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openEdit(product)}
                          className="p-1.5 bg-slate-100 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id, product.name)}
                          className="p-1.5 bg-slate-100 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center text-center py-12 px-4 border-2 border-dashed border-brand-border rounded-2xl bg-white/50"
              >
                <Package size={48} className="text-text-secondary/30 mb-3" />
                <h3 className="text-sm font-bold text-text-primary mb-1">No products found</h3>
                <p className="text-xs text-text-secondary mb-4">
                  {searchQuery ? "Try a different search term" : "Your inventory is currently empty"}
                </p>
                {!searchQuery && (
                  <Button 
                    onClick={() => setScanDrawerOpen(true, 'scan_feed')}
                    variant="outline"
                    className="text-xs h-9 px-4"
                  >
                    Scan & Add Product
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingProduct && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50"
              onClick={closeEdit}
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[24px] shadow-2xl max-h-[90vh] overflow-y-auto max-w-md mx-auto"
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-brand-border">
                <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  Edit Product
                </h2>
                <button
                  onClick={closeEdit}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors active:scale-95 cursor-pointer"
                >
                  <X size={15} className="text-text-secondary" />
                </button>
              </div>
              
              <div className="p-5">
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center space-x-3 mb-2">
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">SKU Code</span>
                      <span className="text-xs font-bold text-text-primary font-mono">{editingProduct.sku}</span>
                    </div>
                  </div>
                  
                  <Input 
                    label="Product Name *" 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)} 
                    required 
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input 
                      label="Purchase Price (₹)" 
                      type="number" 
                      value={editPurchasePrice} 
                      onChange={(e) => setEditPurchasePrice(e.target.value)} 
                    />
                    <Input 
                      label="Selling Price (₹) *" 
                      type="number" 
                      value={editSellingPrice} 
                      onChange={(e) => setEditSellingPrice(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input 
                      label="Current Stock" 
                      type="number" 
                      value={editStock} 
                      onChange={(e) => setEditStock(e.target.value)} 
                    />
                    <Input 
                      label="Min Alert Limit" 
                      type="number" 
                      value={editMinStock} 
                      onChange={(e) => setEditMinStock(e.target.value)} 
                    />
                  </div>
                  
                  <div className="pt-2">
                    <Button 
                      type="submit" 
                      disabled={!editName || !editSellingPrice}
                      className="w-full h-11"
                    >
                      Update Product
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Inventory;
