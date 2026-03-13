import React, { useState } from 'react';
import { AppState, SupplementProduct, SupplementOrder } from '../types';
import { Card, Button, Input, Badge } from '../components/UI';
import { ShoppingCartIcon, PlusIcon, Trash2Icon, CheckIcon, XIcon } from '../components/Icons';
import { db, doc, setDoc, deleteDoc, updateDoc } from '../firebase';

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
    <div className="p-6 max-w-7xl mx-auto space-y-8 page-transition pb-24">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black italic text-zinc-900 tracking-tight uppercase">Boutique</h1>
          <p className="text-zinc-500 text-sm font-medium mt-1">Gérez vos produits et commandes</p>
        </div>
        <div className="flex gap-2 bg-zinc-50 p-1 rounded-xl border border-zinc-200">
          <button 
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'products' ? 'bg-velatra-accent text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            Produits
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'orders' ? 'bg-velatra-accent text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            Commandes
          </button>
        </div>
      </div>

      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-xl font-bold text-zinc-900">Catalogue</h2>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-900">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
                <Input 
                  placeholder="Rechercher un produit..." 
                  className="pl-12 !bg-zinc-50 !border-zinc-200 !rounded-2xl font-bold text-sm" 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                />
              </div>
              <Button onClick={() => setShowAddProduct(true)} variant="primary" className="!py-2 whitespace-nowrap">
                <PlusIcon size={16} className="mr-2" /> Ajouter un produit
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {["Toutes", "Protéines", "Vitamines", "Équipement", "Autre"].map(f => (
              <button
                key={f}
                onClick={() => setFilterCategory(f)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${filterCategory === f ? 'bg-velatra-accent text-white' : 'bg-zinc-50 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
              >
                {f}
              </button>
            ))}
          </div>

          {showAddProduct && (
            <Card className="bg-zinc-50 border-zinc-200">
              <h3 className="text-lg font-bold text-zinc-900 mb-4">Nouveau produit</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Nom</label>
                  <Input value={newProduct.nom} onChange={e => setNewProduct({...newProduct, nom: e.target.value})} placeholder="Ex: Whey Isolate" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Catégorie</label>
                  <select 
                    value={newProduct.cat} 
                    onChange={e => setNewProduct({...newProduct, cat: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:border-velatra-accent"
                  >
                    <option value="Protéines">Protéines</option>
                    <option value="Vitamines">Vitamines</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Accessoires">Accessoires</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Prix Achat (€)</label>
                  <Input type="number" value={newProduct.prixAchat || ''} onChange={e => setNewProduct({...newProduct, prixAchat: Number(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Prix Vente (€)</label>
                  <Input type="number" value={newProduct.prixVente || ''} onChange={e => setNewProduct({...newProduct, prixVente: Number(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Stock</label>
                  <Input type="number" value={newProduct.stock || ''} onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value) || 0})} />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={() => setShowAddProduct(false)}>Annuler</Button>
                <Button variant="primary" onClick={handleAddProduct}>Enregistrer</Button>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map(product => (
              <Card key={product.id} className="bg-zinc-50 border-zinc-200 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="blue">{product.cat}</Badge>
                    <button onClick={() => handleDeleteProduct(product.id)} className="text-red-500 hover:text-red-400 transition-colors p-1">
                      <Trash2Icon size={16} />
                    </button>
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 mb-1">{product.nom}</h3>
                  <div className="text-sm text-zinc-500 mb-4">Stock: <span className={product.stock < 5 ? "text-red-500 font-bold" : "text-zinc-900"}>{product.stock}</span> unités</div>
                </div>
                <div className="flex justify-between items-end border-t border-zinc-200 pt-4 mt-2">
                  <div>
                    <div className="text-xs text-zinc-500">Prix Achat</div>
                    <div className="font-mono text-zinc-900">{product.prixAchat} €</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-500">Prix Vente</div>
                    <div className="font-mono text-velatra-accent font-bold text-lg">{product.prixVente} €</div>
                  </div>
                </div>
              </Card>
            ))}
            {filteredProducts.length === 0 && !showAddProduct && (
              <div className="col-span-full text-center py-12 text-zinc-500 italic">
                Aucun produit trouvé.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-xl font-bold text-zinc-900">Commandes Récentes</h2>
            <div className="relative w-full md:w-64">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-900">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
              <Input 
                placeholder="Rechercher un membre..." 
                className="pl-12 !bg-zinc-50 !border-zinc-200 !rounded-2xl font-bold text-sm" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
            </div>
          </div>
          <div className="space-y-4">
            {filteredOrders.map(order => {
              const member = state.users.find(u => u.id === order.adherentId);
              return (
                <Card key={order.id} className="bg-zinc-50 border-zinc-200">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-zinc-900 font-bold">{member?.name || 'Membre inconnu'}</span>
                        <Badge variant={order.status === 'completed' ? 'success' : order.status === 'cancelled' ? 'dark' : 'orange'}>
                          {order.status === 'completed' ? 'Terminée' : order.status === 'cancelled' ? 'Annulée' : 'En attente'}
                        </Badge>
                      </div>
                      <div className="text-xs text-zinc-500 mb-3">
                        {new Date(order.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="space-y-1">
                        {order.produits.map((p, i) => (
                          <div key={i} className="text-sm text-zinc-900 flex gap-2">
                            <span className="text-zinc-500">{p.quantite}x</span> {p.nom} <span className="text-zinc-500 text-xs ml-2">({p.prixUnitaire}€)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col justify-between items-end min-w-[120px]">
                      <div className="text-right mb-4">
                        <div className="text-xs text-zinc-500 uppercase tracking-widest">Total</div>
                        <div className="text-2xl font-black text-velatra-accent">{order.total} €</div>
                        {order.pointsGagnes > 0 && <div className="text-xs text-velatra-warning">+{order.pointsGagnes} pts</div>}
                      </div>
                      {order.status === 'requested' && (
                        <div className="flex gap-2">
                          <button onClick={() => handleUpdateOrderStatus(order.id, 'completed')} className="p-2 bg-green-500/20 text-green-500 hover:bg-green-500/30 rounded-lg transition-colors">
                            <CheckIcon size={18} />
                          </button>
                          <button onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')} className="p-2 bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded-lg transition-colors">
                            <XIcon size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
            {state.supplementOrders.length === 0 && (
              <div className="text-center py-12 text-zinc-500 italic">
                Aucune commande pour le moment.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
