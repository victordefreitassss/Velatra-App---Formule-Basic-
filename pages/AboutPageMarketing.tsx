import React from 'react';
import { motion } from 'framer-motion';
import { 
  Award, Target, Shield, Heart, Users, Sparkles, 
  MapPin, Calendar, Compass, ArrowUpRight, CheckCircle
} from 'lucide-react';

export default function AboutPageMarketing() {
  const values = [
    {
      title: "L'Excellence d'abord",
      desc: "Nous soignons chaque pixel et concevons des algorithmes d’une rapidité absolue pour correspondre aux standards professionnels des plus grands athlètes.",
      icon: Award
    },
    {
      title: "Simplicité Radicale",
      desc: "Fini le bruit visuel et les formulaires incompréhensibles. Velatra élimine la complexité pour vous permettre de travailler de façon fluide en direct.",
      icon: Target
    },
    {
      title: "Sécurité & Confidentialité",
      desc: "Les données d'évolution physique de vos membres et l'état de vos finances Stripe sont strictement étanches et sauvegardés en Europe.",
      icon: Shield
    }
  ];

  const milestones = [
    {
      year: "2024",
      title: "Genèse de l'idée & Rencontres",
      desc: "Victor De Freitas, coach passionné et ingénieur, constate qu'il passe plus de 15h par semaine à faire du secrétariat répétitif. Velatra est initiée pour libérer le coach."
    },
    {
      year: "2025",
      title: "Version Alpha & 100 Coachs Pionniers",
      desc: "Développement conjoint de la plateforme avec un cercle fermé de studios de personal-training en France pour gommer toutes les frictions en conditions réelles."
    },
    {
      year: "2026",
      title: "Lancement de la Plateforme d'Élite",
      desc: "Velatra sort de sa phase confidentielle. L’écosystème réunit maintenant la messagerie chiffrée, le générateur d'exercices dynamique, l’onboarding CRM et Stripe."
    }
  ];

  const team = [
    {
      name: "Victor De Freitas",
      role: "Fondateur & Architecte Technique",
      bio: "Ancien athlète de force athlétique et développeur d'élite. Passionné par l'intersection entre le coaching physique et l'excellence logicielle.",
      initials: "VF"
    },
    {
      name: "Marie Sénécal",
      role: "Responsable Produit & Coaching",
      bio: "Spécialiste de la nutrition sportive certifiée. Garante de la pertinence de nos modules énergétiques et du générateur d'exercices.",
      initials: "MS"
    },
    {
      name: "Lucas Pereira",
      role: "Directeur de l'Assistance Client",
      bio: "Toujours à l'écoute des directeurs de salle. S'assure que chaque onboarding client s'exécute avec fluidité en moins d'une heure.",
      initials: "LP"
    }
  ];

  return (
    <div className="pt-32 pb-24 relative overflow-hidden bg-transparent">
      {/* Visual glowing shapes */}
      <div className="absolute top-1/3 left-10 w-80 h-80 bg-emerald-500/5 rounded-full blur-[130px] pointer-events-none animate-pulse"></div>

      <div className="max-w-5xl mx-auto px-6 space-y-24">
        
        {/* Intro Hero Section */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full font-black uppercase tracking-wider block w-fit mx-auto">
            NOTRE PHILOSOPHIE
          </span>
          <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight text-zinc-950 dark:text-white leading-none">
            Unifier le digital pour libérer le coach
          </h1>
          <p className="text-zinc-550 dark:text-zinc-400 text-sm md:text-base leading-relaxed">
            Velatra est née d’une colère constructive : les entraîneurs passionnés et les studios de fitness d’élite passent trop d'heures par semaine à faire de la bureaucratie répétitive. Notre mission absolue est d'automatiser tout l'administration pour vous redonner 100% de votre temps auprès de vos athlètes.
          </p>
        </div>

        {/* Culture / Values Group */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {values.map((val, idx) => {
            const Icon = val.icon;
            return (
              <div
                key={idx}
                className="p-8 bg-white dark:bg-zinc-905 border border-zinc-200/60 dark:border-zinc-850 rounded-[32px] space-y-4 shadow-sm hover:scale-[1.01] transition-transform"
              >
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl w-fit">
                  <Icon className="w-5 h-5 flex shrink-0" />
                </div>
                <h3 className="text-base font-bold text-zinc-950 dark:text-white tracking-tight">{val.title}</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {val.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Dynamic Timeline of Milestones */}
        <div className="py-12 border-t border-zinc-200/40 dark:border-zinc-850">
          <div className="text-center space-y-3 mb-16">
            <span className="text-xs text-zinc-400 font-extrabold uppercase tracking-widest block font-mono">Milestones</span>
            <h2 className="text-2xl md:text-3xl font-display font-black text-zinc-950 dark:text-white tracking-tight">
              Notre chemin vers la disruption
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs md:text-sm">
              Découvrez les trois piliers essentiels de notre croissance technologique.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto relative">
            {milestones.map((mile, idx) => (
              <div key={idx} className="space-y-4 relative bg-white dark:bg-zinc-905 border/40 border-zinc-150 p-6 rounded-2xl">
                <span className="text-3xl font-display font-black text-emerald-500/80 block">{mile.year}</span>
                <h3 className="text-sm font-black text-zinc-950 dark:text-white tracking-tight">{mile.title}</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-450 leading-relaxed font-normal">{mile.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Founder Letter Board */}
        <div className="p-8 md:p-12 bg-radial from-zinc-900 via-zinc-950 to-black text-white rounded-[40px] border border-zinc-850 grid grid-cols-1 md:grid-cols-12 gap-8 items-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-550/10 rounded-full blur-[70px] pointer-events-none"></div>

          <div className="md:col-span-4 shrink-0 flex justify-center relative z-10">
            <div className="w-36 h-36 rounded-full overflow-hidden border-2 border-emerald-500 p-1 flex items-center justify-center bg-zinc-900 shadow-md">
              <div className="w-full h-full bg-zinc-800 rounded-full flex items-center justify-center font-display font-black text-3xl text-zinc-100">
                VF
              </div>
            </div>
          </div>
          <div className="md:col-span-8 space-y-4 relative z-10">
            <span className="text-xs text-emerald-400 uppercase tracking-widest font-black bg-emerald-500/10 px-3 py-1 rounded-full w-fit block">
              LE MOT DU FONDATEUR
            </span>
            <p className="text-zinc-300 text-xs md:text-sm italic leading-relaxed font-serif">
              "J’ai fondé Velatra avec une conviction inébranlable : le digital doit être un serviteur invisible, pas une source d'anxiété supplémentaire. Notre plateforme a été construite sur le terrain, aux côtés des coachs, pour s’assurer qu’elle tienne ses promesses de robustesse et de fluidité absolue. Merci pour votre absolue confiance."
            </p>
            <div>
              <strong className="text-sm font-bold block text-white">Victor De Freitas</strong>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold mt-0.5">Fondateur de Velatra</span>
            </div>
          </div>
        </div>

        {/* Creative Team Sections */}
        <div className="py-12 border-t border-zinc-200/40 dark:border-zinc-850">
          <div className="text-center space-y-3 mb-16">
            <span className="text-xs text-zinc-400 font-extrabold uppercase tracking-widest block font-mono">L'ÉQUIPE</span>
            <h2 className="text-2xl md:text-3xl font-display font-black text-zinc-950 dark:text-white tracking-tight">
              Les passionnés derrière la plateforme
            </h2>
            <p className="text-zinc-550 dark:text-zinc-400 text-xs text-center max-w-sm mx-auto">
              Une équipe d'athlètes et d'ingénieurs dévoués à votre réussite commerciale et sportive.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, idx) => (
              <div key={idx} className="p-6 bg-white dark:bg-zinc-905 border border-zinc-200/50 dark:border-zinc-850 rounded-3xl flex flex-col items-center text-center space-y-4 shadow-sm hover:scale-[1.01] transition-transform">
                <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 font-display font-black text-xl rounded-full flex items-center justify-center border border-emerald-500/20">
                  {member.initials}
                </div>
                <div>
                  <h4 className="text-sm font-black text-zinc-950 dark:text-white tracking-tight">{member.name}</h4>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold mt-0.5">{member.role}</p>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Career CTA */}
        <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-250/50 dark:border-zinc-800 p-8 rounded-3xl text-center max-w-2xl mx-auto space-y-4">
          <h3 className="text-base font-bold text-zinc-950 dark:text-white tracking-tight">🚀 Nous cherchons des talents !</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Vous êtes ingénieur Full-Stack, coach de haut niveau passionné de No-Code, ou spécialiste de la réussite client ? Si vous croyez en la libération de la performance par le digital, envoyez-nous votre profil.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500 hover:text-emerald-600 transition-all font-mono py-1 border-b border-emerald-500 hover:border-emerald-600"
          >
            Voir les opportunités <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

      </div>
    </div>
  );
}

export { AboutPageMarketing };
