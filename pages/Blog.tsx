import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User, ArrowRight } from 'lucide-react';

export default function BlogPage() {
  const posts = [
    {
      title: "Comment optimiser la rétention des membres de votre studio de fitness",
      desc: "Découvrez les leviers psychologiques et applicatifs pour amener vos athlètes à renouveler leur engagement d'entraînements de façon autonome.",
      date: "12 Juin 2026",
      author: "Victor De Freitas",
      slug: "optimiser-retention-membres-studio-fitness"
    },
    {
      title: "Automatiser sa comptabilité : Le guide ultime pour coach sportif indépendant",
      desc: "Ne perdez plus 5 heures à relancer les impayés et à générer des invoices manuelles en fin de mois. Intégrez Stripe en 1 clic.",
      date: "04 Juin 2026",
      author: "Compta Team",
      slug: "automatiser-comptabilite-guide-coach-independant"
    },
    {
      title: "Pourquoi le suivi de performance autonome motive d'avantage vos athlètes",
      desc: "Permettez à vos élèves de consigner facilement leurs charges de séances et courbe de rep-max pour un suivi sportif d'élite motivant.",
      date: "28 Mai 2026",
      author: "Velatra Coach",
      slug: "suivi-performance-autonome-motivation-athletes"
    }
  ];

  return (
    <div className="pt-32 pb-24">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center space-y-4 mb-16">
          <span className="text-xs font-black uppercase text-emerald-500 tracking-widest block font-bold">BLOG & CONSEILS PRO</span>
          <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight text-zinc-950 dark:text-white leading-none">
            L'excellence du personal training digitalisé
          </h1>
          <p className="text-zinc-550 dark:text-zinc-400 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            Profitez de nos guides stratégiques et retours d'expériences concrets pour développer l'image de marque et l'efficacité de vos entraînements sportifs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          {posts.map((post, idx) => (
            <div
              key={idx}
              className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl flex flex-col justify-between shadow-sm hover:scale-[1.01] transition-all"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-[10px] text-zinc-450 dark:text-zinc-500 font-mono">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {post.date}</span>
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {post.author}</span>
                </div>
                
                <h3 className="text-base font-bold text-zinc-950 dark:text-white tracking-tight line-clamp-2">{post.title}</h3>
                <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed line-clamp-3">{post.desc}</p>
              </div>

              <div className="pt-6">
                <Link
                  to={`/blog/${post.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500 hover:text-emerald-600 transition-colors"
                >
                  Lire l'article <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export { BlogPage };
