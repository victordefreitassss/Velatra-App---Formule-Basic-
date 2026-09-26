import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LandingLayout from './components/LandingLayout';

const lazyNamed = <T extends object>(load: () => Promise<T>, exportName: keyof T) => React.lazy(async () => ({ default: (await load())[exportName] as React.ComponentType<any> }));

const HomePage = React.lazy(() => import('./pages/HomePage'));
const FeaturesPage = React.lazy(() => import('./pages/FeaturesPage'));
const SolutionDetailPage = React.lazy(() => import('./pages/SolutionDetailPage'));
const PricingPage = React.lazy(() => import('./pages/PricingPage'));
const AboutPage = React.lazy(() => import('./pages/AboutPageMarketing'));
const SolutionsPage = React.lazy(() => import('./pages/UseCases'));
const HelpCenterPage = React.lazy(() => import('./pages/HelpCenter'));
const BlogPage = React.lazy(() => import('./pages/Blog'));
const BlogPostPage = React.lazy(() => import('./pages/BlogPost'));
const ContactPage = React.lazy(() => import('./pages/ContactPage'));
const SeoLandingPage = React.lazy(() => import('./pages/SeoLandingPage'));
const MentionsLegales = lazyNamed(() => import('./pages/Legal'), 'MentionsLegales');
const CGV = lazyNamed(() => import('./pages/Legal'), 'CGV');
const Confidentialite = lazyNamed(() => import('./pages/Legal'), 'Confidentialite');

export default function MarketingSite() {
  return <Routes>
    <Route element={<LandingLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/produit" element={<FeaturesPage />} />
      <Route path="/fonctionnalites" element={<Navigate to="/produit" replace />} />
      <Route path="/tarifs" element={<PricingPage />} />
      <Route path="/solutions" element={<SolutionsPage />} />
      <Route path="/solutions/coach-sportif" element={<SolutionDetailPage />} />
      <Route path="/solutions/studio" element={<SolutionDetailPage />} />
      <Route path="/centre-d-aide" element={<HelpCenterPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />
      <Route path="/a-propos" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/mentions-legales" element={<MentionsLegales />} />
      <Route path="/cgv" element={<CGV />} />
      <Route path="/confidentialite" element={<Confidentialite />} />
      <Route path="/logiciel-coach-sportif" element={<SeoLandingPage />} />
      <Route path="/logiciel-personal-trainer" element={<SeoLandingPage />} />
      <Route path="/logiciel-studio-coaching" element={<SeoLandingPage />} />
      <Route path="/crm-coach-sportif" element={<SeoLandingPage />} />
      <Route path="/logiciel-suivi-client-coach" element={<SeoLandingPage />} />
      <Route path="/logiciel-programme-entrainement" element={<SeoLandingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>;
}
