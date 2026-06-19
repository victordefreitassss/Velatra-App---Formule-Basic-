import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 3000);
  };

  return (
    <div className="pt-32 pb-24">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center space-y-4 mb-16">
          <span className="text-xs font-black uppercase text-emerald-500 tracking-widest block font-bold">CONTACTEZ NOS EXPERTS</span>
          <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight text-zinc-950 dark:text-white leading-none">
            Nous sommes à votre écoute
          </h1>
          <p className="text-zinc-550 dark:text-zinc-400 max-w-xl mx-auto text-sm leading-relaxed">
            Une question technique, une demande de démonstration personnalisée ou besoin d'un forfait sur-mesure pour votre club ? Envoyez-nous un message.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start mt-12">
          {/* Contact details */}
          <div className="md:col-span-5 space-y-8">
            <div className="p-8 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl space-y-6">
              <h3 className="text-lg font-bold text-zinc-950 dark:text-white pb-3 border-b border-zinc-100 dark:border-zinc-850">Nos Coordonnées</h3>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-zinc-455 dark:text-zinc-500 uppercase block font-black">Email commercial</span>
                    <a href="mailto:support@velatra.app" className="text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:text-emerald-500 transition-colors">support@velatra.app</a>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-zinc-455 dark:text-zinc-500 uppercase block font-black">Support prioritaire</span>
                    <a href="tel:+33184605920" className="text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:text-emerald-500 transition-colors">+33 1 84 60 59 20</a>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-zinc-455 dark:text-zinc-500 uppercase block font-black">Bureaux</span>
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Paris & Lyon, France</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl text-xs text-emerald-600 dark:text-emerald-400 font-medium leading-relaxed">
              🕒 Notre équipe d'assistance technique est active de 8h à 20h, 7j/7 pour vous garantir une prise en main d'élite de votre plateforme.
            </div>
          </div>

          {/* Contact form */}
          <div className="md:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 p-8 md:p-10 rounded-[32px] shadow-lg relative">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-550 dark:text-zinc-400">Nom Complet</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 text-xs md:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Jean Dupont"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-550 dark:text-zinc-400">Email Professionnel</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 text-xs md:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="jean@monclub.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-550 dark:text-zinc-400">Sujet de votre message</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-3 text-xs md:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Demande de partenariat / Devis Studio"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-550 dark:text-zinc-400">Message</label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 text-xs md:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Expliquez-nous brièvement votre projet sportif..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs md:text-sm shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                Envoyer <Send className="w-4 h-4" />
              </button>
            </form>

            {submitted && (
              <div className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-[32px] flex flex-col items-center justify-center p-6 text-center">
                <span className="text-4xl">✉️</span>
                <h4 className="text-base font-bold text-zinc-950 dark:text-white mt-3">Message Reçu !</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">Nous avons transmis votre message à notre service client. Une réponse vous sera apportée sous 12 heures ouvrées.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export { ContactPage };
