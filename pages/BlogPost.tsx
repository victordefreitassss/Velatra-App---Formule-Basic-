import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Clock, Heart, Share2, CornerDownRight } from 'lucide-react';

interface PostContent {
  title: string;
  desc: string;
  date: string;
  author: string;
  readTime: string;
  avatar: string;
  body: React.ReactNode;
}

export default function BlogPostPage() {
  const { slug } = useParams();

  const blogDatabase: Record<string, PostContent> = {
    "optimiser-retention-membres-studio-fitness": {
      title: "Comment optimiser la rétention des membres de votre studio de fitness",
      desc: "Découvrez les leviers psychologiques et applicatifs pour amener vos athlètes à renouveler leur engagement d'entraînements de façon autonome.",
      date: "12 Juin 2026",
      author: "Victor De Freitas",
      readTime: "5 min de lecture",
      avatar: "VF",
      body: (
        <React.Fragment>
          <p className="text-sm md:text-base leading-relaxed text-zinc-650 dark:text-zinc-350">
            La rentabilité d'un studio de coaching ou d'une salle de sport en petit groupe ne repose pas uniquement sur l'acquisition constante de nouveaux adhérents. En réalité, fidéliser et optimiser la rétention des athlètes actifs coûte 5 fois moins cher et renforce considérablement votre marge nette.
          </p>
          
          <h2 className="text-xl font-bold font-display text-zinc-950 dark:text-white pt-6 tracking-tight">
            1. Donnez de l'autonomie et de la visibilité sur les performances
          </h2>
          <p className="text-sm leading-relaxed text-zinc-650 dark:text-zinc-350">
            Pour qu'un athlète s'implique sur la durée, il doit ressentir sa propre courbe d'évolution. L'époque où le coach notait les rep-max sur un carnet de notes que l'élève ne relisait jamais est révolue. En mettant à disposition de vos membres un Espace Client autonome contenant leurs logs de séances et rapports corporels de saison, vous créez un engagement actif unique.
          </p>

          <h2 className="text-xl font-bold font-display text-zinc-950 dark:text-white pt-4 tracking-tight">
            2. Simplifiez la planification horaire
          </h2>
          <p className="text-sm leading-relaxed text-zinc-650 dark:text-zinc-350">
            Moins il y a de frictions pour réserver un créneau, plus l'élève s'entraînera intensément. L'écosystème digital Velatra intègre un planificateur interactif qui permet aux athlètes de bloquer leur place en 3 secondes chrono sur leur téléphone, tout en respectant les limites de places de votre salle de sport.
          </p>

          <h2 className="text-xl font-bold font-display text-zinc-950 dark:text-white pt-4 tracking-tight">
            3. Proposez des paiements récurrents Stripe sécurisés
          </h2>
          <p className="text-sm leading-relaxed text-zinc-650 dark:text-zinc-350">
            L'encaissement manuel par chèque ou monnaie liquide entraîne d'importants retards de paiements et coupe l'élan de fidélisation de vos adhérents. Automatisez la facturation récurrente pour vous défiler du temps libre tout en sécurisant votre trésorerie à 100%. Finies les conversations gênantes sur les retards de cotisations !
          </p>
          
          <div className="p-6 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 mt-8">
            <span className="text-xs font-black text-emerald-500 uppercase tracking-widest block mb-2">Chiffre Clé</span>
            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Un athlète qui a accès à sa courbe de performance et peut planifier en un clic présente un taux d'adhésion prolongé de <strong>2.4x</strong> par rapport à l'email standard.
            </p>
          </div>
        </React.Fragment>
      )
    },
    "automatiser-comptabilite-guide-coach-independant": {
      title: "Automatiser sa comptabilité : Le guide ultime pour coach sportif indépendant",
      desc: "Ne perdez plus 5 heures à relancer les impayés et à générer des invoices manuelles en fin de mois. Intégrez Stripe en 1 clic.",
      date: "04 Juin 2026",
      author: "Compta Team",
      readTime: "4 min de lecture",
      avatar: "CT",
      body: (
        <React.Fragment>
          <p className="text-sm md:text-base leading-relaxed text-zinc-650 dark:text-zinc-350">
            La comptabilité est la tâche que tous les coachs détestent. Pourtant, une mauvaise gestion des paiements ou des relances manuelles trop timides peuvent rapidement grever jusqu'à 15% de votre chiffre d'affaires réel annuel.
          </p>
          
          <h2 className="text-xl font-bold font-display text-zinc-950 dark:text-white pt-6 tracking-tight">
            Pourquoi le virement manuel est l'ennemi de votre croissance
          </h2>
          <p className="text-sm leading-relaxed text-zinc-650 dark:text-zinc-350">
            Demander un RIB, attendre que l'élève s'ajoute sur son application de banque, surveiller son relevé de compte en fin de mois : chacune de ces étapes est une opportunité d'oubli ou d'annulation de l'abonnement. Le paiement doit être automatique, transparent et indolore.
          </p>

          <h2 className="text-xl font-bold font-display text-zinc-950 dark:text-white pt-4 tracking-tight">
            Les avantages des prélèvements automatiques Stripe
          </h2>
          <p className="text-sm leading-relaxed text-zinc-650 dark:text-zinc-350">
            En couplant Velatra à Stripe, vous générez un lien de paiement unique pour vos forfaits ou abonnements récurrents. L'argent est prélevé à date fixe chaque mois et versé directement sur votre compte bancaire professionnel. Les invoices PDF certifiées sont transmises automatiquement aux athlètes pour leur comptabilité personnelle.
          </p>

          <h2 className="text-xl font-bold font-display text-zinc-950 dark:text-white pt-4 tracking-tight">
            Un suivi analytique de vos marges réelles
          </h2>
          <p className="text-sm leading-relaxed text-zinc-650 dark:text-zinc-350">
            Velatra intègre un tableau de bord analytique financier simple et ludique : chiffre d'affaires, marge de rentabilité estimée, et taux d'attrition. Vous gérez votre activité comme une véritable entreprise d'élite, avec des prédictions précises de fin de mois.
          </p>
        </React.Fragment>
      )
    },
    "suivi-performance-autonome-motivation-athletes": {
      title: "Pourquoi le suivi de performance autonome motive d'avantage vos athlètes",
      desc: "Permettez à vos élèves de consigner facilement leurs charges de séances et courbe de rep-max pour un suivi sportif d'élite motivant.",
      date: "28 Mai 2026",
      author: "Velatra Coach",
      readTime: "6 min de lecture",
      avatar: "VC",
      body: (
        <React.Fragment>
          <p className="text-sm md:text-base leading-relaxed text-zinc-650 dark:text-zinc-350">
            Qu'est-ce qui maintient un sportif assidu à sa salle de sport sur 6 mois, 1 an, ou 3 ans ? Ce n'est pas seulement le plaisir de s'entraîner, c'est la conscience absolue de ses progrès physiques et athlétiques.
          </p>
          
          <h2 className="text-xl font-bold font-display text-zinc-950 dark:text-white pt-6 tracking-tight">
            L'effet placebo du carnet d'entraînement en papier
          </h2>
          <p className="text-sm leading-relaxed text-zinc-650 dark:text-zinc-350">
            Le papier se perd, se tache de transpiration et ne produit aucune statistique. Mais surtout, le carnet papier n'émet pas de graphique de tendance. Lorsque l'athlète voit sa courbe de Squat s'élever ou sa courbe de poids se stabiliser sur un bel écran réactif, un déclic psychologique puissant s'exécute.
          </p>

          <h2 className="text-xl font-bold font-display text-zinc-950 dark:text-white pt-4 tracking-tight">
            La gamification saine de la performance
          </h2>
          <p className="text-sm leading-relaxed text-zinc-650 dark:text-zinc-350">
            En récompensant les nouveaux Records Personnels (RP) et en attribuant des grades de force dynamiques selon des ratios scientifiques, Velatra ludifie l'effort. L'entraînement n'est plus une corvée, c'est une succession de défis stimulants et structurés par les conseils avisés de son coach dédié.
          </p>

          <h2 className="text-xl font-bold font-display text-zinc-950 dark:text-white pt-4 tracking-tight">
            Alléger le travail direct de l'entraîneur
          </h2>
          <p className="text-sm leading-relaxed text-zinc-650 dark:text-zinc-350">
            En rendant vos membres autonomes sur la saisie de leurs sets, vous gagnez un temps précieux. Vous n'avez plus à saisir les logs de 30 personnes à la main chaque fin de journée. Vous analysez simplement les rapports consolidés depuis votre dashboard super-admin à tout moment.
          </p>
        </React.Fragment>
      )
    }
  };

  const defaultPost = blogDatabase["optimiser-retention-membres-studio-fitness"];
  const activePost = slug && blogDatabase[slug] ? blogDatabase[slug] : defaultPost;

  // Recommended articles (filtering out active post)
  const relatedPosts = Object.entries(blogDatabase)
    .filter(([key]) => key !== slug)
    .slice(0, 2);

  return (
    <div className="pt-32 pb-24 relative overflow-hidden bg-transparent">
      {/* Background accents */}
      <div className="absolute top-24 left-1/4 w-72 h-72 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-3xl mx-auto px-6">
        
        {/* Navigation back */}
        <Link 
          to="/blog" 
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500 hover:text-emerald-600 transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Retour à la liste d'articles
        </Link>

        {/* Article Body Container */}
        <div className="space-y-8 bg-white dark:bg-zinc-905 border border-zinc-200/50 dark:border-zinc-850 p-8 md:p-12 rounded-[40px] shadow-lg">
          
          {/* Metadata banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/60 pb-6 text-xs text-zinc-500 font-mono">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-zinc-400" /> {activePost.date}</span>
              <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-zinc-400" /> {activePost.author}</span>
            </div>
            <span className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-805/60 px-2.5 py-1 rounded-full"><Clock className="w-3.5 h-3.5 text-emerald-500" /> {activePost.readTime}</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-4xl font-display font-black tracking-tight text-zinc-950 dark:text-white leading-tight">
            {activePost.title}
          </h1>

          <p className="text-sm text-zinc-500 dark:text-zinc-450 italic border-l-2 border-emerald-500 pl-4 py-1 leading-relaxed">
            "{activePost.desc}"
          </p>

          <article className="prose dark:prose-invert max-w-none text-zinc-650 dark:text-zinc-350 text-sm md:text-base leading-relaxed space-y-6 pt-4">
            {activePost.body}
          </article>

          {/* Author Board */}
          <div className="border-t border-zinc-150 dark:border-zinc-800/60 pt-8 mt-10 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <div className="sm:col-span-2 flex justify-start">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 font-display font-black text-sm flex items-center justify-center border border-emerald-500/20">
                {activePost.avatar}
              </div>
            </div>
            <div className="sm:col-span-8 flex flex-col">
              <strong className="text-sm font-bold text-zinc-950 dark:text-white">{activePost.author}</strong>
              <p className="text-[10px] text-zinc-450 dark:text-zinc-500 mt-0.5">Équipe de rédaction de Velatra d'Elite • Expert Performance</p>
            </div>
            <div className="sm:col-span-2 flex items-center gap-2.5 sm:justify-end text-zinc-400">
              <button className="p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-450 hover:text-emerald-500 rounded-full transition-colors border-none bg-transparent" aria-label="Aimer">
                <Heart className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-450 hover:text-emerald-500 rounded-full transition-colors border-none bg-transparent" aria-label="Partager">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Related posts recommended list */}
        <div className="mt-16 pt-12 border-t border-zinc-200/50 dark:border-zinc-850">
          <h3 className="text-xl font-display font-black text-zinc-950 dark:text-white tracking-tight mb-8">
            Continuer la lecture
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {relatedPosts.map(([key, item]) => (
              <div 
                key={key}
                className="p-6 bg-white dark:bg-zinc-905 border border-zinc-250/50 dark:border-zinc-850 rounded-2xl space-y-4 flex flex-col justify-between shadow-sm hover:scale-[1.01] transition-transform"
              >
                <div className="space-y-2">
                  <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">{item.date}</span>
                  <h4 className="text-xs md:text-sm font-black text-zinc-950 dark:text-white tracking-tight leading-snug line-clamp-2">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
                <Link
                  to={`/blog/${key}`}
                  className="text-[11px] font-bold text-emerald-500 hover:text-emerald-600 transition-colors inline-flex items-center gap-1 w-fit"
                >
                  Lire la suite <CornerDownRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export { BlogPostPage };
