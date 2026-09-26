import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PublicMeta } from '../components/PublicProduct';

const questions = [
  { category: 'Accès', q: 'Comment rejoindre Velatra ?', a: 'La bêta est accessible sur invitation. Demandez un accès Coach ou une démonstration Studio depuis le formulaire de contact. Une invitation est nécessaire pour créer votre espace.' },
  { category: 'Adhérents', q: 'Comment organiser mes clients ?', a: 'La rubrique Adhérents rassemble les profils de vos clients. Vous pouvez y ajouter un adhérent et retrouver ses programmes et informations de suivi. Dans une structure, le responsable peut attribuer chaque adhérent à un coach.' },
  { category: 'Programmes', q: 'Puis-je créer mes programmes manuellement ?', a: 'Oui. Vous pouvez composer les séances, choisir les exercices et ajuster les séries, répétitions et consignes. Les programmes partagés sont accessibles depuis l’espace adhérent.' },
  { category: 'IA', q: 'Qui valide les programmes préparés avec l’IA ?', a: 'Le coach reste responsable du programme. L’IA propose une base de travail à relire et adapter dans l’éditeur. L’assistant conversationnel ne modifie pas seul les programmes.' },
  { category: 'Paiements', q: 'Comment utiliser Stripe ?', a: 'La connexion Stripe se configure depuis les paramètres de votre activité. Un compte Stripe configuré est nécessaire pour utiliser les fonctions de paiement en ligne. Le suivi financier est disponible dans la rubrique Finances.' },
  { category: 'Planning', q: 'Où retrouver mes rendez-vous ?', a: 'Le planning regroupe les rendez-vous et réservations. Vous pouvez y consulter les séances prévues et organiser les créneaux proposés dans votre espace.' },
  { category: 'Équipe', q: 'Comment ajouter des coachs à mon studio ?', a: 'Les comptes équipe sont disponibles lorsque cette option a été activée pour votre structure. Pendant la bêta, contactez Velatra pour la mise en place. Le responsable gère ensuite les coachs et l’attribution des adhérents.' },
  { category: 'Mobile', q: 'Puis-je utiliser Velatra sur mon téléphone ?', a: 'Oui. Velatra est une application web responsive accessible depuis le navigateur d’un ordinateur, d’une tablette ou d’un téléphone. Les adhérents y retrouvent leur propre espace de suivi.' },
  { category: 'CRM', q: 'Les relances sont-elles envoyées automatiquement ?', a: 'Le CRM permet d’organiser les prospects, de conserver des notes et de programmer des rappels de relance. La prise de contact reste à effectuer par le coach ; Velatra ne promet pas de campagne commerciale automatique.' },
];
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');

export default function HelpCenterPage() {
  const [query, setQuery] = useState('');
  const results = questions.filter(item => normalize(`${item.category} ${item.q} ${item.a}`).includes(normalize(query.trim())));
  return <div className="vp-page"><PublicMeta path="/centre-d-aide" title="Centre d’aide Velatra — Accès, programmes et suivi" description="Les réponses essentielles pour utiliser Velatra : accès bêta, adhérents, programmation, IA, Stripe, planning et comptes coachs." /><header className="vp-hero marketing-container"><span className="marketing-kicker">CENTRE D’AIDE</span><h1>Un repère pour<br /><em>chaque question.</em></h1><p>Retrouvez les réponses essentielles sur les outils et les accès Velatra.</p><div className="vp-help-search vp-form"><label htmlFor="help-search">Rechercher dans les réponses</label><input id="help-search" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Programmes, Stripe, équipe…" /></div></header><div className="marketing-container vp-help-content"><p className="vp-note" role="status">{results.length} réponse{results.length > 1 ? 's' : ''}{query ? ' pour votre recherche' : ' disponible' + (results.length > 1 ? 's' : '')}</p><div className="vp-faq">{results.map(item => <details key={item.q}><summary><span className="vp-help-category">{item.category}</span>{item.q}</summary><p>{item.a}</p></details>)}</div>{results.length === 0 && <p>Aucune réponse trouvée. Essayez un autre mot ou contactez-nous.</p>}<div className="vp-closing"><div><h2>Votre question reste ouverte ?</h2><p>Présentez-nous votre besoin pour que nous puissions vous aider.</p></div><Link className="marketing-button marketing-button-primary" to="/contact">Contacter Velatra<ArrowRight size={17} /></Link></div></div></div>;
}
export { HelpCenterPage };
