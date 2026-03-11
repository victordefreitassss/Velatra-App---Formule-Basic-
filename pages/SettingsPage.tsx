import React, { useState } from 'react';
import { AppState } from '../types';
import { Card, Button, Input } from '../components/UI';
import { SettingsIcon, SaveIcon } from '../components/Icons';
import { db, doc, updateDoc } from '../firebase';

export const SettingsPage: React.FC<{ state: AppState, setState: any, showToast: any }> = ({ state, setState, showToast }) => {
  const [defaultDuration, setDefaultDuration] = useState(state.currentClub?.settings?.defaultProgramDuration || 7);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!state.user?.clubId) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "clubs", state.user.clubId), {
        "settings.defaultProgramDuration": defaultDuration
      });
      showToast("Paramètres enregistrés avec succès !");
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'enregistrement", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 page-transition pb-20">
      <div className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-white leading-none">Paramètres</h1>
          <p className="text-[10px] text-velatra-textDark font-bold uppercase tracking-[3px] mt-2">Configuration du club</p>
        </div>
      </div>

      <Card className="p-8 border-white/5 bg-[#0a0a0a]">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-velatra-accent/10 rounded-2xl text-velatra-accent">
            <SettingsIcon size={24} />
          </div>
          <h2 className="text-xl font-black uppercase">Informations du Club</h2>
        </div>

        <div className="space-y-6 max-w-md">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-velatra-textDark tracking-widest ml-1">
              Code d'accès du club
            </label>
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center">
              <span className="text-xl font-black tracking-widest text-white">{state.currentClub?.id}</span>
              <Button 
                variant="secondary" 
                className="!py-2 !px-4 !text-[10px]"
                onClick={() => {
                  navigator.clipboard.writeText(state.currentClub?.id || "");
                  showToast("Code copié !");
                }}
              >
                COPIER
              </Button>
            </div>
            <p className="text-xs text-velatra-textDark mt-1">
              Partagez ce code avec vos membres pour qu'ils puissent rejoindre votre club lors de leur inscription.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-8 border-white/5 bg-[#0a0a0a]">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-velatra-accent/10 rounded-2xl text-velatra-accent">
            <SettingsIcon size={24} />
          </div>
          <h2 className="text-xl font-black uppercase">Programmation</h2>
        </div>

        <div className="space-y-6 max-w-md">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-velatra-textDark tracking-widest ml-1">
              Durée par défaut d'un programme (semaines)
            </label>
            <Input 
              type="number" 
              min={1} 
              max={52} 
              value={defaultDuration} 
              onChange={(e) => setDefaultDuration(parseInt(e.target.value) || 7)} 
            />
            <p className="text-xs text-velatra-textDark mt-1">
              Cette durée sera utilisée par défaut lors de la création d'un nouveau programme.
            </p>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full !py-4">
            <SaveIcon size={18} className="mr-2" />
            {isSaving ? "ENREGISTREMENT..." : "ENREGISTRER LES PARAMÈTRES"}
          </Button>
        </div>
      </Card>
    </div>
  );
};
