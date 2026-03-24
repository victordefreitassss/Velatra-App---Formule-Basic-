import React, { useState } from 'react';
import { AppState, SupplementProduct, SupplementOrder } from '../types';
import { Card, Button, Input, Badge } from '../components/UI';
import { ShoppingCartIcon, PlusIcon, Trash2Icon, CheckIcon, XIcon } from '../components/Icons';
import { db, doc, setDoc, deleteDoc, updateDoc } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export const SupplementsPage: React.FC<{ state: AppState, setState: any, showToast: any }> = ({ state, setState, showToast }) => {
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Toutes');
  const [newProduct, setNewProduct] = useState<Partial<SupplementProduct>>({
    nom: '', prixVente: 0, prixAchat: 0, stock: 0, cat: 'Protéines'
  });

  const filteredProducts = state.supplementProducts.filter(p => {
    if (!p.nom.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterCategory !== 'Toutes' && p.cat !== filterCategory) return false;
    return true;
  });

  const filteredOrders = state.supplementOrders.filter(o => {
    const member = state.users.find(u => u.id === o.adherentId);
    return (member?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleAddProduct = async () => {
    if (!newProduct.nom || !newProduct.prixVente) return;
    const id = Date.now().toString();
    const product: SupplementProduct = {
      id,
      clubId: state.user?.clubId || '',
      nom: newProduct.nom,
      prixVente: Number(newProduct.prixVente),
      prixAchat: Number(newProduct.prixAchat),
      stock: Number(newProduct.stock),
      cat: newProduct.cat || 'Protéines'
    };
    try {
      await setDoc(doc(db, "supplementProducts", id), product);
      setShowAddProduct(false);
      setNewProduct({ nom: '', prixVente: 0, prixAchat: 0, stock: 0, cat: 'Protéines' });
      showToast("Produit ajouté avec succès", "success");
    } catch (err) {
      showToast("Erreur lors de l'ajout", "error");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, "supplementProducts", id));
      showToast("Produit supprimé", "success");
    } catch (err) {
      showToast("Erreur lors de la suppression", "error");
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: 'completed' | 'cancelled') => {
    try {
      await updateDoc(doc(db, "supplementOrders", orderId), { status });
      showToast("Statut mis à jour", "success");
    } catch (err) {
      showToast("Erreur lors de la mise à jour", "error");
    }
  };

  return (
    <motion.div 
      className="p-6 max-w-7xl mx-auto space-y-8 pb-24"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black italic text-zinc-900 tracking-tight uppercase">Boutique</h1>
          <p className="text-zinc-500 text-sm font-medium mt-1">Gérez vos produits et commandes</p>
        </div>
        <div className="flex gap-2 bg-white/60 backdrop-blur-xl p-1 rounded-xl border border-zinc-200/50 shadow-sm">
          <button 
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-300 ${activeTab === 'products' ? 'bg-velatra-accent text-white shadow-md shadow-velatra-accent/20' : 'text-zinc-500 hover:text-zinc-900 hover:bg-white/50'}`}
          >
            Produits
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-300 ${activeTab === 'orders' ? 'bg-velatra-accent text-white shadow-md shadow-velatra-accent/20' : 'text-zinc-500 hover:text-zinc-900 hover:bg-white/50'}`}
          >
            Commandes
          </button>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {activeTab === 'products' && (
          <motion.div 
            key="products"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-xl font-bold text-zinc-900">Catalogue</h2>
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  </div>
                  <Input 
                    placeholder="Rechercher un produit..." 
                    className="pl-12 !bg-white/60 backdrop-blur-xl !border-zinc-200/50 !rounded-2xl font-bold text-sm focus:!bg-white transition-all" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                  />
                </div>
                <Button onClick={() => setShowAddProduct(true)} variant="primary" className="w-full sm:w-auto !py-2 whitespace-nowrap shadow-lg shadow-velatra-accent/20">
                  <PlusIcon size={16} className="mr-2" /> Ajouter un produit
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {["Toutes", "Protéines", "Vitamines", "Équipement", "Autre"].map(f => (
                <button
                  key={f}
                  onClick={() => setFilterCategory(f)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 ${filterCategory === f ? 'bg-velatra-accent text-white shadow-md shadow-velatra-accent/20' : 'bg-white/60 backdrop-blur-xl border border-zinc-200/50 text-zinc-500 hover:text-zinc-900 hover:bg-white'}`}
                >
                  {f}
                </button>
              ))}
            </div>

            <AnimatePresence>
              {showAddProduct && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <Card className="bg-white/80 backdrop-blur-2xl border-zinc-200/50 shadow-xl shadow-zinc-200/20">
                    <h3 className="text-lg font-bold text-zinc-900 mb-4">Nouveau produit</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1 font-bold uppercase tracking-widest">Nom</label>
                        <Input value={newProduct.nom} onChange={e => setNewProduct({...newProduct, nom: e.target.value})} placeholder="Ex: Whey Isolate" className="bg-white/60 backdrop-blur-xl border-zinc-200/50" />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1 font-bold uppercase tracking-widest">Catégorie</label>
                        <select 
                          value={newProduct.cat} 
                          onChange={e => setNewProduct({...newProduct, cat: e.target.value})}
                          className="w-full bg-white/60 backdrop-blur-xl border border-zinc-200/50 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:border-velatra-accent transition-all"
                        >
                          <option value="Protéines">Protéines</option>
                          <option value="Vitamines">Vitamines</option>
                          <option value="Snacks">Snacks</option>
                          <option value="Accessoires">Accessoires</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1 font-bold uppercase tracking-widest">Prix Achat (€)</label>
                        <Input type="number" value={newProduct.prixAchat || ''} onChange={e => setNewProduct({...newProduct, prixAchat: Number(e.target.value) || 0})} className="bg-white/60 backdrop-blur-xl border-zinc-200/50" />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1 font-bold uppercase tracking-widest">Prix Vente (€)</label>
                        <Input type="number" value={newProduct.prixVente || ''} onChange={e => setNewProduct({...newProduct, prixVente: Number(e.target.value) || 0})} className="bg-white/60 backdrop-blur-xl border-zinc-200/50" />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1 font-bold uppercase tracking-widest">Stock</label>
                        <Input type="number" value={newProduct.stock || ''} onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value) || 0})} className="bg-white/60 backdrop-blur-xl border-zinc-200/50" />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6 w-full">
                      <Button variant="ghost" fullWidth onClick={() => setShowAddProduct(false)} className="hover:bg-zinc-100/50">Annuler</Button>
                      <Button variant="primary" fullWidth onClick={handleAddProduct} className="shadow-lg shadow-velatra-accent/20">Enregistrer</Button>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence mode="popLayout">
                {filteredProducts.map(product => (
                  <motion.div
                    key={product.id}
                    layout
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="bg-white/60 backdrop-blur-xl border-zinc-200/50 flex flex-col justify-between h-full hover:shadow-xl hover:shadow-zinc-200/20 transition-all duration-300 group">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="blue" className="bg-blue-500/10 text-blue-600 border-none">{product.cat}</Badge>
                          <button onClick={() => handleDeleteProduct(product.id)} className="text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10 transition-all p-2 rounded-lg opacity-0 group-hover:opacity-100">
                            <Trash2Icon size={16} />
                          </button>
                        </div>
                        <h3 className="text-lg font-bold text-zinc-900 mb-1">{product.nom}</h3>
                        <div className="text-sm text-zinc-500 mb-4">Stock: <span className={product.stock < 5 ? "text-rose-500 font-bold" : "text-zinc-900 font-medium"}>{product.stock}</span> unités</div>
                      </div>
                      <div className="flex justify-between items-end border-t border-zinc-200/50 pt-4 mt-2">
                        <div>
                          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Prix Achat</div>
                          <div className="font-mono text-zinc-900">{product.prixAchat} €</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Prix Vente</div>
                          <div className="font-mono text-velatra-accent font-black text-xl">{product.prixVente} €</div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
              {filteredProducts.length === 0 && !showAddProduct && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="col-span-full text-center py-12 text-zinc-500 italic bg-white/40 backdrop-blur-md rounded-3xl border border-zinc-200/50"
                >
                  Aucun produit trouvé.
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'orders' && (
          <motion.div 
            key="orders"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-xl font-bold text-zinc-900">Commandes Récentes</h2>
              <div className="relative w-full md:w-64">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
                <Input 
                  placeholder="Rechercher un membre..." 
                  className="pl-12 !bg-white/60 backdrop-blur-xl !border-zinc-200/50 !rounded-2xl font-bold text-sm focus:!bg-white transition-all" 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                />
              </div>
            </div>
            <motion.div 
              className="space-y-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence mode="popLayout">
                {filteredOrders.map(order => {
                  const member = state.users.find(u => u.id === order.adherentId);
                  return (
                    <motion.div
                      key={order.id}
                      layout
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="bg-white/60 backdrop-blur-xl border-zinc-200/50 hover:shadow-lg hover:shadow-zinc-200/20 transition-all duration-300">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-zinc-900 font-bold text-lg">{member?.name || 'Membre inconnu'}</span>
                              <Badge variant={order.status === 'completed' ? 'success' : order.status === 'cancelled' ? 'dark' : 'orange'} className="border-none shadow-sm">
                                {order.status === 'completed' ? 'Terminée' : order.status === 'cancelled' ? 'Annulée' : 'En attente'}
                              </Badge>
                            </div>
                            <div className="text-xs text-zinc-500 mb-4 font-medium">
                              {new Date(order.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="space-y-2">
                              {order.produits.map((p, i) => (
                                <div key={i} className="text-sm text-zinc-900 flex items-center gap-2 bg-white/40 p-2 rounded-lg border border-zinc-100">
                                  <span className="text-zinc-500 font-bold bg-zinc-100 px-2 py-1 rounded-md">{p.quantite}x</span> 
                                  <span className="font-medium">{p.nom}</span> 
                                  <span className="text-zinc-500 text-xs ml-auto font-mono">({p.prixUnitaire}€)</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col justify-between items-end min-w-[120px] mt-4 md:mt-0 border-t md:border-t-0 md:border-l border-zinc-200/50 pt-4 md:pt-0 md:pl-6">
                            <div className="text-right mb-4">
                              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Total</div>
                              <div className="text-3xl font-black text-velatra-accent">{order.total} €</div>
                              {order.pointsGagnes > 0 && <div className="text-xs font-bold text-velatra-warning mt-1">+{order.pointsGagnes} pts</div>}
                            </div>
                            {order.status === 'requested' && (
                              <div className="flex gap-2 w-full md:w-auto">
                                <button onClick={() => handleUpdateOrderStatus(order.id, 'completed')} className="flex-1 md:flex-none flex justify-center items-center p-3 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-xl transition-all duration-300">
                                  <CheckIcon size={20} />
                                </button>
                                <button onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')} className="flex-1 md:flex-none flex justify-center items-center p-3 bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white rounded-xl transition-all duration-300">
                                  <XIcon size={20} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {state.supplementOrders.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="text-center py-12 text-zinc-500 italic bg-white/40 backdrop-blur-md rounded-3xl border border-zinc-200/50"
                >
                  Aucune commande pour le moment.
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
