import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type Client360SectionId } from "../../components/client360";
import {
  BarChartIcon,
  CheckIcon,
  DumbbellIcon,
  ImageIcon,
  SaveIcon,
} from "../../components/Icons";
import { Button, Input } from "../../components/UI";
import {
  AppState,
  BodyData,
  Performance,
  Program,
  Subscription,
  User,
} from "../../types";

interface Props {
  desktop: boolean;
  memberTab: Client360SectionId;
  newScan: { weight: string; fat: string; muscle: string };
  setNewScan: React.Dispatch<
    React.SetStateAction<{ weight: string; fat: string; muscle: string }>
  >;
  handleSaveScan: () => Promise<void>;
  state: AppState;
  selectedProfile: User;
  selectedDateForPhoto: string;
  setSelectedDateForPhoto: React.Dispatch<React.SetStateAction<string>>;
  setSelectedEvolutionPhoto: React.Dispatch<React.SetStateAction<string>>;
  weightHistory: BodyData[];
  chartData: { date: string; weight: number; fat: number; muscle: number }[];
  CustomTooltip: ({ active, payload, label }: any) => React.JSX.Element;
  stats: {
    perfs: Performance[];
    body: BodyData[];
    program: Program;
    totalSpent: number;
    memberOrders: import("../../types").SupplementOrder[];
    subscription: Subscription;
  };
  handleDeleteScan: (scanId: number) => Promise<void>;
}

