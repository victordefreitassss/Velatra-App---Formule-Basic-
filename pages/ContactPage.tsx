import { useEffect, useState, FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mail, Send, CheckCircle } from 'lucide-react';
import { PublicMeta } from '../components/PublicProduct';

const requests: Record<string, { title: string; subject: string; text: string }> = {
  'coach-beta': { title: 'Préparons votre accès bêta.', subject: 'Accès bêta — Velatra Coach', text: 'Présentez-nous votre activité et ce que vous souhaitez organiser. L’accès à la bêta se fait sur invitation.' },
  'studio-demo': { title: 'Découvrons votre structure.', subject: 'Démonstration — Velatra Studio', text: 'Parlez-nous de votre équipe et de vos besoins. Nous préparerons une démonstration des outils disponibles pour votre structure.' },
  programming: { title: 'Parlons de votre programmation.', subject: 'Programmation sur mesure', text: 'Précisez le type de programmes et le niveau d’accompagnement souhaités. Nous définirons ensemble le périmètre et le tarif.' },
};

export default function ContactPage() {
  const [params] = useSearchParams();
  const request = requests[params.get('request') || ''];
  const [formData, setFormData] = useState({ name: '', email: '', subject: request?.subject || '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setFormData(previous => ({ ...previous, subject: request?.subject || '' })); setSubmitted(false); }, [request?.subject]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending) return;
    setSending(true); setError('');
    try {
      const response = await fetch('/api/public/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Le message n’a pas pu être envoyé. Réessayez ou contactez-nous par e-mail.');
      setSubmitted(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'L’envoi a échoué. Veuillez réessayer.'); }
    finally { setSending(false); }
  };

  return <div className="vp-page"><PublicMeta path="/contact" title="Contacter Velatra — Accès bêta, démo et accompagnement" description="Demandez votre accès bêta Velatra Coach, une démonstration Studio ou un accompagnement en programmation sur mesure." /><header className="vp-hero marketing-container"><span className="marketing-kicker">CONTACT VELATRA</span><h1>{request?.title || 'Parlons de votre activité.'}</h1><p>{request?.text || 'Une question sur la plateforme ou envie de découvrir Velatra ? Écrivez-nous pour préparer la suite.'}</p></header><div className="marketing-container vp-contact"><aside><div className="vp-panel"><Mail size={25} /><h2>Un échange pour avancer.</h2><p>Expliquez-nous votre façon de coacher, votre organisation et ce que vous cherchez à simplifier.</p><a className="marketing-text-link" href="mailto:support@velatra.app">support@velatra.app</a></div><p className="vp-note">Ces informations servent à répondre à votre demande. <a href="/confidentialite">Consulter la politique de confidentialité.</a></p></aside><div className="vp-panel">{submitted ? <div className="vp-form-success" role="status"><CheckCircle size={36} /><h2>Votre message est envoyé.</h2><p>Merci de nous avoir présenté votre besoin. Nous vous répondrons à l’adresse e-mail indiquée.</p><button className="marketing-button marketing-button-secondary" onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', subject: request?.subject || '', message: '' }); }}>Écrire un autre message</button></div> : <form className="vp-form" onSubmit={handleSubmit} aria-busy={sending}><div className="vp-two-col"><div><label htmlFor="contact-name">Votre nom</label><input id="contact-name" name="name" autoComplete="name" required maxLength={100} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Jean Dupont" /></div><div><label htmlFor="contact-email">Adresse e-mail</label><input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={254} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="vous@exemple.fr" /></div></div><div><label htmlFor="contact-subject">Sujet</label><input id="contact-subject" name="subject" required maxLength={120} value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} placeholder="Votre demande" /></div><div><label htmlFor="contact-message">Votre message</label><textarea id="contact-message" name="message" required maxLength={5000} rows={6} value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} placeholder="Parlez-nous de votre activité et de vos besoins." /></div>{error && <p role="alert" className="vp-form-error">{error}</p>}<button type="submit" disabled={sending} className="marketing-button marketing-button-primary">{sending ? 'Envoi en cours…' : 'Envoyer ma demande'}<Send size={17} /></button></form>}</div></div></div>;
}
export { ContactPage };
