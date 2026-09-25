import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Mail, Send } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Le message n'a pas pu être envoyé.");
      setSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err: any) {
      setError(err.message || "Le message n'a pas pu être envoyé.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
    <Helmet>
      <title>Contacter Velatra — Demander une présentation</title>
      <meta name="description" content="Une question sur Velatra ou envie de découvrir la plateforme ? Contactez-nous pour parler de votre activité de coaching." />
      <link rel="canonical" href={`${window.location.origin}/contact`} />
    </Helmet>
    <div className="pt-32 pb-24">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center space-y-4 mb-16">
          <span className="text-xs font-black uppercase text-emerald-500 tracking-widest block font-bold">CONTACT VELATRA</span>
          <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight text-zinc-950 dark:text-white leading-none">
            Nous sommes à votre écoute
          </h1>
          <p className="text-zinc-550 dark:text-zinc-400 max-w-xl mx-auto text-sm leading-relaxed">
            Une question sur Velatra ou envie de découvrir l’application ? Écrivez-nous, nous serons ravis d’en savoir plus sur votre activité.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start mt-12">
          {/* Contact details */}
          <div className="md:col-span-5 space-y-8">
            <div className="p-8 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl space-y-6">
              <h3 className="text-lg font-bold text-zinc-950 dark:text-white pb-3 border-b border-zinc-100 dark:border-zinc-850">Échanger avec Velatra</h3>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-zinc-455 dark:text-zinc-500 uppercase block font-black">Adresse e-mail</span>
                    <a href="mailto:support@velatra.app" className="text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:text-emerald-500 transition-colors">support@velatra.app</a>
                  </div>
                </div>

              </div>
            </div>

            <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl text-xs text-emerald-700 dark:text-emerald-400 font-medium leading-relaxed">
              Décrivez votre besoin dans le formulaire. Votre message sera transmis à l’équipe Velatra.
            </div>
          </div>

          {/* Contact form */}
          <div className="md:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 p-8 md:p-10 rounded-[32px] shadow-lg relative">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-550 dark:text-zinc-400">Nom</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 text-xs md:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Jean Dupont"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-550 dark:text-zinc-400">Adresse e-mail</label>
                  <input
                    type="email"
                    required
                    maxLength={254}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 text-xs md:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="vous@exemple.fr"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-550 dark:text-zinc-400">Sujet</label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-3 text-xs md:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Question, démonstration, partenariat…"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-550 dark:text-zinc-400">Message</label>
                <textarea
                  required
                  maxLength={5000}
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 text-xs md:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Parlez-nous de votre activité et de votre besoin."
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs md:text-sm shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                {sending ? 'Envoi…' : 'Envoyer'} <Send className="w-4 h-4" />
              </button>
            </form>

            {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}

            {submitted && (
              <div className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-[32px] flex flex-col items-center justify-center p-6 text-center">
                <span className="text-4xl">✉️</span>
                <h4 className="text-base font-bold text-zinc-950 dark:text-white mt-3">Message Reçu !</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">Votre message a bien été transmis. Merci de nous avoir contactés.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
export { ContactPage };
