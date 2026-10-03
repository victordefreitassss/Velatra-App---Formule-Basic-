import React from "react";
import { type Client360SectionId } from "../../components/client360";
import { CheckIcon, FileTextIcon, PlusIcon } from "../../components/Icons";
import { Button } from "../../components/UI";
import { AppState, User } from "../../types";
const ClientNutritionView = React.lazy(() =>
  import("../MemberNutritionView").then((module) => ({
    default: module.MemberNutritionView,
  })),
);

interface Props {
  memberTab: Client360SectionId;
  isGeneratingNutrition: boolean;
  state: AppState;
  selectedProfile: User;
  setNutritionPlan: React.Dispatch<any>;
  setShowNutritionLog: React.Dispatch<React.SetStateAction<boolean>>;
  openNutritionTargetsModal: () => void;
  setShowAssignNutritionTemplateModal: React.Dispatch<
    React.SetStateAction<boolean>
  >;
  showToast: any;
}

export function MemberNutrition({
  memberTab,
  isGeneratingNutrition,
  state,
  selectedProfile,
  setNutritionPlan,
  setShowNutritionLog,
  openNutritionTargetsModal,
  setShowAssignNutritionTemplateModal,
  showToast,
}: Props) {
  return (
    <>
      {memberTab === "nutrition" && (
        <section className="space-y-6">
          <h3 className="text-xl font-semibold text-zinc-900">
            Nutrition et journal quotidien
          </h3>
          <div className="va-client-360-nutrition-tools grid gap-4">
            {/* Feature 2: Nutrition Plan */}
            <div
              className={`flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm ${isGeneratingNutrition ? "opacity-60 pointer-events-none" : ""}`}
            >
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-base font-semibold text-zinc-900">
                  <CheckIcon
                    size={17}
                    className="text-emerald-800 lg:text-indigo-800"
                  />{" "}
                  Plan alimentaire
                </h4>
                <p className="mb-5 text-sm leading-relaxed text-zinc-700">
                  Consultez le plan et le suivi existants, ajustez les objectifs
                  ou préparez une nouvelle proposition.
                </p>
              </div>
              <div className="space-y-2">
                {state.nutritionPlans?.find(
                  (p) =>
                    p.clubId === state.user?.clubId &&
                    p.memberId === Number(selectedProfile.id),
                ) && (
                  <Button
                    variant="primary"
                    fullWidth
                    className="!min-h-11 !py-2.5 !text-sm !rounded-lg"
                    onClick={() =>
                      setNutritionPlan(
                        state.nutritionPlans?.find(
                          (p) =>
                            p.clubId === state.user?.clubId &&
                            p.memberId === Number(selectedProfile.id),
                        ),
                      )
                    }
                  >
                    Voir le plan actuel
                  </Button>
                )}
                <Button
                  variant="secondary"
                  fullWidth
                  className="!min-h-11 !py-2.5 !text-sm !rounded-lg"
                  onClick={() => setShowNutritionLog(true)}
                >
                  Voir le suivi journalier
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  className="!min-h-11 !py-2.5 !text-sm !rounded-lg"
                  onClick={openNutritionTargetsModal}
                  disabled={isGeneratingNutrition}
                >
                  {isGeneratingNutrition
                    ? "Création en cours…"
                    : state.nutritionPlans?.find(
                          (p) =>
                            p.clubId === state.user?.clubId &&
                            p.memberId === Number(selectedProfile.id),
                        )
                      ? "Régénérer le plan"
                      : "Générer le plan"}
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  className="!min-h-11 !py-2.5 !text-sm !rounded-lg !bg-zinc-50 !text-zinc-800 hover:!bg-zinc-100 transition-colors"
                  onClick={() => setShowAssignNutritionTemplateModal(true)}
                >
                  <PlusIcon size={14} className="mr-2 inline" /> Attribuer un
                  modèle
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-6 bg-zinc-50 border border-zinc-200 rounded-[32px] p-6 sm:p-8 animate-in fade-in duration-300">
            <div>
              <h4 className="text-sm font-black text-zinc-950 uppercase tracking-widest mb-1 flex items-center gap-2">
                <FileTextIcon
                  size={18}
                  className="text-emerald-500 lg:text-indigo-500"
                />{" "}
                Journaux Biométriques & Alimentation
              </h4>
              <p className="text-[11px] text-zinc-500 leading-normal">
                Consultez et complétez les relevés nutritionnels quotidiens,
                l'apport en eau, le sommeil et le poids du membre pour optimiser
                son suivi de près.
              </p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-2xl p-2 sm:p-6 shadow-inner">
              <React.Suspense
                fallback={
                  <p role="status" className="p-5 text-sm text-zinc-700">
                    Ouverture du journal nutritionnel…
                  </p>
                }
              >
                <ClientNutritionView
                  state={state}
                  showToast={showToast}
                  memberId={Number(selectedProfile.id)}
                  readOnly={false}
                />
              </React.Suspense>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
