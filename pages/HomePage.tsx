import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, Check,
  ChevronDown, ClipboardList, Dumbbell, MessageCircle,
  MoveUpRight, Play, Sparkles, Users, Wallet, X
} from 'lucide-react';
import './marketing.css';

type DemoKey = 'clients' | 'crm' | 'programmes' | 'planning' | 'paiements' | 'nutrition';

const demos: { key: DemoKey; label: string; icon: typeof Users; title: string; copy: string }[] = [
  { key: 'clients', label: 'Clients', icon: Users, title: 'Le suivi de vos clients, au même endroit.', copy: 'Retrouvez les profils, les objectifs et les informations utiles de vos adhérents.' },
  { key: 'crm', label: 'Prospects', icon: Activity, title: 'Un suivi clair, du premier contact à l’inscription.', copy: 'Organisez les prises de contact et gardez une vue d’ensemble sur votre activité commerciale.' },
  { key: 'programmes', label: 'Programmes', icon: Dumbbell, title: 'Préparez et partagez les programmes.', copy: 'Créez des séances et des programmes que vos adhérents retrouvent dans leur espace.' },
  { key: 'planning', label: 'Planning', icon: CalendarDays, title: 'Votre planning de coaching en un coup d’œil.', copy: 'Centralisez vos rendez-vous, vos séances et vos créneaux.' },
  { key: 'paiements', label: 'Paiements', icon: Wallet, title: 'Gardez une vue sur les paiements.', copy: 'Consultez les paiements et gérez vos formules depuis votre espace coach.' },
  { key: 'nutrition', label: 'Nutrition', icon: ClipboardList, title: 'Prolongez l’accompagnement au quotidien.', copy: 'Préparez un suivi alimentaire et rendez-le accessible à vos adhérents.' },
];

const faqs = [
  { q: 'À qui s’adresse Velatra ?', a: 'Velatra s’adresse aux coachs sportifs, personal trainers et structures de coaching qui veulent réunir le suivi des adhérents, les programmes et l’organisation de leur activité.' },
  { q: 'Que peuvent faire les adhérents dans leur espace ?', a: 'Selon les fonctionnalités activées par leur coach, les adhérents peuvent retrouver leurs programmes, consulter leurs séances et renseigner leur suivi.' },
  { q: 'Velatra permet-il de gérer des programmes sportifs et alimentaires ?', a: 'Oui. L’application comprend des outils de préparation de programmes d’entraînement et de suivi nutritionnel.' },
  { q: 'Puis-je utiliser Velatra comme coach indépendant ?', a: 'Oui. L’espace coach permet de gérer les adhérents et les outils de coaching depuis un même compte.' },
  { q: 'Comment découvrir les tarifs et créer un compte ?', a: 'Consultez la page Tarifs pour les offres affichées, ou créez un compte pour accéder au parcours d’inscription.' },
];

