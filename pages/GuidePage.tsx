import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchIcon, DumbbellIcon, AppleIcon, DollarSignIcon, CalendarIcon, MessageCircleIcon, TargetIcon, FolderIcon, UsersIcon, ChevronRightIcon } from '../components/Icons';
import { Page } from '../types';

const FEATURES = [
  {
    id: 'coaching',
    title: 'Coaching & Programmes',
    description: 'Créez des programmes d\'entraînement sur mesure, suivez les performances de vos membres et ajustez leurs séances en temps réel.',
    icon: DumbbellIcon,
    category: 'Entraînement',
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    details: ['Création de programmes personnalisés', 'Bibliothèque d\'exercices avec vidéos', 'Suivi des charges et des records', 'Modèles réutilisables'],
    targetPage: 'coaching' as Page,
    subTopics: [
      {
        title: "Créer un programme sur mesure",
        content: "Pour créer un programme, rendez-vous sur le profil du membre, onglet 'Programmes', et cliquez sur 'Nouveau Programme'. Vous pourrez y ajouter des exercices, définir les séries, répétitions et temps de repos."
      },
      {
        title: "Utiliser les Modèles (Presets)",
        content: "Un modèle est une trame réutilisable. Créez vos modèles dans l'onglet 'Modèles' (ex: 'Push', 'Pull', 'Legs'). Vous pourrez ensuite les assigner en un clic à n'importe quel membre pour gagner du temps."
      },
      {
        title: "Le Live Coaching (Séance en direct)",
        content: "Pendant une séance avec votre client, ouvrez son programme du jour et cliquez sur 'Démarrer la séance'. Vous pourrez valider chaque série en temps réel, noter les charges et lancer le chronomètre de repos."
      },
      {
        title: "Ajouter des exercices personnalisés",
        content: "Dans l'onglet 'Exos', vous pouvez enrichir la base de données avec vos propres exercices, incluant des liens vidéos (YouTube, Vimeo) pour montrer l'exécution parfaite à vos clients."
      }
    ]
  },
  {
    id: 'nutrition',
    title: 'Suivi Nutritionnel',
    description: 'Élaborez des plans alimentaires précis, suivez les macros et aidez vos clients à atteindre leurs objectifs physiques.',
    icon: AppleIcon,
    category: 'Nutrition',
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    details: ['Plans alimentaires sur mesure', 'Calculateur de macros intégré', 'Suivi du poids et des mensurations', 'Recettes et recommandations'],
    targetPage: 'nutrition' as Page,
    subTopics: [
      {
        title: "Créer un plan alimentaire",
        content: "Allez dans l'onglet 'Nutrition', cliquez sur 'Nouveau Plan'. Ajoutez des repas et des aliments. Les macronutriments (protéines, glucides, lipides) et les calories se calculent automatiquement."
      },
      {
        title: "Suivi quotidien par le client",
        content: "Le client voit son plan sur son application. Il peut valider ses repas jour après jour et suivre son apport calorique quotidien pour rester aligné avec ses objectifs."
      },
      {
        title: "Suivi corporel (Poids & Mensurations)",
        content: "Dans le profil du membre, l'onglet 'Suivi Corporel' permet d'ajouter le poids et les mensurations à différentes dates pour générer des graphiques de progression visuels."
      }
    ]
  },
  {
    id: 'planning',
    title: 'Planning & Réservations',
    description: 'Gérez votre emploi du temps, proposez des créneaux de coaching et laissez vos membres réserver leurs séances en un clic.',
    icon: CalendarIcon,
    category: 'Organisation',
    image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    details: ['Calendrier interactif', 'Réservation en ligne pour les membres', 'Gestion des absences', 'Synchronisation des disponibilités'],
    targetPage: 'calendar' as Page,
    subTopics: [
      {
        title: "Configurer ses disponibilités",
        content: "Dans Paramètres > Planning, définissez vos jours et heures de travail, ainsi que la durée standard de vos séances. Ces créneaux deviendront réservables par vos clients."
      },
      {
        title: "Réservation côté client",
        content: "Vos membres disposent d'un onglet 'Planning' sur leur espace. Ils y voient vos créneaux libres et peuvent réserver en un clic. La réservation s'ajoute instantanément à votre calendrier."
      },
      {
        title: "Gestion des absences et imprévus",
        content: "Vous pouvez bloquer des créneaux exceptionnels directement sur votre calendrier pour empêcher les réservations sur une période donnée (vacances, rendez-vous personnel)."
      }
    ]
  },
  {
    id: 'finances',
    title: 'Gestion Financière',
    description: 'Suivez vos revenus, gérez les abonnements via Stripe, et gardez un œil sur vos dépenses et factures.',
    icon: DollarSignIcon,
    category: 'Business',
    image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    details: ['Paiements en ligne via Stripe', 'Suivi du chiffre d\'affaires', 'Gestion des factures et devis', 'Tableau de bord financier'],
    targetPage: 'crm_finances' as Page,
    subTopics: [
      {
        title: "Connexion et configuration Stripe",
        content: "Dans Paramètres > Finances, renseignez votre clé secrète Stripe (sk_...) pour activer les paiements en ligne. Cela vous permet de facturer vos clients directement depuis l'application."
      },
      {
        title: "Créer des formules et abonnements",
        content: "Créez des abonnements mensuels ou des packs de séances. Un lien de paiement Stripe est généré pour chaque formule, que vous pouvez envoyer à vos clients pour qu'ils s'abonnent."
      },
      {
        title: "Suivi des revenus et charges",
        content: "Ajoutez vos charges fixes (loyer, logiciels) et dépenses ponctuelles dans l'onglet Finances. Le tableau de bord calcule votre bénéfice net automatiquement mois par mois."
      },
      {
        title: "Génération de factures",
        content: "Générez des factures PDF professionnelles pour vos clients directement depuis l'interface, avec calcul automatique de la TVA si applicable."
      }
    ]
  },
  {
    id: 'crm',
    title: 'CRM & ProspectFlow',
    description: 'Transformez vos prospects en clients fidèles grâce à un tunnel de vente optimisé et un suivi client irréprochable.',
    icon: TargetIcon,
    category: 'Business',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    details: ['Pipeline de vente visuel', 'Suivi des prospects', 'Relances automatiques', 'Analyse du taux de conversion'],
    targetPage: 'crm_pipeline' as Page,
    subTopics: [
      {
        title: "Le Pipeline de vente (Kanban)",
        content: "Un tableau visuel (Nouveau, Contacté, RDV, Gagné, Perdu) pour suivre l'avancement de chaque prospect. Glissez-déposez les cartes pour les faire avancer dans votre tunnel de vente."
      },
      {
        title: "Convertir un prospect en membre",
        content: "Une fois le prospect gagné (ex: il a signé ou payé), cliquez sur 'Convertir en membre' sur sa fiche. L'application lui créera automatiquement un compte client avec ses informations."
      },
      {
        title: "Tâches et rappels",
        content: "Créez des tâches (ex: 'Rappeler demain à 14h') liées à vos prospects pour ne rater aucune opportunité. Vous recevrez des notifications pour vos tâches du jour."
      }
    ]
  },
  {
    id: 'chat',
    title: 'Messagerie Intégrée',
    description: 'Communiquez facilement avec vos membres, envoyez des rappels et maintenez un lien fort pour garantir leurs résultats.',
    icon: MessageCircleIcon,
    category: 'Communication',
    image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    details: ['Chat en temps réel', 'Partage de fichiers et médias', 'Notifications push', 'Groupes de discussion'],
    targetPage: 'chat' as Page,
    subTopics: [
      {
        title: "Messagerie instantanée",
        content: "Discutez en direct avec vos membres depuis l'onglet 'Discussion'. Partagez des conseils, des encouragements ou répondez à leurs questions rapidement."
      },
      {
        title: "Notifications Push",
        content: "Vos clients reçoivent une notification sur leur téléphone lorsque vous leur envoyez un message, garantissant une communication fluide et réactive."
      }
    ]
  },
  {
    id: 'drive',
    title: 'Drive & Documents',
    description: 'Stockez et partagez des documents importants, des bilans, ou des guides avec vos membres en toute sécurité.',
    icon: FolderIcon,
    category: 'Organisation',
    image: 'https://images.unsplash.com/photo-1618044733300-9472054094ee?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    details: ['Stockage cloud sécurisé', 'Partage de fichiers avec les membres', 'Organisation par dossiers', 'Accès rapide aux bilans'],
    targetPage: 'drive' as Page,
    subTopics: [
      {
        title: "Dossiers clients personnalisés",
        content: "Créez un dossier par client pour y stocker ses bilans initiaux, photos d'évolution, contrats ou documents personnels."
      },
      {
        title: "Partage sécurisé",
        content: "Les fichiers uploadés dans le dossier d'un client ne sont visibles que par lui (sur son espace membre) et par vous. Idéal pour partager des PDF ou des guides."
      }
    ]
  },
  {
    id: 'members',
    title: 'Gestion des Membres',
    description: 'Ayez une vue d\'ensemble sur tous vos clients, leurs abonnements, leurs objectifs et leur progression globale.',
    icon: UsersIcon,
    category: 'Organisation',
    image: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    details: ['Profils détaillés des membres', 'Suivi de l\'engagement', 'Gestion des accès', 'Historique des actions'],
    targetPage: 'users' as Page,
    subTopics: [
      {
        title: "Ajouter un nouveau membre",
        content: "Cliquez sur 'Nouveau Membre' dans l'onglet Membres. Remplissez ses infos. L'application génère automatiquement ses identifiants de connexion (Code Club + Code Membre + Mot de passe)."
      },
      {
        title: "Profil 360° du client",
        content: "Accédez à tout l'historique d'un client depuis sa fiche : ses programmes passés et futurs, ses paiements, ses records, son plan alimentaire et ses documents."
      },
      {
        title: "Suspension d'accès",
        content: "En cas d'impayé ou de fin de coaching, passez le statut du membre en 'Suspendu' pour bloquer instantanément son accès à l'application."
      }
    ]
  }
];

