import { MemberProgramArchive } from './MemberProgramArchive';
import React from "react";
import { type Client360SectionId } from "../../components/client360";
import { CoachFollowup } from "../../components/CoachingFollowup";
import {
  BarChartIcon,
  BotIcon,
  CalendarIcon,
  DumbbellIcon,
  EyeIcon,
  LayersIcon,
  MessageCircleIcon,
  PhoneIcon,
  PlayCircleIcon,
  PlusIcon,
  SettingsIcon,
  SparklesIcon,
  TargetIcon,
} from "../../components/Icons";
import { Button } from "../../components/UI";
import { getProductCapabilities } from "../../productCapabilities";
import {
  AppState,
  BodyData,
  Performance,
  Program,
  SessionLog,
  Subscription,
  User,
} from "../../types";

interface Props {
  desktop: boolean;
  coachingView: "program" | "sessions";
  memberTab: Client360SectionId;
  selectedProfile: User;
  state: AppState;
  stats: {
    perfs: Performance[];
    body: BodyData[];
    program: Program;
    totalSpent: number;
    memberOrders: import("../../types").SupplementOrder[];
    subscription: Subscription;
  };
  hasDuration: number;
  progCompletion: number;
  currentWeek: number;
  currentSession: number;
  showToast: any;
  setState: any;
  setShowProgramOptions: React.Dispatch<React.SetStateAction<boolean>>;
  showProgramOptions: boolean;
  setShowAssignProgramTemplateModal: React.Dispatch<
    React.SetStateAction<boolean>
  >;
  canUseAI: boolean;
  openAIGeneratorModal: () => void;
  isGeneratingProgram: boolean;
  handleEditProgram: (member: User) => void;
  visibleCoachingLogs: number;
  setSelectedLog: React.Dispatch<React.SetStateAction<SessionLog>>;
  setVisibleCoachingLogs: React.Dispatch<React.SetStateAction<number>>;
  isGeneratingReport: boolean;
  generatedReport: string;
  handleGenerateReport: () => Promise<void>;
  isDetectingStagnation: boolean;
  stagnationResult: any;
  handleDetectStagnation: () => Promise<void>;
}

