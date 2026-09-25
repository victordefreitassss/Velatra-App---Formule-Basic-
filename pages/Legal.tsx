import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const LegalPageShell = ({ title, description, children }: { title: string; description: string; children: React.ReactNode }) => <>
  <Helmet>
    <title>{title} | Velatra</title>
    <meta name="description" content={description} />
  </Helmet>
  <main className="marketing-legal"><div className="marketing-container"><span className="marketing-kicker">INFORMATIONS VELATRA</span><h1>{title}</h1><p className="marketing-legal-intro">{description}</p><div className="marketing-legal-copy">{children}</div><Link className="marketing-text-link" to="/contact">Contacter Velatra <span aria-hidden="true">→</span></Link></div></main>
</>;

export const MentionsLegales: React.FC = () => <LegalPageShell title="Mentions légales" description="Informations sur l’éditeur et l’hébergement du site Velatra.">
  <h2>Éditeur</h2>
  <p>La raison sociale, la forme juridique, l’adresse du siège et les informations d’immatriculation de l’éditeur doivent être confirmées et complétées par Velatra avant la commercialisation du service.</p>
  <p>Pour toute question concernant ce site, vous pouvez contacter Velatra à l’adresse <a href="mailto:support@velatra.app">support@velatra.app</a>.</p>
  <h2>Hébergement et services techniques</h2>
  <p>Le site est déployé sur Vercel. L’application utilise des services Firebase et Google Cloud. Les prestataires et les coordonnées juridiques définitives doivent être confirmés dans les informations contractuelles de Velatra.</p>
</LegalPageShell>;

export const CGV: React.FC = () => <LegalPageShell title="Conditions de vente" description="Informations relatives aux offres et à la souscription Velatra.">
  <h2>Offres</h2>
  <p>Les offres et tarifs actuellement affichés sont présentés sur la page <Link to="/tarifs">Tarifs</Link>. Les modalités complètes de souscription, de facturation, de renouvellement, de résiliation et d’essai doivent être confirmées par l’éditeur avant toute souscription payante.</p>
  <h2>Avant toute souscription</h2>
  <p>Les présentes informations ne remplacent pas des conditions contractuelles complètes. L’éditeur doit renseigner et valider les conditions applicables au service avant d’ouvrir la souscription commerciale.</p>
</LegalPageShell>;

export const Confidentialite: React.FC = () => <LegalPageShell title="Confidentialité" description="Informations relatives aux données traitées par Velatra.">
  <h2>Traitements réalisés par le service</h2>
  <p>Velatra peut traiter les informations de compte, les données de coaching et les contenus renseignés par les utilisateurs dans leur espace. L’application se connecte à Firebase et peut utiliser Gemini ainsi que Stripe selon les fonctionnalités activées.</p>
  <h2>Informations à préciser</h2>
  <p>Les coordonnées du responsable de traitement, les finalités et bases légales, les durées de conservation, les destinataires, les transferts éventuels et les modalités d’exercice des droits doivent être documentés et confirmés par l’éditeur avant la mise en service commerciale.</p>
  <p>Pour une question sur vos données, vous pouvez écrire à <a href="mailto:support@velatra.app">support@velatra.app</a>.</p>
</LegalPageShell>;