const FeatureDetail: React.FC<{ feature: typeof FEATURES[0], onBack: () => void, onNavigate: (page: Page) => void }> = ({ feature, onBack, onNavigate }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24"
    >
      <button 
        onClick={onBack} 
        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 mb-8 transition-colors font-medium"
      >
        <ChevronRightIcon className="w-5 h-5 rotate-180" />
        <span>Retour au guide principal</span>
      </button>

      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-zinc-100 mb-12">
        <div className="h-64 sm:h-96 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10" />
          <img 
            src={feature.image} 
            alt={feature.title} 
            className="w-full h-full object-cover" 
            referrerPolicy="no-referrer" 
          />
          <div className="absolute bottom-8 left-8 right-8 z-20 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-lg border border-white/10">
                <feature.icon className="w-8 h-8" />
              </div>
              <div>
                <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-emerald-500 text-white rounded-full mb-3 inline-block">
                  {feature.category}
                </span>
                <h1 className="text-3xl sm:text-5xl font-display font-bold text-white leading-tight">{feature.title}</h1>
              </div>
            </div>
            
            <button 
              onClick={() => onNavigate(feature.targetPage)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 shrink-0 shadow-lg shadow-emerald-500/30"
            >
              Accéder au module <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-8 sm:p-10 bg-zinc-900 text-white">
          <p className="text-lg sm:text-xl text-zinc-300 leading-relaxed max-w-3xl">
            {feature.description}
          </p>
        </div>
      </div>

      <div className="mb-12">
        <h2 className="text-3xl font-display font-bold text-zinc-900 mb-8 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.418.33z" /></svg>
          </div>
          Sous-sujets et Tutoriels
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {feature.subTopics.map((topic, idx) => (
            <div key={idx} className="bg-white border border-zinc-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 transform origin-bottom scale-y-0 group-hover:scale-y-100 transition-transform duration-300" />
              <h3 className="text-xl font-bold text-zinc-900 mb-4">{topic.title}</h3>
              <p className="text-zinc-600 leading-relaxed">{topic.content}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export const GuidePage: React.FC<{ onNavigate: (page: Page) => void }> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  if (selectedFeatureId) {
    const feature = FEATURES.find(f => f.id === selectedFeatureId);
    if (feature) {
      return <FeatureDetail feature={feature} onBack={() => setSelectedFeatureId(null)} onNavigate={onNavigate} />;
    }
  }

  const categories = Array.from(new Set(FEATURES.map(f => f.category)));

  const filteredFeatures = FEATURES.filter(feature => {
    const matchesSearch = feature.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          feature.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          feature.details.some(d => d.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          feature.subTopics.some(st => st.title.toLowerCase().includes(searchQuery.toLowerCase()) || st.content.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory ? feature.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      {/* Header Section */}
      <div className="mb-12 text-center">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-display font-bold text-zinc-900 tracking-tight mb-4"
        >
          Centre d'aide <span className="text-emerald-500">Velatra</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-lg text-zinc-500 max-w-2xl mx-auto"
        >
          Sélectionnez un module ci-dessous pour découvrir tous ses secrets, tutoriels et astuces d'utilisation.
        </motion.p>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-12 flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-zinc-100">
        <div className="relative w-full md:w-96">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder="Rechercher (ex: Stripe, Planning, Programme...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-zinc-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-shadow text-zinc-900 placeholder-zinc-400"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === null 
                ? 'bg-zinc-900 text-white' 
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            Tout voir
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredFeatures.map((feature, index) => (
            <motion.div
              key={feature.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              onClick={() => setSelectedFeatureId(feature.id)}
              className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-zinc-100 flex flex-col cursor-pointer"
            >
              <div className="h-48 sm:h-64 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                <img 
                  src={feature.image} 
                  alt={feature.title} 
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-4 left-4 z-20 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-white">{feature.title}</h3>
                </div>
                <div className="absolute top-4 right-4 z-20">
                  <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md text-white rounded-full">
                    {feature.category}
                  </span>
                </div>
              </div>
              
              <div className="p-6 flex-1 flex flex-col">
                <p className="text-zinc-600 mb-6 leading-relaxed">
                  {feature.description}
                </p>
                
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-sm font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-2 group-hover:translate-x-2 transition-transform">
                    Voir les tutoriels <ChevronRightIcon className="w-4 h-4" />
                  </span>
                  <span className="text-xs text-zinc-400 font-medium bg-zinc-100 px-2 py-1 rounded-md">
                    {feature.subTopics.length} sujets
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredFeatures.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SearchIcon className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Aucun résultat trouvé</h3>
            <p className="text-zinc-500">Essayez de modifier vos termes de recherche ou de changer de catégorie.</p>
          </div>
        )}
      </div>
    </div>
  );
};
