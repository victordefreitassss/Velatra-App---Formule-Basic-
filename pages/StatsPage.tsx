
import React from 'react';
import { AppState, BodyData } from '../types';
import { Card, Badge } from '../components/UI';
import { calculate1RM, calculate8RM, calculate12RM } from '../utils';
import { TargetIcon, BarChartIcon, TrophyIcon, DatabaseIcon } from '../components/Icons';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

export const StatsPage: React.FC<{ state: AppState, setState: any }> = ({ state }) => {
  const user = state.user!;
  const myPerfs = state.performances.filter(p => Number(p.memberId) === Number(user.id));
  const myBody = state.bodyData
    .filter(b => Number(b.memberId) === Number(user.id))
    .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const chartData = myBody.map(b => ({
    date: new Date(b.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    weight: b.weight,
    fat: b.fat,
    muscle: b.muscle
  }));

  // Grouper par exercice pour avoir le record max
  const bests = myPerfs.reduce((acc: any, curr) => {
    if (!acc[curr.exId] || acc[curr.exId].weight < curr.weight) {
      acc[curr.exId] = curr;
    }
    return acc;
  }, {});

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 border border-white/10 p-4 rounded-2xl backdrop-blur-xl shadow-2xl">
          <p className="text-[10px] font-black text-velatra-textDark uppercase tracking-widest mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="text-[10px] font-black uppercase" style={{ color: entry.color }}>{entry.name}</span>
              <span className="text-sm font-black text-white">{entry.value}{entry.name === 'Poids' || entry.name === 'Muscle' ? 'kg' : '%'}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 page-transition pb-20">
      <div className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-white leading-none">Analyses <span className="text-velatra-accent">PERFORMANCE</span></h1>
          <p className="text-[10px] text-velatra-textDark font-bold uppercase tracking-[3px] mt-2">Suivi biométrique & Records</p>
        </div>
      </div>

      {/* Weight Chart */}
      <Card className="bg-[#0a0a0a] border-white/5 !p-8 space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-velatra-accent/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-velatra-accent/10 rounded-2xl flex items-center justify-center text-velatra-accent shadow-inner">
              <BarChartIcon size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase italic leading-none">Évolution Corporelle</h2>
              <p className="text-[10px] text-velatra-textDark font-black uppercase tracking-widest mt-1">Données issues des scans club</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-velatra-accent" />
              <span className="text-[9px] font-black uppercase text-velatra-textDark tracking-widest">Poids</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-black uppercase text-velatra-textDark tracking-widest">Muscle</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[9px] font-black uppercase text-velatra-textDark tracking-widest">Gras (%)</span>
            </div>
          </div>
        </div>

        <div className="h-80 w-full relative bg-black/40 rounded-[32px] p-6 border border-white/5">
          {myBody.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMuscle" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#666', fontSize: 10, fontWeight: 900 }} 
                  dy={10}
                />
                <YAxis 
                  hide 
                  domain={['dataMin - 5', 'dataMax + 5']} 
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  name="Poids"
                  type="monotone" 
                  dataKey="weight" 
                  stroke="#6366f1" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorWeight)" 
                  animationDuration={2000}
                />
                <Area 
                  name="Muscle"
                  type="monotone" 
                  dataKey="muscle" 
                  stroke="#10b981" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorMuscle)" 
                  animationDuration={2500}
                />
                <Area 
                  name="Gras"
                  type="monotone" 
                  dataKey="fat" 
                  stroke="#3b82f6" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorFat)" 
                  animationDuration={3000}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-4 opacity-30">
              <DatabaseIcon size={48} />
              <div className="text-[10px] text-velatra-textDark uppercase font-black tracking-[6px] italic">Aucun scan enregistré</div>
            </div>
          )}
        </div>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.values(bests).length === 0 ? (
          <Card className="col-span-full py-20 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-[40px]">
            <TrophyIcon size={48} className="mx-auto mb-4 text-white/10" />
            <p className="text-velatra-textDark italic font-black uppercase tracking-widest text-xs">Aucune performance enregistrée pour le moment.</p>
          </Card>
        ) : Object.values(bests).map((p: any) => {
          const ex = state.exercises.find(e => e.perfId === p.exId);
          const oneRM = calculate1RM(p.weight, p.reps);
          return (
            <Card key={p.exId} className="group border-none ring-1 ring-white/5 hover:ring-velatra-accent/30 transition-all !p-8 bg-[#0a0a0a]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="text-[10px] text-velatra-accent font-black uppercase tracking-[3px] mb-1 italic">Record Personnel</div>
                  <div className="font-black text-2xl text-white uppercase italic tracking-tighter group-hover:text-velatra-accent transition-colors">{ex?.name || p.exId}</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-velatra-accent group-hover:bg-velatra-accent group-hover:text-white transition-all">
                  <TrophyIcon size={24} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                 <div className="bg-black border border-white/5 p-4 rounded-2xl text-center group-hover:border-white/10 transition-all">
                    <div className="text-[8px] uppercase text-velatra-textDark font-black tracking-widest mb-1">Charge</div>
                    <div className="font-black text-xl text-white italic">{p.weight}<span className="text-[10px] ml-0.5 opacity-50">kg</span></div>
                 </div>
                 <div className="bg-black border border-white/5 p-4 rounded-2xl text-center group-hover:border-white/10 transition-all">
                    <div className="text-[8px] uppercase text-velatra-textDark font-black tracking-widest mb-1">Reps</div>
                    <div className="font-black text-xl text-white italic">{p.reps}</div>
                 </div>
                 <div className="bg-velatra-accent/5 border border-velatra-accent/20 p-4 rounded-2xl text-center group-hover:bg-velatra-accent/10 transition-all">
                    <div className="text-[8px] uppercase text-velatra-accent font-black tracking-widest mb-1">Est. 1RM</div>
                    <div className="font-black text-xl text-velatra-accent italic">{oneRM}<span className="text-[10px] ml-0.5 opacity-50">kg</span></div>
                 </div>
                 <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center group-hover:border-white/20 transition-all">
                    <div className="text-[8px] uppercase text-velatra-textDark font-black tracking-widest mb-1">Est. 8RM</div>
                    <div className="font-black text-xl text-white italic">{calculate8RM(oneRM)}<span className="text-[10px] ml-0.5 opacity-50">kg</span></div>
                 </div>
                 <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center group-hover:border-white/20 transition-all">
                    <div className="text-[8px] uppercase text-velatra-textDark font-black tracking-widest mb-1">Est. 12RM</div>
                    <div className="font-black text-xl text-white italic">{calculate12RM(oneRM)}<span className="text-[10px] ml-0.5 opacity-50">kg</span></div>
                 </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center">
                <div className="text-[9px] text-velatra-textDark font-black uppercase tracking-widest flex items-center gap-2">
                   <TargetIcon size={12} /> {new Date(p.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
                <Badge variant="dark" className="!bg-white/5 !text-[8px]">{ex?.cat}</Badge>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