export function MemberProgress({
  desktop,
  memberTab,
  newScan,
  setNewScan,
  handleSaveScan,
  state,
  selectedProfile,
  selectedDateForPhoto,
  setSelectedDateForPhoto,
  setSelectedEvolutionPhoto,
  weightHistory,
  chartData,
  CustomTooltip,
  stats,
  handleDeleteScan,
}: Props) {
  return (
    <div className={memberTab === "progress" ? "m360-progress" : undefined}>
      {desktop && memberTab === "progress" && (
        <div className="m360-progress-summary">
          {stats.body[0] ? (
            <>
              <div>
                <span>Poids</span>
                <strong>{stats.body[0].weight} kg</strong>
              </div>
              <div>
                <span>Masse grasse</span>
                <strong>{stats.body[0].fat ?? "—"} %</strong>
              </div>
              <div>
                <span>Masse musculaire</span>
                <strong>{stats.body[0].muscle ?? "—"} kg</strong>
              </div>
              <div>
                <span>Dernière mesure</span>
                <strong>
                  {new Date(stats.body[0].date).toLocaleDateString("fr-FR")}
                </strong>
              </div>
            </>
          ) : (
            <p>
              Aucune mesure disponible. Enregistrez un premier scan pour
              commencer le suivi.
            </p>
          )}
        </div>
      )}
      {memberTab === "progress" && (
        <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
            <div>
              <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">
                Suivi & Mensurations
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Gérez le scan corporel, l'évolution en photos et l'historique
                biométrique.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-6 bg-zinc-50 p-8 rounded-[32px] border border-zinc-200">
              <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest text-emerald-500 lg:text-indigo-500 mb-2">
                Nouveau Scan
              </h3>
              <div className="space-y-4">
                <Input
                  placeholder="Poids (kg)"
                  type="number"
                  className="!bg-zinc-50"
                  value={newScan.weight || ""}
                  onChange={(e) =>
                    setNewScan({ ...newScan, weight: e.target.value })
                  }
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Gras (%)"
                    type="number"
                    className="!bg-zinc-50"
                    value={newScan.fat || ""}
                    onChange={(e) =>
                      setNewScan({ ...newScan, fat: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Muscle (kg)"
                    type="number"
                    className="!bg-zinc-50"
                    value={newScan.muscle || ""}
                    onChange={(e) =>
                      setNewScan({ ...newScan, muscle: e.target.value })
                    }
                  />
                </div>
                <Button
                  variant="success"
                  fullWidth
                  onClick={handleSaveScan}
                  className="!py-4 shadow-xl shadow-emerald-500/10 lg:shadow-indigo-500/10"
                >
                  <SaveIcon size={16} className="mr-2" /> ENREGISTRER SCAN
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {(() => {
                const memberPhotos =
                  state.progressPhotos?.filter(
                    (p) =>
                      p.clubId === state.user?.clubId &&
                      p.memberId === Number(selectedProfile.id) &&
                      p.visibility === "coach",
                  ) || [];
                const photosByDate = memberPhotos.reduce(
                  (acc, photo) => {
                    const date = photo.date.split("T")[0];
                    if (!acc[date]) acc[date] = photo;
                    return acc;
                  },
                  {} as Record<string, import("../../types").ProgressPhoto>,
                );
                const sortedDates = Object.keys(photosByDate).sort(
                  (a, b) => new Date(b).getTime() - new Date(a).getTime(),
                );
                const latestDate = sortedDates[0];

                const activeDate = selectedDateForPhoto || latestDate;
                const activePhoto = activeDate
                  ? photosByDate[activeDate]
                  : null;

                if (!activePhoto) {
                  return (
                    <div className="bg-zinc-50 border border-zinc-200 rounded-[32px] p-8 shadow-sm text-center">
                      <ImageIcon
                        size={32}
                        className="mx-auto text-zinc-300 mb-3"
                      />
                      <h4 className="font-black text-zinc-900 text-sm uppercase mb-1">
                        Aucune photo d'évolution
                      </h4>
                      <p className="text-xs text-zinc-500">
                        Le membre n'a pas encore partagé ses photos d'évolution
                        avec vous.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="bg-zinc-50 border border-zinc-200 rounded-[32px] p-8 shadow-sm space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-black text-zinc-900 text-sm uppercase font-display italic">
                        Évolution corporelle
                      </span>

                      {sortedDates.length > 1 ? (
                        <select
                          value={activeDate}
                          onChange={(e) =>
                            setSelectedDateForPhoto(e.target.value)
                          }
                          className="text-xs bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 font-bold outline-none focus:border-emerald-500 lg:focus:border-indigo-500 cursor-pointer text-zinc-800"
                        >
                          {sortedDates.map((d) => (
                            <option key={d} value={d}>
                              {new Date(d).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[10px] font-bold text-zinc-500 uppercase bg-zinc-200 px-2 py-1 rounded">
                          {new Date(activeDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {["frontUrl", "sideUrl", "backUrl"].map((type) => {
                        const url = (activePhoto as any)[type];
                        return (
                          <div
                            key={type}
                            className="aspect-[3/4] bg-zinc-200 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border border-zinc-300/50 shadow-sm relative group"
                            onClick={() =>
                              url && setSelectedEvolutionPhoto(url)
                            }
                          >
                            {url ? (
                              <>
                                <img
                                  src={url}
                                  alt={type}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="text-[10px] text-white font-bold uppercase tracking-wider">
                                    Agrandir
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-400">
                                <ImageIcon size={16} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {activePhoto.measurements &&
                      Object.keys(activePhoto.measurements).length > 0 && (
                        <div className="bg-white rounded-2xl p-4 border border-zinc-200">
                          <h4 className="text-xs font-black uppercase text-zinc-500 tracking-wider mb-3">
                            Mensurations (cm)
                          </h4>
                          <div className="grid grid-cols-3 gap-y-3 gap-x-2">
                            {[
                              { key: "chest", label: "Poitrine" },
                              { key: "waist", label: "Taille" },
                              { key: "hips", label: "Hanches" },
                              { key: "arm", label: "Bras" },
                              { key: "thigh", label: "Cuisse" },
                              { key: "calf", label: "Mollet" },
                            ].map((m) =>
                              activePhoto.measurements?.[m.key as any] ? (
                                <div key={m.key}>
                                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                    {m.label}
                                  </div>
                                  <div className="text-sm font-black text-zinc-900">
                                    {activePhoto.measurements[m.key as any] ||
                                      "--"}
                                  </div>
                                </div>
                              ) : null,
                            )}
                          </div>
                        </div>
                      )}

                    {sortedDates.length > 1 && (
                      <div className="text-center pt-2">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                          {sortedDates.length} relevés photos disponibles
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </section>
      )}
      {memberTab === "progress" && (
        <section className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                <BarChartIcon size={24} />
              </div>
              <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">
                Évolution Corporelle
              </h3>
            </div>

            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 lg:bg-indigo-500" />
                <span className="text-[9px] font-black uppercase text-zinc-900 tracking-widest">
                  Poids
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 lg:bg-indigo-500" />
                <span className="text-[9px] font-black uppercase text-zinc-900 tracking-widest">
                  Muscle
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[9px] font-black uppercase text-zinc-900 tracking-widest">
                  Gras (%)
                </span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-50 border border-zinc-200 rounded-[40px] p-6 h-80 relative overflow-hidden shadow-sm">
            {weightHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient
                      id="colorWeight"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="colorMuscle"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={desktop ? "#a855f7" : "#10b981"}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={desktop ? "#a855f7" : "#10b981"}
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#27272a"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="#a1a1aa"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#a1a1aa"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                    domain={["dataMin - 2", "dataMax + 2"]}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#a1a1aa"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dx={10}
                    domain={[0, "dataMax + 5"]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="weight"
                    name="Poids"
                    stroke="#6366f1"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorWeight)"
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="muscle"
                    name="Muscle"
                    stroke={desktop ? "#a855f7" : "#10b981"}
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorMuscle)"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="fat"
                    name="Gras"
                    stroke="#3b82f6"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorFat)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-xs font-bold uppercase tracking-widest">
                Aucune donnée
              </div>
            )}
          </div>
        </section>
      )}
      {memberTab === "progress" && (
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 lg:bg-indigo-500/10 rounded-2xl text-emerald-500 lg:text-indigo-500">
              <DumbbellIcon size={24} />
            </div>
            <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">
              Tableau des Records (PR)
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {stats.perfs.length > 0 ? (
              stats.perfs.map((p) => {
                const ex = (state.exercises || []).find(
                  (e) => e.perfId === p.exId,
                );
                return (
                  <div
                    key={p.id}
                    className="bg-zinc-50 backdrop-blur-xl border border-zinc-200 p-6 rounded-3xl flex justify-between items-center group hover:bg-white transition-all shadow-sm"
                  >
                    <div>
                      <div className="text-[9px] uppercase font-black text-emerald-500 lg:text-indigo-500 tracking-widest mb-1">
                        {ex?.cat || "FORCE"}
                      </div>
                      <div className="font-black text-zinc-900 text-lg italic tracking-tight">
                        {ex?.name || p.exId}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-zinc-900 tracking-tighter">
                        {p.weight}kg
                      </div>
                      <div className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">
                        {p.reps} REPS
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-12 text-center bg-zinc-50 backdrop-blur-xl border border-dashed  rounded-[32px] text-[10px] uppercase font-black text-zinc-500 tracking-widest italic shadow-sm">
                Aucun PR enregistré
              </div>
            )}
          </div>
        </section>
      )}
      {memberTab === "progress" && (
        <section className="space-y-8 pb-12">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 lg:bg-indigo-500/10 rounded-2xl text-emerald-500 lg:text-indigo-500">
              <CheckIcon size={24} />
            </div>
            <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">
              Journaux Biométriques
            </h3>
          </div>
          <div className="space-y-4">
            {stats.body.length > 0 ? (
              stats.body.map((b) => (
                <div
                  key={b.id}
                  className="bg-zinc-50 backdrop-blur-xl border border-zinc-200 p-6 rounded-3xl flex justify-between items-center group hover:border-emerald-500/50 lg:hover:border-indigo-500/50 transition-all shadow-sm"
                >
                  <div className="flex flex-col">
                    <span className="text-zinc-900 font-black text-sm uppercase tracking-widest italic">
                      {new Date(b.date).toLocaleDateString("fr-FR", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-zinc-900 font-black uppercase tracking-widest">
                        Scan effectué en club
                      </span>
                      <button
                        onClick={() => handleDeleteScan(b.id)}
                        className="text-[10px] text-red-500/40 hover:text-red-500 font-black uppercase tracking-widest transition-colors opacity-0 group-hover:opacity-100"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-10">
                    <div className="text-center group-hover:scale-110 transition-transform">
                      <div className="text-[10px] font-black uppercase text-zinc-900 tracking-widest mb-1">
                        POIDS
                      </div>
                      <div className="text-xl font-black text-zinc-900">
                        {b.weight}
                        <span className="text-xs ml-0.5 opacity-50">KG</span>
                      </div>
                    </div>
                    <div className="text-center group-hover:scale-110 transition-transform">
                      <div className="text-[10px] font-black uppercase text-zinc-900 tracking-widest mb-1">
                        GRAS
                      </div>
                      <div className="text-xl font-black text-emerald-500 lg:text-indigo-500">
                        {b.fat}
                        <span className="text-xs ml-0.5 opacity-50">%</span>
                      </div>
                    </div>
                    <div className="text-center group-hover:scale-110 transition-transform">
                      <div className="text-[10px] font-black uppercase text-zinc-900 tracking-widest mb-1">
                        MUSCLE
                      </div>
                      <div className="text-xl font-black text-emerald-500 lg:text-indigo-500">
                        {b.muscle}
                        <span className="text-xs ml-0.5 opacity-50">KG</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center bg-zinc-50 backdrop-blur-xl border border-dashed  rounded-[32px] text-[10px] uppercase font-black text-zinc-500 tracking-widest italic shadow-sm">
                Aucun historique biométrique
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