function ProductWindow({ active }: { active: DemoKey }) {
  const activeDemo = demos.find((demo) => demo.key === active) ?? demos[0];
  const ActiveIcon = activeDemo.icon;
  return (
    <div className="marketing-window" aria-label="Aperçu interactif de l’application Velatra">
      <div className="marketing-window-top">
        <div className="marketing-window-brand"><span className="marketing-brand-mark">V</span><span>VELATRA</span></div>
        <span className="marketing-demo-label"><span /> Aperçu · données de démonstration</span>
        <div className="marketing-window-avatar">VD</div>
      </div>
      <div className="marketing-window-body">
        <aside className="marketing-app-sidebar" aria-label="Menu de démonstration">
          <p className="marketing-sidebar-caption">ESPACE COACH</p>
          {demos.map((demo) => {
            const Icon = demo.icon;
            return <span key={demo.key} className={active === demo.key ? 'marketing-side-link is-active' : 'marketing-side-link'}><Icon size={15} />{demo.label}</span>;
          })}
          <div className="marketing-sidebar-bottom"><span className="marketing-sidebar-avatar">VD</span><span><b>Votre espace</b><small>Compte coach</small></span></div>
        </aside>
        <div className="marketing-app-content">
          <div className="marketing-app-heading"><div><span className="marketing-app-eyebrow">TABLEAU DE BORD</span><h3>{active === 'crm' ? 'Suivi des prospects' : activeDemo.label}</h3></div><button type="button" className="marketing-app-add"><span>＋</span> Ajouter</button></div>
          <div className="marketing-app-welcome"><div><p>VOTRE ACTIVITÉ, EN UN SEUL ESPACE</p><h4>{activeDemo.title}</h4><span>{activeDemo.copy}</span></div><span className="marketing-app-icon"><ActiveIcon size={21} /></span></div>
          <div className="marketing-app-stats">
            <div><span>Adhérents</span><strong>24</strong><small><Users size={12} /> Espace clients</small></div>
            <div><span>Programmes</span><strong>08</strong><small><Dumbbell size={12} /> En préparation</small></div>
            <div><span>Cette semaine</span><strong>12</strong><small><CalendarDays size={12} /> Séances prévues</small></div>
          </div>
          <div className="marketing-app-lower">
            <div className="marketing-app-panel"><div className="marketing-panel-head"><b>{active === 'crm' ? 'Pipeline commercial' : 'À suivre'}</b><span>Cette semaine <ChevronDown size={13} /></span></div>
              {active === 'crm' ? <div className="marketing-mini-pipeline"><span>Nouveau contact<i /></span><span>À recontacter<i /></span><span>Rendez-vous<i /></span></div> : <div className="marketing-client-row"><span className="marketing-person-avatar">LM</span><span><b>Lucie Martin</b><small>Programme · Force & mobilité</small></span><span className="marketing-status">En cours</span></div>}
              <div className="marketing-client-row"><span className="marketing-person-avatar is-sand">AB</span><span><b>Alex Bernard</b><small>Dernière activité · cette semaine</small></span><span className="marketing-status">À suivre</span></div>
            </div>
            <div className="marketing-app-note"><span className="marketing-note-icon"><MessageCircle size={16} /></span><b>Un espace pensé pour le coaching</b><p>Des outils pour le coach. Un espace clair pour l’adhérent.</p><span className="marketing-note-link">Découvrir les fonctionnalités <ArrowUpRight size={13} /></span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoSection() {
  const [active, setActive] = useState<DemoKey>('clients');
  const current = demos.find((demo) => demo.key === active) ?? demos[0];
  return (
    <section className="marketing-section marketing-demo-section" id="demo">
      <div className="marketing-container">
        <div className="marketing-section-heading marketing-section-heading-split"><div><span className="marketing-kicker">UN APERÇU DU PRODUIT</span><h2>Votre activité de coaching.<br /><em>Enfin réunie.</em></h2></div><p>Explorez les espaces qui accompagnent le quotidien d’un coach, de la préparation des programmes au suivi des adhérents.</p></div>
        <div className="marketing-demo-tabs" role="tablist" aria-label="Fonctionnalités Velatra">
          {demos.map((demo) => { const Icon = demo.icon; return <button key={demo.key} type="button" role="tab" aria-selected={active === demo.key} className={active === demo.key ? 'marketing-demo-tab is-active' : 'marketing-demo-tab'} onClick={() => setActive(demo.key)}><Icon size={15} />{demo.label}</button>; })}
        </div>
        <div className="marketing-demo-grid"><div className="marketing-demo-copy"><span className="marketing-step">0{demos.findIndex((demo) => demo.key === active) + 1} / 06</span><h3>{current.title}</h3><p>{current.copy}</p><Link to="/fonctionnalites" className="marketing-text-link">Voir toutes les fonctionnalités <ArrowRight size={16} /></Link><div className="marketing-demo-controls"><button aria-label="Fonction précédente" onClick={() => setActive(demos[(demos.findIndex((demo) => demo.key === active) + demos.length - 1) % demos.length].key)}>←</button><button aria-label="Fonction suivante" onClick={() => setActive(demos[(demos.findIndex((demo) => demo.key === active) + 1) % demos.length].key)}>→</button></div></div><ProductWindow active={active} /></div>
      </div>
    </section>
  );
}

function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);
  return <section className="marketing-section marketing-faq" id="faq"><div className="marketing-container marketing-faq-layout"><div><span className="marketing-kicker">QUESTIONS FRÉQUENTES</span><h2>Vous voulez en savoir plus ?</h2><p>Les réponses essentielles avant de commencer.</p><Link to="/contact" className="marketing-text-link">Une autre question ? Contactez-nous <ArrowRight size={16} /></Link></div><div className="marketing-faq-list">{faqs.map((faq, index) => <article className={open === index ? 'marketing-faq-item is-open' : 'marketing-faq-item'} key={faq.q}><button type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? null : index)}><span>{faq.q}</span><span className="marketing-faq-toggle">{open === index ? <X size={15} /> : <ChevronDown size={16} />}</span></button>{open === index && <p>{faq.a}</p>}</article>)}</div></div></section>;
}

