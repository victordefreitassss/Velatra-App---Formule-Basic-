import React from 'react';
import { AppState } from '../types';
import { Card, Badge } from '../components/UI';
import { TrophyIcon, FlameIcon, UsersIcon, ActivityIcon } from '../components/Icons';
import { motion } from 'framer-motion';

const containerVariants: import('framer-motion').Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: import('framer-motion').Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 24 }
  }
};

export const CommunityPage: React.FC<{ state: AppState }> = ({ state }) => {
  const user = state.user!;
  
  // Get all members of the same club, sorted by XP
  const leaderboard = state.users
    .filter(u => u.clubId === user.clubId && u.role === 'member')
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 50); // Top 50

  const myRank = leaderboard.findIndex(u => u.id === user.id) + 1;

  // Get recent activity
  const recentActivity = state.logs
    .filter(log => log.clubId === user.clubId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 15);

  return (
    <motion.div 
      className="space-y-8 pb-24 max-w-5xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight leading-none mb-1 text-zinc-900">Communauté</h1>
          <p className="text-[10px] uppercase tracking-[2px] font-bold text-zinc-500">L'énergie du club</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-velatra-accent/10 flex items-center justify-center text-velatra-accent">
          <UsersIcon size={24} />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Leaderboard */}
        <div className="space-y-6">
          <motion.div variants={itemVariants}>
            <Card className="!p-6 bg-gradient-to-br from-velatra-accent to-velatra-accentDark text-white border-none shadow-[0_10px_40px_rgba(99,102,241,0.3)]">
              <div className="flex items-center gap-3 mb-4 opacity-80">
                <TrophyIcon size={20} />
                <h3 className="text-sm font-black uppercase tracking-widest">Mon Classement</h3>
              </div>
              <div className="text-5xl font-black tabular-nums">
                {myRank > 0 ? `#${myRank}` : '-'}
              </div>
              <p className="text-sm mt-2 opacity-80">Sur {leaderboard.length} membres</p>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="!p-6 bg-white/60 backdrop-blur-xl border-zinc-200/50">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 mb-6 flex items-center gap-2">
                <FlameIcon size={16} /> Top 10 du Club
              </h3>
              
              <div className="space-y-3">
                {leaderboard.slice(0, 10).map((member, index) => (
                  <motion.div 
                    key={member.id} 
                    variants={itemVariants}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all hover:scale-[1.02] ${member.id === user.id ? 'bg-velatra-accent/5 border-velatra-accent/30' : 'bg-white/80 border-zinc-100'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                        index === 0 ? 'bg-yellow-100 text-yellow-600' :
                        index === 1 ? 'bg-zinc-200 text-zinc-600' :
                        index === 2 ? 'bg-orange-100 text-orange-600' :
                        'bg-zinc-50 text-zinc-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-velatra-accent to-velatra-accentDark flex items-center justify-center font-bold text-sm text-zinc-900 ring-2 ring-white shrink-0">
                        {member.avatar || '👤'}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-zinc-900 truncate max-w-[100px]">{member.name}</p>
                        <p className="text-[10px] text-zinc-500">Niveau {Math.floor(member.xp / 1000) + 1}</p>
                      </div>
                    </div>
                    <Badge variant="success" className="uppercase tracking-widest text-[10px] shrink-0">
                      {member.xp} XP
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Right Column: Activity Feed */}
        <div className="lg:col-span-2">
          <motion.div variants={itemVariants} className="h-full">
            <Card className="!p-6 bg-white/60 backdrop-blur-xl border-zinc-200/50 h-full">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 mb-6 flex items-center gap-2">
                <ActivityIcon size={16} /> Activité Récente
              </h3>
              
              {recentActivity.length > 0 ? (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-200/50 before:to-transparent">
                  {recentActivity.map((log, index) => {
                    const member = state.users.find(u => u.id === log.memberId);
                    if (!member) return null;
                    
                    return (
                      <motion.div 
                        key={log.id} 
                        variants={itemVariants}
                        className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                      >
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-zinc-100 text-zinc-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-transform hover:scale-110">
                          <span className="text-lg">{member.avatar || '👤'}</span>
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-zinc-100/50 bg-white/80 backdrop-blur-sm shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-zinc-900 text-sm">{member.name} {member.id === user.id && '(Moi)'}</span>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              {new Date(log.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-600">
                            A terminé sa séance <span className="font-bold text-velatra-accent">{log.dayName}</span>
                          </p>
                          {log.isCoaching && (
                            <Badge variant="orange" className="mt-2 text-[10px]">Séance Coachée</Badge>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-zinc-200/50 rounded-2xl bg-white/30">
                  <p className="text-zinc-500 text-sm">Aucune activité récente dans le club.</p>
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};
