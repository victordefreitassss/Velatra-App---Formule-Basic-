import React, { useState } from 'react';
import { AppState, SupplementProduct } from '../types';
import { Card, Button, Input, Badge } from '../components/UI';
import { PlusIcon, Trash2Icon } from '../components/Icons';
import { db, doc, setDoc, deleteDoc } from '../firebase';
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

export const SupplementsPage: React.FC<{ state: AppState, setState: any, showToast: any, isEmbedded?: boolean }> = ({ state, setState, showToast, isEmbedded }) => {
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Toutes');
  const [newProduct, setNewProduct] = useState<Partial<SupplementProduct>>({
    nom: '', prixVente: 0, prixAchat: 0, stock: 0, cat: 'Protéines', lienPartenaire: ''
  });

  const filteredProducts = state.supplementProducts.filter(p => {
    if (!p.nom.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterCategory !== 'Toutes' && p.cat !== filterCategory) return false;
    return true;
  });

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
      cat: newProduct.cat || 'Protéines',
      lienPartenaire: newProduct.lienPartenaire || ''
    };
    try {
      await setDoc(doc(db, "supplementProducts", id), product);
      setShowAddProduct(false);
      setNewProduct({ nom: '', prixVente: 0, prixAchat: 0, stock: 0, cat: 'Protéines', lienPartenaire: '' });
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

  return (
    <motion.div 
      className={isEmbedded ? "space-y-8" : "p-6 max-w-7xl mx-auto space-y-8 pb-24"}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        {!isEmbedded && (
          <div>
            <h1 className="text-4xl font-black italic text-zinc-900 tracking-tight uppercase">Boutique</h1>
            <p className="text-zinc-500 text-sm font-medium mt-1">Gérez vos produits partenaires</p>
          </div>
        )}
      </motion.div>

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
                className="pl-12 !bg-white/60 backdrop-blur-xl ! !rounded-2xl font-bold text-sm focus:!bg-white transition-all" 
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
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 ${filterCategory === f ? 'bg-velatra-accent text-white shadow-md shadow-velatra-accent/20' : 'bg-white/60 backdrop-blur-xl border  text-zinc-500 hover:text-zinc-900 hover:bg-white'}`}
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
              <Card className="bg-white/80 backdrop-blur-2xl  shadow-xl shadow-zinc-200/20">
                <h3 className="text-lg font-bold text-zinc-900 mb-4">Nouveau produit</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1 font-bold uppercase tracking-widest">Nom</label>
                    <Input value={newProduct.nom} onChange={e => setNewProduct({...newProduct, nom: e.target.value})} placeholder="Ex: Whey Isolate" className="bg-white/60 backdrop-blur-xl " />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1 font-bold uppercase tracking-widest">Catégorie</label>
                    <select 
                      value={newProduct.cat} 
                      onChange={e => setNewProduct({...newProduct, cat: e.target.value})}
                      className="w-full bg-white/60 backdrop-blur-xl border  rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:border-velatra-accent transition-all"
                    >
                      <option value="Protéines">Protéines</option>
                      <option value="Vitamines">Vitamines</option>
                      <option value="Snacks">Snacks</option>
                      <option value="Accessoires">Accessoires</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1 font-bold uppercase tracking-widest">Prix Achat (€)</label>
                    <Input type="number" value={newProduct.prixAchat || ''} onChange={e => setNewProduct({...newProduct, prixAchat: Number(e.target.value) || 0})} className="bg-white/60 backdrop-blur-xl " />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1 font-bold uppercase tracking-widest">Prix Vente (€)</label>
                    <Input type="number" value={newProduct.prixVente || ''} onChange={e => setNewProduct({...newProduct, prixVente: Number(e.target.value) || 0})} className="bg-white/60 backdrop-blur-xl " />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1 font-bold uppercase tracking-widest">Stock</label>
                    <Input type="number" value={newProduct.stock || ''} onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value) || 0})} className="bg-white/60 backdrop-blur-xl " />
                  </div>
                  <div className="md:col-span-2 lg:col-span-5">
                    <label className="block text-xs text-zinc-500 mb-1 font-bold uppercase tracking-widest">Lien Partenaire (Optionnel)</label>
                    <Input value={newProduct.lienPartenaire || ''} onChange={e => setNewProduct({...newProduct, lienPartenaire: e.target.value})} placeholder="Ex: https://fitnessboutique.fr/..." className="bg-white/60 backdrop-blur-xl " />
                    <p className="text-[10px] text-zinc-500 mt-1">Si renseigné, l'adhérent sera redirigé vers ce lien pour acheter le produit.</p>
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
                <Card className="bg-white/60 backdrop-blur-xl  flex flex-col justify-between h-full hover:shadow-xl hover:shadow-zinc-200/20 transition-all duration-300 group">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="blue" className="bg-blue-500/10 text-blue-600 border-none">{product.cat}</Badge>
                      <button onClick={() => handleDeleteProduct(product.id)} className="text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10 transition-all p-2 rounded-lg opacity-0 group-hover:opacity-100">
                        <Trash2Icon size={16} />
                      </button>
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 mb-1">{product.nom}</h3>
                    {!product.lienPartenaire && (
                      <div className="text-sm text-zinc-500 mb-4">Stock: <span className={product.stock < 5 ? "text-rose-500 font-bold" : "text-zinc-900 font-medium"}>{product.stock}</span> unités</div>
                    )}
                    {product.lienPartenaire && (
                      <div className="text-sm text-velatra-accent mb-4 font-medium truncate" title={product.lienPartenaire}>
                        Lien Partenaire Actif
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-end border-t  pt-4 mt-2">
                    <div>
                      {!product.lienPartenaire && (
                        <>
                          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Prix Achat</div>
                          <div className="font-mono text-zinc-900">{product.prixAchat} €</div>
                        </>
                      )}
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
              className="col-span-full text-center py-12 text-zinc-500 italic bg-white/40 backdrop-blur-md rounded-3xl border "
            >
              Aucun produit trouvé.
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