export default function HomePage() {
  return (
    <>
      <Helmet>
        <title>Velatra — Le logiciel de coaching sportif tout-en-un</title>
        <meta name="description" content="Centralisez vos adhérents, programmes sportifs, suivi, planning et outils de gestion dans Velatra, la plateforme pensée pour les coachs sportifs." />
        <meta property="og:title" content="Velatra — Gérez votre coaching. Pas votre administratif." />
        <meta property="og:description" content="Clients, programmes, planning et suivi : réunissez votre activité de coaching dans Velatra." />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="marketing-home">
        <section className="marketing-hero">
          <div className="marketing-hero-grid" aria-hidden="true" />
          <div className="marketing-container marketing-hero-copy">
            <span className="marketing-kicker"><span className="marketing-kicker-dot" /> LA PLATEFORME DES COACHS SPORTIFS</span>
            <h1>Gérez votre coaching.<br /><span>Pas votre administratif.</span></h1>
            <p className="marketing-hero-subtitle">Vos adhérents, leurs programmes et votre activité. Au même endroit, pour vous laisser vous concentrer sur l’essentiel : coacher.</p>
            <div className="marketing-hero-actions"><Link to="/register" className="marketing-button marketing-button-primary">Essayer Velatra gratuitement <ArrowRight size={17} /></Link><a href="#demo" className="marketing-button marketing-button-secondary"><Play size={15} fill="currentColor" /> Voir le produit</a></div>
            <div className="marketing-hero-reassurance"><span><Check size={14} /> Espace coach et adhérent</span><span><Check size={14} /> Programmes et suivi</span><span><Check size={14} /> Gestion centralisée</span></div>
          </div>
          <div className="marketing-container marketing-hero-product"><ProductWindow active="clients" /><div className="marketing-float-chip marketing-float-chip-left"><span><Dumbbell size={17} /></span><div><b>Programmes</b><small>Prêts à partager</small></div></div><div className="marketing-float-chip marketing-float-chip-right"><span><Activity size={17} /></span><div><b>Suivi adhérent</b><small>Dans son espace</small></div></div></div>
          <div className="marketing-container marketing-hero-scroll"><span>FAIT POUR ACCOMPAGNER LES COACHS AU QUOTIDIEN</span><span className="marketing-scroll-line" /></div>
        </section>

        <section className="marketing-capabilities" aria-label="Les principaux outils Velatra"><div className="marketing-container"><span>UNE SEULE PLATEFORME POUR</span><div><b>Vos adhérents</b><i /> <b>Vos programmes</b><i /> <b>Votre planning</b><i /> <b>Votre suivi</b><i /> <b>Votre activité</b></div></div></section>

        <section className="marketing-section marketing-problem" id="produit"><div className="marketing-container"><div className="marketing-section-heading"><span className="marketing-kicker">QUAND TOUT EST ÉPARPILLÉ</span><h2>Le coaching est votre métier.<br /><em>Le tableur ne devrait pas l’être.</em></h2><p>Les informations dans un fichier. Les séances dans un autre. Les échanges ailleurs. Velatra rassemble vos outils de coaching et de gestion dans un espace unique.</p></div><div className="marketing-converge"><div className="marketing-tools" aria-label="Outils souvent dispersés"><span className="marketing-tool"><i>W</i> Messages</span><span className="marketing-tool"><i>▤</i> Tableurs</span><span className="marketing-tool"><i>▧</i> PDF</span><span className="marketing-tool"><i>◷</i> Calendrier</span><span className="marketing-tool"><i>✎</i> Notes</span></div><div className="marketing-converge-mark"><span>V</span><b>VELATRA</b><small>VOTRE ESPACE COACHING</small></div><div className="marketing-outputs"><span><Users size={16} /> Adhérents</span><span><Dumbbell size={16} /> Programmes</span><span><CalendarDays size={16} /> Planning</span><span><Activity size={16} /> Suivi</span></div><p className="marketing-converge-caption">Réunissez vos outils pour garder le fil de votre accompagnement.</p></div></div></section>

        <DemoSection />

        <section className="marketing-section marketing-benefits" id="fonctionnalites"><div className="marketing-container"><div className="marketing-section-heading marketing-section-heading-split"><div><span className="marketing-kicker">DU QUOTIDIEN AU DÉVELOPPEMENT</span><h2>Moins de gestion.<br /><em>Plus de coaching.</em></h2></div><p>Des outils qui suivent votre façon de travailler, que vous accompagniez quelques adhérents ou organisiez l’activité d’un studio.</p></div><div className="marketing-benefit-grid"><article className="marketing-benefit-card marketing-benefit-dark"><span className="marketing-benefit-number">01 — ACCOMPAGNER</span><div className="marketing-benefit-icon"><Users size={19} /></div><h3>Chaque adhérent<br />a son espace.</h3><p>Partagez les programmes et suivez l’activité de vos adhérents dans un espace dédié.</p><Link to="/fonctionnalites" aria-label="Découvrir le suivi des adhérents"><MoveUpRight size={19} /></Link><div className="marketing-benefit-orbit" /></article><article className="marketing-benefit-card"><span className="marketing-benefit-number">02 — ORGANISER</span><div className="marketing-benefit-icon"><ClipboardList size={19} /></div><h3>Votre coaching,<br />mieux structuré.</h3><p>Préparez les séances, les programmes sportifs et le suivi nutritionnel dans Velatra.</p><Link to="/fonctionnalites" aria-label="Découvrir les outils de coaching"><MoveUpRight size={19} /></Link><div className="marketing-benefit-lines" /></article><article className="marketing-benefit-card"><span className="marketing-benefit-number">03 — PILOTER</span><div className="marketing-benefit-icon"><Activity size={19} /></div><h3>Une vue claire<br />sur votre activité.</h3><p>Gardez vos prospects, votre planning et les informations de gestion au même endroit.</p><Link to="/solutions" aria-label="Découvrir les solutions Velatra"><MoveUpRight size={19} /></Link><div className="marketing-benefit-chart"><i /><i /><i /><i /><i /><i /><i /></div></article></div></div></section>

        <section className="marketing-section marketing-crm"><div className="marketing-container marketing-crm-layout"><div className="marketing-crm-copy"><span className="marketing-kicker">DU PREMIER ÉCHANGE AU SUIVI</span><h2>Gardez le lien.<br /><em>À chaque étape.</em></h2><p>Le suivi d’un prospect commence avant son inscription. Organisez les étapes de prise de contact, puis retrouvez vos adhérents et leur accompagnement dans Velatra.</p><Link to="/solutions" className="marketing-button marketing-button-primary">Découvrir les solutions <ArrowRight size={16} /></Link></div><div className="marketing-pipeline" aria-label="Exemple de parcours de prospect"><div className="marketing-pipeline-top"><span>UN PARCOURS PLUS LISIBLE</span><span>VOTRE PIPELINE <ArrowUpRight size={13} /></span></div><div className="marketing-pipeline-stage"><span className="marketing-stage-index">01</span><div><b>Nouveau contact</b><small>Le prospect entre dans votre suivi</small></div><ArrowDownRight size={16} /></div><div className="marketing-pipeline-stage"><span className="marketing-stage-index">02</span><div><b>Prise de contact</b><small>Vous planifiez la prochaine étape</small></div><ArrowDownRight size={16} /></div><div className="marketing-pipeline-stage"><span className="marketing-stage-index">03</span><div><b>Rendez-vous</b><small>Vous échangez sur ses objectifs</small></div><ArrowDownRight size={16} /></div><div className="marketing-pipeline-stage is-last"><span className="marketing-stage-index">04</span><div><b>Adhérent</b><small>Le suivi se poursuit dans son espace</small></div><Check size={16} /></div><div className="marketing-pipeline-rail" /></div></div></section>

        <section className="marketing-section marketing-member"><div className="marketing-container marketing-member-layout"><div className="marketing-phone-scene"><div className="marketing-phone-glow" /><div className="marketing-phone"><div className="marketing-phone-notch" /><div className="marketing-phone-head"><span>VELATRA</span><span className="marketing-phone-user">LM</span></div><div className="marketing-phone-greeting"><small>ESPACE ADHÉRENT</small><h3>Bonjour Lucie</h3><p>Prête pour votre prochaine séance ?</p></div><div className="marketing-phone-session"><span>VOTRE PROGRAMME</span><b>Force & mobilité</b><small>3 séances · Cette semaine</small><div className="marketing-phone-progress"><i /></div><em>Progression du programme</em></div><div className="marketing-phone-workout"><span><Dumbbell size={15} /></span><div><b>Séance du jour</b><small>Haut du corps · 45 min</small></div><ArrowRight size={15} /></div><div className="marketing-phone-nav"><span>⌂<small>Accueil</small></span><span>▤<small>Programme</small></span><span>◉<small>Suivi</small></span><span>☺<small>Profil</small></span></div></div><span className="marketing-phone-caption">APERÇU DE L’ESPACE ADHÉRENT</span></div><div className="marketing-member-copy"><span className="marketing-kicker">AUSSI POUR VOS ADHÉRENTS</span><h2>Un accompagnement qui se poursuit <em>entre les séances.</em></h2><p>Vos adhérents accèdent à leur espace pour retrouver les programmes, les séances et les informations de suivi partagées par leur coach.</p><ul><li><Check size={15} /> Programmes sportifs et séances</li><li><Check size={15} /> Suivi au fil de l’accompagnement</li><li><Check size={15} /> Une expérience adaptée au mobile</li></ul><Link to="/fonctionnalites" className="marketing-text-link">Découvrir l’espace adhérent <ArrowRight size={16} /></Link></div></div></section>

        <section className="marketing-section marketing-audience" id="clients"><div className="marketing-container"><div className="marketing-section-heading"><span className="marketing-kicker">UNE PLATEFORME, PLUSIEURS FAÇONS DE COACHER</span><h2>À votre échelle.<br /><em>À votre façon.</em></h2></div><div className="marketing-audience-grid"><Link to="/logiciel-coach-sportif" className="marketing-audience-card"><span>01</span><Dumbbell size={20} /><b>Coach indépendant</b><small>Gérez les adhérents, les programmes et les séances depuis un seul espace.</small><ArrowUpRight size={16} /></Link><Link to="/logiciel-personal-trainer" className="marketing-audience-card"><span>02</span><Activity size={20} /><b>Personal trainer</b><small>Structurez le suivi individuel et retrouvez l’historique utile à chaque adhérent.</small><ArrowUpRight size={16} /></Link><Link to="/logiciel-studio-coaching" className="marketing-audience-card"><span>03</span><Users size={20} /><b>Studio de coaching</b><small>Réunissez votre planning, votre équipe et vos outils d’accompagnement.</small><ArrowUpRight size={16} /></Link></div></div></section>

        <section className="marketing-final-cta"><div className="marketing-container marketing-final-inner"><span className="marketing-kicker"><Sparkles size={14} /> À VOUS DE JOUER</span><h2>Vous avez choisi d’être coach.<br /><em>Faites-en votre priorité.</em></h2><p>Découvrez comment Velatra peut accompagner votre activité au quotidien.</p><div className="marketing-hero-actions"><Link to="/register" className="marketing-button marketing-button-primary">Essayer Velatra gratuitement <ArrowRight size={17} /></Link><Link to="/contact" className="marketing-button marketing-button-ghost">Demander une démonstration <ArrowUpRight size={16} /></Link></div><span className="marketing-final-note">Vous pouvez aussi <Link to="/tarifs">consulter les tarifs</Link> ou <Link to="/contact">nous contacter</Link>.</span></div><div className="marketing-final-decoration" aria-hidden="true">V</div></section>

        <FAQSection />
        <section className="marketing-resources"><div className="marketing-container"><div><span className="marketing-kicker">POUR ALLER PLUS LOIN</span><h2>Des idées pour faire grandir votre activité.</h2></div><div className="marketing-resource-links"><Link to="/blog">Lire le blog <ArrowRight size={15} /></Link><Link to="/centre-d-aide">Centre d’aide <ArrowRight size={15} /></Link><Link to="/contact">Parler à l’équipe <ArrowRight size={15} /></Link></div></div></section>
      </div>
    </>
  );
}

export { HomePage };
