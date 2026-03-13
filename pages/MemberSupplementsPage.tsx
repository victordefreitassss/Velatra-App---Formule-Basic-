import React, { useState } from 'react';
import { AppState, SupplementProduct, SupplementOrder } from '../types';
import { Card, Button, Badge } from '../components/UI';
import { ShoppingCartIcon, PlusIcon, MinusIcon } from '../components/Icons';
import { db, doc, setDoc } from '../firebase';

export const MemberSupplementsPage: React.FC<{ state: AppState, showToast: any }> = ({ state, showToast }) => {
  const [cart, setCart] = useState<{product: SupplementProduct, quantity: number}[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Toutes');

  const filteredProducts = state.supplementProducts.filter(p => {
    if (!p.nom.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterCategory !== 'Toutes' && p.cat !== filterCategory) return false;
    return true;
  });

  const addToCart = (product: SupplementProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(item => item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev.filter(item => item.product.id !== productId);
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.prixVente * item.quantity), 0);
  const potentialPoints = Math.floor(cartTotal / 10); // 1 point par 10€

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    const orderId = Date.now().toString();
    const order: SupplementOrder = {
      id: orderId,
      clubId: state.user?.clubId || '',
      adherentId: state.user?.id || 0,
      coachName: state.currentClub?.name || 'Club',
      date: new Date().toISOString(),
      mois: new Date().toISOString().substring(0, 7),
      produits: cart.map(item => ({
        nom: item.product.nom,
        quantite: item.quantity,
        prixUnitaire: item.product.prixVente
      })),
      total: cartTotal,
      pointsGagnes: potentialPoints,
      status: 'requested'
    };

    try {
      await setDoc(doc(db, "supplementOrders", orderId), order);
      setCart([]);
      showToast("Commande envoyée à votre coach !", "success");
    } catch (err) {
      showToast("Erreur lors de la commande", "error");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 page-transition pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black italic text-zinc-900 tracking-tight uppercase">Boutique</h1>
          <p className="text-zinc-500 text-sm font-medium mt-1">Commandez vos compléments directement au club</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-900">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <input 
              type="text"
              placeholder="Rechercher un produit..." 
              className="w-full pl-12 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-2xl font-bold text-sm text-zinc-900 focus:outline-none focus:border-velatra-accent transition-colors" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProducts.map(product => {
              const inCart = cart.find(item => item.product.id === product.id)?.quantity || 0;
              return (
                <Card key={product.id} className="bg-zinc-50 border-zinc-200 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="blue">{product.cat}</Badge>
                      {product.stock <= 0 && <Badge variant="orange">Rupture</Badge>}
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 mb-1">{product.nom}</h3>
                    <div className="text-2xl font-black text-velatra-accent mb-4">{product.prixVente} €</div>
                  </div>
                  <div className="flex items-center justify-between border-t border-zinc-200 pt-4 mt-2">
                    {inCart > 0 ? (
                      <div className="flex items-center gap-3 bg-zinc-50 rounded-xl p-1">
                        <button onClick={() => removeFromCart(product.id)} className="w-8 h-8 flex items-center justify-center text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                          <MinusIcon size={16} />
                        </button>
                        <span className="font-bold text-zinc-900 w-4 text-center">{inCart}</span>
                        <button onClick={() => addToCart(product)} disabled={product.stock <= inCart} className="w-8 h-8 flex items-center justify-center text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors disabled:opacity-50">
                          <PlusIcon size={16} />
                        </button>
                      </div>
                    ) : (
                      <Button 
                        variant="primary" 
                        onClick={() => addToCart(product)} 
                        disabled={product.stock <= 0}
                        className="w-full"
                      >
                        <ShoppingCartIcon size={16} className="mr-2" /> Ajouter
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
            {state.supplementProducts.length === 0 && (
              <div className="col-span-full text-center py-12 text-zinc-500 italic">
                Aucun produit disponible pour le moment.
              </div>
            )}
          </div>
        </div>

        <div>
          <Card className="bg-velatra-bgCard border-zinc-200 sticky top-6">
            <h2 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
              <ShoppingCartIcon size={20} className="text-velatra-accent" /> Mon Panier
            </h2>

            {cart.length > 0 ? (
              <div className="space-y-6">
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500">{item.quantity}x</span>
                        <span className="text-zinc-900 font-medium">{item.product.nom}</span>
                      </div>
                      <span className="text-zinc-900 font-mono">{item.product.prixVente * item.quantity} €</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-zinc-200 pt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 uppercase tracking-widest text-xs font-bold">Total</span>
                    <span className="text-2xl font-black text-velatra-accent">{cartTotal} €</span>
                  </div>
                  {potentialPoints > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Points de fidélité gagnés</span>
                      <span className="text-velatra-warning font-bold">+{potentialPoints} pts</span>
                    </div>
                  )}
                </div>

                <Button variant="primary" fullWidth onClick={handleCheckout} className="!py-4 font-black italic shadow-xl shadow-velatra-accent/20">
                  COMMANDER
                </Button>
                <p className="text-[10px] text-center text-zinc-500">
                  Le paiement s'effectuera directement au club lors de la récupération de votre commande.
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-500 italic text-sm">
                Votre panier est vide.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