export function MemberCoaching({
  desktop,
  coachingView,
  memberTab,
  selectedProfile,
  state,
  stats,
  hasDuration,
  progCompletion,
  currentWeek,
  currentSession,
  showToast,
  setState,
  setShowProgramOptions,
  showProgramOptions,
  setShowAssignProgramTemplateModal,
  canUseAI,
  openAIGeneratorModal,
  isGeneratingProgram,
  handleEditProgram,
  visibleCoachingLogs,
  setSelectedLog,
  setVisibleCoachingLogs,
  isGeneratingReport,
  generatedReport,
  handleGenerateReport,
  isDetectingStagnation,
  stagnationResult,
  handleDetectStagnation,
}: Props) {
  return (
    <>
      {memberTab === "coaching" && (
        <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div
            className="m360-coaching-program"
            hidden={desktop && coachingView !== "program"}
          >
            {selectedProfile.firebaseUid && (
              <CoachFollowup
                memberUid={selectedProfile.firebaseUid}
                programs={state.programs.filter(
                  (program) =>
                    program.clubId === state.user?.clubId &&
                    program.memberId === selectedProfile.id,
                )}
                section="journey"
              />
            )}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest text-emerald-500 lg:text-indigo-500">
                    Plan Actif
                  </h3>
                </div>
                {stats.program ? (
                  <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
                    {/* Title & Phase Badge in a single line */}
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="font-black text-zinc-900 text-lg uppercase italic tracking-tight leading-tight shrink">
                        {stats.program.name}
                      </div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-100/80 px-2.5 py-1 rounded-full shrink-0">
                        {hasDuration
                          ? `${progCompletion}% complété`
                          : `Semaine ${currentWeek} • Jour ${currentSession}`}
                      </div>
                    </div>

                    {/* Progress Bar (Thinner and sleeker) */}
                    <div className="my-3">
                      {hasDuration ? (
                        <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/50">
                          <div
                            className="h-full bg-emerald-500 lg:bg-indigo-500 rounded-full transition-all duration-1000"
                            style={{ width: `${progCompletion}%` }}
                          />
                        </div>
                      ) : (
                        <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/50 flex">
                          <div className="h-full bg-emerald-500/80 lg:bg-indigo-500/80 w-full rounded-full" />
                        </div>
                      )}
                    </div>

                    <p className="mt-3 text-xs text-zinc-500">
                      Début :{" "}
                      {new Date(stats.program.startDate).toLocaleDateString(
                        "fr-FR",
                      )}
                      {stats.program.durationWeeks
                        ? ` · ${stats.program.durationWeeks} semaines`
                        : " · Durée non définie"}
                    </p>
                    {/* Action Buttons: 1 Giant CTA, 2 auxiliary actions */}
                    <div className="mt-5 space-y-2">
                      {/* Play Action */}
                      <Button
                        variant="primary"
                        onClick={() => {
                          setState((s) => ({
                            ...s,
                            workout: stats.program,
                            workoutMember: selectedProfile,
                          }));
                        }}
                        className="!py-3.5 !text-xs w-full !rounded-2xl shadow-md font-black uppercase tracking-wider flex items-center justify-center gap-2 text-zinc-900 !bg-emerald-500 lg:!bg-indigo-500 hover:!bg-emerald-600 lg:hover:!bg-indigo-600 border-none select-none cursor-pointer"
                      >
                        <PlayCircleIcon size={16} />
                        LANCER SÉANCE COACHING
                      </Button>

                      {/* Auxiliary controls */}
                      <div className="flex gap-2">
                        {/* Aperçu */}
                        <button
                          type="button"
                          onClick={() =>
                            setState({ ...state, viewingProg: stats.program })
                          }
                          className="flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-800 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <EyeIcon size={12} />
                          Aperçu du plan
                        </button>

                        {/* Gérer (Saves space by bundling edit/ai/assign and whatsapp) */}
                        <button
                          type="button"
                          onClick={() =>
                            setShowProgramOptions(!showProgramOptions)
                          }
                          className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest border rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            showProgramOptions
                              ? "bg-zinc-900 border-zinc-900 text-white shadow-inner"
                              : "bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-800"
                          }`}
                        >
                          <SettingsIcon size={12} />
                          {showProgramOptions
                            ? "Masquer Options"
                            : "Options & Gérer"}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Program Actions (Clean grid, extremely professional) */}
                    {showProgramOptions && (
                      <div className="mt-4 pt-4 border-t border-zinc-105 grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 duration-200">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAssignProgramTemplateModal(true);
                            setShowProgramOptions(false);
                          }}
                          className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-50 hover:bg-emerald-500/10 lg:hover:bg-indigo-500/10 border border-zinc-150 text-left transition-all hover:border-emerald-500/20 lg:hover:border-indigo-500/20 cursor-pointer group"
                        >
                          <PlusIcon
                            size={14}
                            className="text-emerald-500 lg:text-indigo-500 shrink-0 group-hover:scale-110 transition-transform"
                          />
                          <div>
                            <div className="text-[9px] font-black uppercase text-zinc-900 tracking-wider">
                              Assigner Modèle
                            </div>
                            <div className="text-[7px] text-zinc-400 font-bold uppercase mt-0.5">
                              Importer de la base
                            </div>
                          </div>
                        </button>

                        {canUseAI && (
                          <button
                            type="button"
                            onClick={() => {
                              openAIGeneratorModal();
                              setShowProgramOptions(false);
                            }}
                            disabled={isGeneratingProgram}
                            className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-50 hover:bg-amber-500/10 border border-zinc-150 text-left transition-all hover:border-amber-500/20 cursor-pointer group disabled:opacity-50"
                          >
                            <SparklesIcon
                              size={14}
                              className="text-amber-500 shrink-0 group-hover:scale-110 transition-transform"
                            />
                            <div>
                              <div className="text-[9px] font-black uppercase text-zinc-900 tracking-wider">
                                Générer via IA
                              </div>
                              <div className="text-[7px] text-zinc-400 font-bold uppercase mt-0.5">
                                Moteur Velatra AI
                              </div>
                            </div>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            handleEditProgram(selectedProfile);
                            setShowProgramOptions(false);
                          }}
                          className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-50 hover:bg-indigo-500/10 border border-zinc-150 text-left transition-all hover:border-indigo-500/20 cursor-pointer group"
                        >
                          <LayersIcon
                            size={14}
                            className="text-indigo-500 shrink-0 group-hover:scale-110 transition-transform"
                          />
                          <div>
                            <div className="text-[9px] font-black uppercase text-zinc-900 tracking-wider">
                              Créer/Modifier Ext.
                            </div>
                            <div className="text-[7px] text-zinc-400 font-bold uppercase mt-0.5">
                              Éditeur à la carte
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowProgramOptions(false);
                            if (!selectedProfile.phone)
                              return showToast(
                                "Adhérent sans numéro de téléphone",
                                "error",
                              );
                            const text = encodeURIComponent(
                              `Salut ${selectedProfile.name} ! Ton nouveau programme ${stats.program?.name} est disponible sur l'application. Bon entraînement ! 💪`,
                            );
                            window.open(
                              `https://wa.me/${selectedProfile.phone.replace(/[^0-9]/g, "")}?text=${text}`,
                              "_blank",
                            );
                          }}
                          className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-50 hover:bg-teal-500/10 border border-zinc-150 text-left transition-all hover:border-teal-500/20 cursor-pointer group"
                        >
                          <PhoneIcon
                            size={14}
                            className="text-emerald-500 lg:text-indigo-500 shrink-0 group-hover:scale-110 transition-transform"
                          />
                          <div>
                            <div className="text-[9px] font-black uppercase text-zinc-900 tracking-wider">
                              Alerte WhatsApp
                            </div>
                            <div className="text-[7px] text-zinc-400 font-bold uppercase mt-0.5">
                              Partagé avec l'athlète
                            </div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white border border-dashed border-zinc-200 rounded-3xl p-6 text-center shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 mx-auto mb-3 border border-zinc-100">
                      <DumbbellIcon size={20} />
                    </div>
                    <h4 className="font-extrabold text-zinc-900 text-sm uppercase tracking-wider mb-1">
                      Aucun cycle en cours
                    </h4>
                    <p className="text-[11px] text-zinc-500 max-w-xs mx-auto mb-5 leading-normal">
                      Planifiez le parcours d'entraînement pour cet athlète en
                      créant son programme.
                    </p>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditProgram(selectedProfile)}
                        className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 transition-all text-center cursor-pointer group"
                      >
                        <LayersIcon
                          size={14}
                          className="text-zinc-600 mb-1.5 group-hover:scale-110 transition-transform"
                        />
                        <span className="text-[8px] font-black uppercase tracking-wider text-zinc-700 leading-tight">
                          À la carte
                        </span>
                        <span className="text-[7px] text-zinc-400 font-extrabold uppercase mt-0.5">
                          Créer
                        </span>
                      </button>

                      {canUseAI && (
                        <button
                          type="button"
                          onClick={openAIGeneratorModal}
                          disabled={isGeneratingProgram}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl bg-gradient-to-br from-emerald-500/5 lg:from-indigo-500/5 to-emerald-600/5 lg:to-indigo-600/5 hover:from-emerald-500/15 lg:hover:from-indigo-500/15 hover:to-emerald-600/15 lg:hover:to-indigo-600/15 border border-emerald-500/10 lg:border-indigo-500/10 hover:border-emerald-500/20 lg:hover:border-indigo-500/20 transition-all text-center cursor-pointer group ${isGeneratingProgram ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <SparklesIcon
                            size={14}
                            className="text-emerald-500 lg:text-indigo-500 mb-1.5 group-hover:scale-110 transition-transform"
                          />
                          <span className="text-[8px] font-black uppercase tracking-wider text-emerald-600 lg:text-indigo-600 leading-tight">
                            Moteur IA
                          </span>
                          <span className="text-[7px] text-emerald-400 lg:text-indigo-400 font-extrabold uppercase mt-0.5">
                            Générer
                          </span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowAssignProgramTemplateModal(true)}
                        className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 transition-all text-center cursor-pointer group"
                      >
                        <PlusIcon
                          size={14}
                          className="text-zinc-600 mb-1.5 group-hover:scale-110 transition-transform"
                        />
                        <span className="text-[8px] font-black uppercase tracking-wider text-zinc-700 leading-tight">
                          Modèle
                        </span>
                        <span className="text-[7px] text-zinc-400 font-extrabold uppercase mt-0.5">
                          Importer
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {desktop && <MemberProgramArchive member={selectedProfile} state={state} onOpen={program => setState((previous: AppState) => ({...previous, viewingProg:program}))} />}
          </div>
          <div
            className="m360-coaching-sessions"
            hidden={desktop && coachingView !== "sessions"}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 lg:bg-indigo-500/10 rounded-2xl text-emerald-500 lg:text-indigo-500">
                <CalendarIcon size={24} />
              </div>
              <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">
                Historique des Séances
              </h3>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-[40px] p-8 shadow-sm">
              {(() => {
                const allLogs = (state.logs || [])
                  .filter(
                    (log) =>
                      log.clubId === state.user?.clubId &&
                      log.memberId === Number(selectedProfile.id),
                  )
                  .sort(
                    (a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime(),
                  );
                if (allLogs.length === 0) {
                  return (
                    <div className="text-center py-8 text-zinc-500 text-sm italic">
                      Aucune séance enregistrée pour ce membre.
                    </div>
                  );
                }
                return (
                  <div className="space-y-4">
                    {allLogs.slice(0, visibleCoachingLogs).map((log) => {
                      const isAutonomous = !log.isCoaching;
                      const colorTheme = isAutonomous ? "blue" : "emerald";
                      const bgColorClass = isAutonomous
                        ? "bg-blue-50 border-blue-200"
                        : "bg-emerald-50 lg:bg-indigo-50 border-emerald-200 lg:border-indigo-200";
                      const labelColors = isAutonomous
                        ? "bg-blue-500/20 text-blue-600"
                        : "bg-emerald-500/20 lg:bg-indigo-500/20 text-emerald-600 lg:text-indigo-600";

                      return (
                        <div
                          key={log.id}
                          className={`flex flex-col gap-3 p-4 backdrop-blur-xl border rounded-2xl shadow-sm ${bgColorClass}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-bold text-zinc-900">
                                {new Date(log.date).toLocaleDateString(
                                  "fr-FR",
                                  {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  },
                                )}
                              </div>
                              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                                {isAutonomous
                                  ? "Séance en Autonomie"
                                  : "Séance Coaching"}{" "}
                                • {log.dayName || "Jour libre"} • Semaine{" "}
                                {log.week}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-black uppercase text-zinc-500 tracking-wider ${labelColors}`}
                              >
                                Terminée
                              </span>
                              <Button
                                variant="secondary"
                                className="!py-1 !px-2 !text-[10px] !rounded-lg bg-white/50 hover:bg-white"
                                onClick={() => setSelectedLog(log)}
                              >
                                VOIR RÉCAP
                              </Button>
                            </div>
                          </div>
                          {log.notes && (
                            <div className="mt-2 p-3 bg-white/50 rounded-lg border border-black/5">
                              <div className="flex items-start gap-2">
                                <MessageCircleIcon
                                  size={14}
                                  className={`mt-0.5 shrink-0 text-${colorTheme}-500`}
                                />
                                <p className="text-xs text-zinc-600 leading-relaxed italic line-clamp-2">
                                  "{log.notes}"
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {allLogs.length > visibleCoachingLogs && (
                      <Button
                        variant="secondary"
                        fullWidth
                        onClick={() =>
                          setVisibleCoachingLogs((prev) => prev + 5)
                        }
                        className="!mt-4 !py-3 !text-[10px] !rounded-xl"
                      >
                        VOIR PLUS DE SÉANCES
                      </Button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </section>
      )}
      {memberTab === "coaching" &&
        getProductCapabilities(state.currentClub, state.user).aiAssistance
          .usable && (
          <section
            className="m360-coaching-tools space-y-8"
            hidden={desktop && coachingView !== "program"}
          >
            <details className="va-member-assistance">
              <summary className="va-assistance-heading flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-200 lg:border-indigo-200 bg-emerald-50 lg:bg-indigo-50 text-emerald-900 lg:text-indigo-900">
                  <BotIcon size={21} />
                </div>
                <span className="font-semibold">
                  Programmation, nutrition et outils IA
                </span>
              </summary>

              <div className="va-assistance-grid grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Feature 1: Auto Program */}
                <div className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 text-base font-semibold text-zinc-900">
                      <LayersIcon
                        size={17}
                        className="text-emerald-800 lg:text-indigo-800"
                      />{" "}
                      Programme sportif
                    </h4>
                    <p className="mb-5 text-sm leading-relaxed text-zinc-700">
                      Préparez un programme à partir des objectifs et du niveau
                      de l’adhérent, puis vérifiez-le avant de l’attribuer.
                    </p>
                  </div>
                  <div className="w-full space-y-2">
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={openAIGeneratorModal}
                      disabled={isGeneratingProgram}
                      className={`!min-h-11 !py-2.5 !text-sm !rounded-lg !border-emerald-200 lg:!border-indigo-200 !bg-emerald-50 lg:!bg-indigo-50 !text-emerald-950 lg:!text-indigo-950 hover:!bg-emerald-100 lg:hover:!bg-indigo-100 transition-colors ${isGeneratingProgram ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <SparklesIcon size={14} className="mr-2 inline" />
                      {isGeneratingProgram
                        ? "Génération en cours…"
                        : "Préparer avec l’IA"}
                    </Button>
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={() => setShowAssignProgramTemplateModal(true)}
                      className="!min-h-11 !py-2.5 !text-sm !rounded-lg !border-zinc-300 !bg-zinc-50 !text-zinc-800 hover:!bg-zinc-100 transition-colors"
                    >
                      <PlusIcon size={14} className="mr-2 inline" />
                      Attribuer un modèle
                    </Button>
                  </div>
                </div>

                {/* Feature 3: Auto Report */}
                <div
                  className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm ${isGeneratingReport ? "opacity-60 pointer-events-none" : ""}`}
                >
                  <h4 className="mb-2 flex items-center gap-2 text-base font-semibold text-zinc-900">
                    <BarChartIcon
                      size={17}
                      className="text-emerald-800 lg:text-indigo-800"
                    />{" "}
                    Rapport de progression
                  </h4>
                  <p className="mb-5 text-sm leading-relaxed text-zinc-700">
                    Préparez un bilan à partir du poids, des mensurations et des
                    performances de l’adhérent.
                  </p>

                  {generatedReport ? (
                    <div className="space-y-4 relative z-10">
                      <div className="bg-white border border-zinc-200 rounded-xl p-4 max-h-40 overflow-y-auto text-xs text-zinc-600 whitespace-pre-wrap">
                        {generatedReport}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="primary"
                          fullWidth
                          className="!min-h-11 !py-2.5 !text-sm !rounded-lg !bg-[#25D366] hover:!bg-[#128C7E] border-none !text-zinc-950 flex items-center justify-center gap-2"
                          onClick={() => {
                            const phone = selectedProfile.phone?.replace(
                              /\D/g,
                              "",
                            );
                            const url = phone
                              ? `https://wa.me/${phone}?text=${encodeURIComponent(generatedReport)}`
                              : `https://wa.me/?text=${encodeURIComponent(generatedReport)}`;
                            window.open(url, "_blank");
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                          Envoyer sur WhatsApp
                        </Button>
                        <Button
                          variant="secondary"
                          fullWidth
                          className="!min-h-11 !py-2.5 !text-sm !rounded-lg"
                          onClick={handleGenerateReport}
                          disabled={isGeneratingReport}
                        >
                          Régénérer le bilan
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      fullWidth
                      className="!min-h-11 !py-2.5 !text-sm !rounded-lg"
                      onClick={handleGenerateReport}
                      disabled={isGeneratingReport}
                    >
                      {isGeneratingReport ? "Génération…" : "Générer le bilan"}
                    </Button>
                  )}
                </div>

                {/* Feature 4: Stagnation Detection */}
                <div
                  className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm ${isDetectingStagnation ? "opacity-60 pointer-events-none" : ""}`}
                >
                  <h4 className="mb-2 flex items-center gap-2 text-base font-semibold text-zinc-900">
                    <TargetIcon
                      size={17}
                      className="text-emerald-800 lg:text-indigo-800"
                    />{" "}
                    Repérage d’un plateau
                  </h4>
                  <p className="mb-4 text-sm leading-relaxed text-zinc-700">
                    Analysez les dernières séances afin d’identifier un éventuel
                    ralentissement sur les exercices principaux.
                  </p>

                  {stagnationResult ? (
                    <div
                      className={`border rounded-xl p-3 flex flex-col gap-2 ${stagnationResult.hasStagnation ? "bg-red-500/10 border-red-500/20" : "bg-green-500/10 border-green-500/20"}`}
                    >
                      <span
                        className={`text-sm font-semibold ${stagnationResult.hasStagnation ? "text-red-800" : "text-emerald-900 lg:text-indigo-900"}`}
                      >
                        {stagnationResult.hasStagnation
                          ? "Stagnation détectée"
                          : "Progression OK"}
                      </span>
                      <p className="text-sm leading-relaxed text-zinc-700">
                        {stagnationResult.advice}
                      </p>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      fullWidth
                      className="!min-h-11 !py-2.5 !text-sm !rounded-lg"
                      onClick={handleDetectStagnation}
                      disabled={isDetectingStagnation}
                    >
                      {isDetectingStagnation
                        ? "Analyse en cours…"
                        : "Lancer l’analyse"}
                    </Button>
                  )}
                </div>
              </div>
            </details>
          </section>
        )}
    </>
  );
}
