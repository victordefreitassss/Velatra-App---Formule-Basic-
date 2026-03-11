import React, { useState } from 'react';
import { AppState, User } from '../types';
import { Card, Button, Input, Badge } from '../components/UI';
import { GiftIcon, SearchIcon, PlusIcon, MinusIcon } from '../components/Icons';
import { db, doc, updateDoc } from '../firebase';

export const LoyaltyPage: React.FC<{ state: AppState, setState: any, showToast: any }> = ({ state, setState, showToast }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [pointsToAdd, setPointsToAdd] = useState<number>(0);

  const members = state.users.filter(u => u.role === 'member' && u.clubId === state.user?.clubId);
  
  const filteredMembers = members
    .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => (b.pointsFidelite || 0) - (a.pointsFidelite || 0));

  const handleUpdatePoints = async (member: User, pointsChange: number) => {
    if (!member.firebaseUid) return;
    const newPoints = Math.max(0, (member.pointsFidelite || 0) + pointsChange);
    
    try {
      await updateDoc(doc(db, "users", member.firebaseUid), {
        pointsFidelite: newPoints
      });
      showToast(`Points mis à jour pour ${member.name}`, "success");
      setSelectedMember(null);
      setPointsToAdd(0);
    } catch (err) {
      showToast("Erreur lors de la mise à jour des points", "error");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 page-transition pb-24">
      <div>
        <h1 className="text-4xl font-black italic text-white tracking-tight uppercase">Fidélité</h1>
        <p className="text-velatra-textMuted text-sm font-medium mt-1">Gérez le programme de fidélité de vos membres</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="relative">
            <SearchIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-velatra-textMuted" />
            <Input 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Rechercher un membre..." 
              className="pl-12 !py-4"
            />
          </div>

          <div className="space-y-3">
            {filteredMembers.map((member, index) => (
              <Card key={member.id} className="bg-white/5 border-white/10 flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-velatra-accent/20 text-velatra-accent flex items-center justify-center font-black text-lg">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-white font-bold">{member.name}</h3>
                    <div className="text-xs text-velatra-textMuted">{member.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest text-velatra-textMuted font-bold">Points</div>
                    <div className="text-xl font-black text-velatra-warning">{member.pointsFidelite || 0}</div>
                  </div>
                  <Button variant="ghost" className="!p-2" onClick={() => setSelectedMember(member)}>
                    Gérer
                  </Button>
                </div>
              </Card>
            ))}
            {filteredMembers.length === 0 && (
              <div className="text-center py-12 text-velatra-textMuted italic">
                Aucun membre trouvé.
              </div>
            )}
          </div>
        </div>

        <div>
          <Card className="bg-velatra-bgCard border-white/10 sticky top-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-velatra-warning/20 text-velatra-warning rounded-xl">
                <GiftIcon size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Gestion des points</h2>
            </div>

            {selectedMember ? (
              <div className="space-y-6">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="text-sm text-velatra-textMuted mb-1">Membre sélectionné</div>
                  <div className="text-lg font-bold text-white">{selectedMember.name}</div>
                  <div className="text-2xl font-black text-velatra-warning mt-2">{selectedMember.pointsFidelite || 0} pts</div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-velatra-textMuted mb-2 uppercase tracking-widest font-bold">Ajouter / Retirer des points</label>
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        value={pointsToAdd} 
                        onChange={e => setPointsToAdd(Number(e.target.value))}
                        className="text-center text-lg font-bold"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="primary" 
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white border-none"
                      onClick={() => handleUpdatePoints(selectedMember, Math.abs(pointsToAdd))}
                    >
                      <PlusIcon size={16} className="mr-2" /> Ajouter
                    </Button>
                    <Button 
                      variant="primary" 
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white border-none"
                      onClick={() => handleUpdatePoints(selectedMember, -Math.abs(pointsToAdd))}
                    >
                      <MinusIcon size={16} className="mr-2" /> Retirer
                    </Button>
                  </div>
                  
                  <Button variant="ghost" fullWidth onClick={() => { setSelectedMember(null); setPointsToAdd(0); }}>
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-velatra-textMuted italic text-sm">
                Sélectionnez un membre dans la liste pour gérer ses points de fidélité.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
