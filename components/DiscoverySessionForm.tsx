import React, { useState } from 'react';
import { Card, Button, Input } from './UI';
import { db, setDoc, doc } from '../firebase';
import { ShieldAlert, CalendarClock, User, Mail, Phone, Heart, Calendar } from 'lucide-react';

interface DiscoverySessionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const DiscoverySessionForm: React.FC<DiscoverySessionFormProps> = ({
  onSuccess,
  onCancel
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("18:00");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !date) return;

    setLoading(true);
    setError("");

    try {
      const prospectId = `prospect_${Date.now()}`;
      
      const newProspect = {
        id: prospectId,
        clubId: "velatra_default_club",
        name,
        email,
        phone,
        preferredDate: date,
        preferredSlot: slot,
        goal,
        source: "trial_form",
        status: "contacted", // contacted, qualified, trial_done, joined
        converted: false,
        notes: `Créneaux souhaité: ${date} ${slot} • Objectif : ${goal}`,
        createdAt: new Date().toLocaleDateString()
      };

      await setDoc(doc(db, "prospects", prospectId), newProspect);
      onSuccess();
    } catch (e: any) {
      console.error(e);
      setError("Une erreur est survenue lors de l'envoi de votre demande.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md p-6 bg-zinc-950/80 border border-zinc-900 mx-auto select-none">
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div className="text-center pb-2">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center justify-center gap-2">
            <CalendarClock className="w-5 h-5 text-emerald-400" />
            Réserver un essai gratuit
          </h2>
          <p className="text-xs text-zinc-500 mt-1">Venez tester nos installations et programmer un bilan physique offert.</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 text-rose-400 border border-rose-500/15 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="leading-normal">{error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Nom Complet</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-650">
              <User className="w-4 h-4" />
            </span>
            <Input 
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Élie Martin"
              className="pl-10"
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Adresse Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-650">
                <Mail className="w-4 h-4" />
              </span>
              <Input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex. elie@martin.me"
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Numéro de Téléphone</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-650">
                <Phone className="w-4 h-4" />
              </span>
              <Input 
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex. 06 12 34 56 78"
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Date d'essai souhaitée</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-650">
                <Calendar className="w-4 h-4" />
              </span>
              <Input 
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="pl-10 text-xs"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Créneau Horaire</label>
            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              className="w-full h-11 px-4 text-xs rounded-xl border border-zinc-850 bg-zinc-950 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              disabled={loading}
            >
              <option value="09:00">09:00 - Matin</option>
              <option value="12:00">12:00 - Midi</option>
              <option value="14:00">14:00 - Après-midi</option>
              <option value="18:00">18:00 - Soir</option>
              <option value="20:00">20:00 - Fin de journée</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Objectif principal / Message</label>
          <div className="relative">
            <span className="absolute top-3 left-3 text-zinc-650">
              <Heart className="w-4 h-4" />
            </span>
            <input 
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Ex. Perdre 5kg, préparer un marathon..."
              className="w-full h-11 pl-10 pr-4 text-xs rounded-xl border border-zinc-850 bg-zinc-950/60 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              disabled={loading}
            />
          </div>
        </div>

        <div className="pt-4 flex flex-col gap-2">
          <Button 
            type="submit" 
            disabled={loading || !name || !email || !date}
            fullWidth
          >
            {loading ? "ENVOI DE LA DEMANDE..." : "PLANIFIER L'ESSAI"}
          </Button>

          <Button 
            variant="ghost" 
            fullWidth 
            onClick={onCancel}
            disabled={loading}
          >
            Annuler
          </Button>
        </div>
      </form>
    </Card>
  );
};
