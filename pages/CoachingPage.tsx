import React, { useState, useMemo } from 'react';
import { AppState, User, Program } from '../types';
import { Button, Input, Badge } from '../components/UI';
import { SearchIcon, TargetIcon, DumbbellIcon, CalendarIcon, ClockIcon, ActivityIcon, MessageCircleIcon, UserIcon, Edit2Icon } from '../components/Icons';

interface CoachingPageProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  showToast: (m: string, t?: any) => void;
}

export const CoachingPage: React.FC<CoachingPageProps> = ({ state, setState, showToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'noprogram'>('all');

  const activeMembers = state.users.filter(u => u.role === 'member');
  
  const membersWithStats = useMemo(() => {
    return activeMembers.map(member => {
      const program = state.programs.find(p => p.memberId === Number(member.id));
      const logs = state.logs.filter(l => l.memberId === Number(member.id)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastSession = logs[0];
      
      let progress = 0;
      let isFinished = false;
      let nextSessionName = '';
      
      if (program) {
        const totalDays = program.nbDays * (program.durationWeeks || 1);
        progress = Math.min(100, Math.round((program.currentDayIndex / totalDays) * 100));
        isFinished = program.currentDayIndex >= totalDays;
        nextSessionName = program.days[program.currentDayIndex % program.nbDays]?.name || '';
      }

      return {
        ...member,
        program,
        lastSession,
        progress,
        isFinished,
        nextSessionName,
        logsCount: logs.length
      };
    }).sort((a, b) => {
      // Sort by last session date descending
      const dateA = a.lastSession ? new Date(a.lastSession.date).getTime() : 0;
      const dateB = b.lastSession ? new Date(b.lastSession.date).getTime() : 0;
      return dateB - dateA;
    });
  }, [activeMembers, state.programs, state.logs]);

  const filteredMembers = membersWithStats.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || (m.email && m.email.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchesSearch) return false;
    
    if (filter === 'active') return !!m.program && !m.isFinished;
    if (filter === 'noprogram') return !m.program || m.isFinished;
    return true;
  });

  const handleStartProgramSession = (member: User, program: Program) => {
    setState(s => ({ ...s, workout: program, workoutMember: member, workoutIsProgramSession: true }));
  };

  const handleStartFreeSession = (member: User) => {
    const dummyProgram: Program = {
      id: Date.now(),
      clubId: member.clubId,
      memberId: Number(member.id),
      name: "Séance Libre",
      presetId: null,
      nbDays: 1,
      durationWeeks: 1,
      currentDayIndex: 0,
      startDate: new Date().toISOString(),
      completedWeeks: [],
      days: [{ name: "Séance Libre", exercises: [], isCoaching: true }]
    };
    setState(s => ({ ...s, workout: dummyProgram, workoutMember: member, workoutIsProgramSession: false }));
  };

  const handleViewProfile = (member: User) => {
    setState(s => ({ ...s, page: 'users', selectedMember: member }));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-zinc-900 uppercase tracking-tight mb-2">Coaching Live</h1>
        <p className="text-zinc-500">Gérez vos séances de coaching, suivez la progression et lancez des entraînements.</p>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 p-6 mb-8 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
            <Input 
              placeholder="Rechercher un membre..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-12 !bg-zinc-50"
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
            <Button variant={filter === 'all' ? 'primary' : 'secondary'} onClick={() => setFilter('all')} className="!py-2">Tous</Button>
            <Button variant={filter === 'active' ? 'primary' : 'secondary'} onClick={() => setFilter('active')} className="!py-2">Actifs</Button>
            <Button variant={filter === 'noprogram' ? 'primary' : 'secondary'} onClick={() => setFilter('noprogram')} className="!py-2">Sans Prog.</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredMembers.map(member => {
            return (
              <div key={member.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 bg-zinc-50 rounded-2xl border border-zinc-200 hover:border-velatra-accent transition-colors gap-4">
                
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-50 border border-white flex items-center justify-center font-black text-xl text-zinc-700 shadow-inner shrink-0 relative">
                    {member.avatar || member.name.charAt(0)}
                    {member.lastSession && (new Date().getTime() - new Date(member.lastSession.date).getTime() < 7 * 24 * 60 * 60 * 1000) && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-bold text-zinc-900 text-lg">{member.name}</div>
                      {member.program && !member.isFinished && (
                        <Badge variant="success" className="!text-[10px]">En cours</Badge>
                      )}
                      {member.isFinished && (
                        <Badge variant="orange" className="!text-[10px]">Terminé</Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
                      {member.program ? (
                        <div className="flex items-center gap-1 text-velatra-accent font-medium">
                          <DumbbellIcon size={12} /> {member.program.name}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 italic">
                          <DumbbellIcon size={12} /> Aucun programme
                        </div>
                      )}
                      
                      {member.lastSession ? (
                        <div className="flex items-center gap-1">
                          <ClockIcon size={12} /> Dernière: {new Date(member.lastSession.date).toLocaleDateString('fr-FR')}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <ClockIcon size={12} /> Aucune séance
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <ActivityIcon size={12} /> {member.logsCount} séances totales
                      </div>
                    </div>
                  </div>
                </div>

                {member.program && !member.isFinished && (
                  <div className="w-full md:w-48 px-4">
                    <div className="flex justify-between text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-widest">
                      <span>Progression</span>
                      <span>{member.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                      <div className="h-full bg-velatra-accent rounded-full" style={{ width: `${member.progress}%` }}></div>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1 truncate">
                      Prochaine: {member.nextSessionName}
                    </div>
                  </div>
                )}
                
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto mt-4 md:mt-0">
                  <div title="Voir le profil">
                    <Button variant="secondary" onClick={() => handleViewProfile(member)} className="!p-2">
                      <UserIcon size={18} />
                    </Button>
                  </div>
                  
                  <Button variant="secondary" onClick={() => handleStartFreeSession(member)} className="!py-2 !px-3 !text-xs whitespace-nowrap">
                    <ActivityIcon size={14} className="mr-1.5" /> Séance Libre
                  </Button>
                  
                  <Button 
                    variant={member.program && !member.isFinished ? "primary" : "secondary"}
                    onClick={() => member.program ? handleStartProgramSession(member, member.program) : null}
                    disabled={!member.program || member.isFinished}
                    className="!py-2 !px-3 !text-xs whitespace-nowrap"
                  >
                    <TargetIcon size={14} className="mr-1.5" /> Séance Prog.
                  </Button>
                </div>
                
              </div>
            );
          })}
          
          {filteredMembers.length === 0 && (
            <div className="col-span-full text-center py-12 text-zinc-500 italic bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
              Aucun membre ne correspond à vos critères
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
