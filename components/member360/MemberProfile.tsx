import {
  type Client360AdminSectionId,
  type Client360SectionId,
} from "../../components/client360";
import { MessageCircleIcon } from "../../components/Icons";
import { Button } from "../../components/UI";
import { db, doc, updateDoc } from "../../firebase";
import { resolveAccountType } from "../../productCapabilities";
import {
  AppState,
  BodyData,
  Performance,
  Program,
  Subscription,
  User,
} from "../../types";

interface Props {
  memberTab: Client360SectionId;
  adminSection: Client360AdminSectionId;
  selectedProfile: User;
  assignedCoach: User;
  state: AppState;
  handleCopyLoginLink: () => Promise<void>;
  handleResetMemberPassword: () => Promise<void>;
  isSendingAccessEmail: boolean;
  stats: {
    perfs: Performance[];
    body: BodyData[];
    program: Program;
    totalSpent: number;
    memberOrders: import("../../types").SupplementOrder[];
    subscription: Subscription;
  };
  handleEditProgram: (member: User) => void;
}

export function MemberProfile({
  memberTab,
  adminSection,
  selectedProfile,
  assignedCoach,
  state,
  handleCopyLoginLink,
  handleResetMemberPassword,
  isSendingAccessEmail,
  stats,
  handleEditProgram,
}: Props) {
  return (
    <>
      {memberTab === "administrative" && adminSection === "profile" && (
        <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">
            Profil Adhérent
          </h3>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
            <h4 className="text-base font-semibold text-zinc-900">
              Accès Velatra
            </h4>
            <p className="mt-2 break-all text-sm text-zinc-700">
              Email : {selectedProfile.email || "Non renseigné"}
            </p>
            <p className="mt-1 text-sm text-zinc-700">
              Référent :{" "}
              {assignedCoach?.name ||
                (resolveAccountType(state.currentClub) === "studio"
                  ? "Coach à attribuer"
                  : "Indisponible")}
            </p>
            <p className="mt-1 text-sm text-zinc-700">
              Lien de connexion : {window.location.origin}/login
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopyLoginLink}
                className="min-h-11 rounded-lg border border-zinc-300 px-3 text-sm font-semibold text-zinc-900 focus-visible:ring-2 focus-visible:ring-emerald-800 lg:focus-visible:ring-indigo-800"
              >
                Copier le lien de connexion
              </button>
              <button
                type="button"
                onClick={handleResetMemberPassword}
                disabled={!selectedProfile.email || isSendingAccessEmail}
                aria-busy={isSendingAccessEmail}
                className="min-h-11 rounded-lg border border-emerald-700 lg:border-indigo-700 px-3 text-sm font-semibold text-emerald-900 lg:text-indigo-900 focus-visible:ring-2 focus-visible:ring-emerald-800 lg:focus-visible:ring-indigo-800 disabled:opacity-50"
              >
                {isSendingAccessEmail ? "Envoi…" : "Renvoyer l’email d’accès"}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile & Notes */}
            <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl space-y-4 shadow-sm">
              <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest text-emerald-500 lg:text-indigo-500">
                Profil & Objectifs
              </h3>

              {(selectedProfile.email || selectedProfile.phone) && (
                <div className="space-y-3 mb-6 pb-4 border-b ">
                  {selectedProfile.email && (
                    <div>
                      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                        Email
                      </div>
                      <div className="text-sm font-bold text-zinc-900">
                        {selectedProfile.email}
                      </div>
                    </div>
                  )}
                  {selectedProfile.phone && (
                    <div>
                      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                        Téléphone
                      </div>
                      <div className="text-sm font-bold text-zinc-900">
                        {selectedProfile.phone}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedProfile.address && (
                <p className="text-sm text-zinc-600">
                  Adresse : {selectedProfile.address}
                </p>
              )}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                    Âge
                  </div>
                  <div className="text-sm font-bold text-zinc-900">
                    {selectedProfile.profileMeasurementsPending
                      ? "À compléter"
                      : `${selectedProfile.age} ans`}
                  </div>
                </div>
                {selectedProfile.birthDate && (
                  <div>
                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                      Date de naissance
                    </div>
                    <div className="text-sm font-bold text-zinc-900">
                      {new Date(selectedProfile.birthDate).toLocaleDateString()}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                    Sexe
                  </div>
                  <div className="text-sm font-bold text-zinc-900">
                    {selectedProfile.profileMeasurementsPending
                      ? "À compléter"
                      : selectedProfile.gender === "M"
                        ? "Homme"
                        : selectedProfile.gender === "F"
                          ? "Femme"
                          : "Autre"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                    Taille
                  </div>
                  <div className="text-sm font-bold text-zinc-900">
                    {selectedProfile.profileMeasurementsPending
                      ? "À compléter"
                      : `${selectedProfile.height} cm`}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                    Poids Initial
                  </div>
                  <div className="text-sm font-bold text-zinc-900">
                    {selectedProfile.profileMeasurementsPending
                      ? "À compléter"
                      : `${selectedProfile.weight} kg`}
                  </div>
                </div>
              </div>
              {selectedProfile.objectifs &&
                selectedProfile.objectifs.length > 0 && (
                  <div>
                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                      Objectifs
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfile.objectifs.map((obj, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-full text-[9px] font-bold text-zinc-900 uppercase tracking-wider shadow-sm"
                        >
                          {obj}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            {selectedProfile.notes && (
              <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl space-y-2 shadow-sm">
                <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest text-emerald-500 lg:text-indigo-500">
                  Notes d'Inscription
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed italic">
                  "{selectedProfile.notes}"
                </p>
              </div>
            )}

            {/* Remarks Display */}
            {stats.program?.memberRemarks && (
              <div className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-3xl space-y-3">
                <div className="flex items-center gap-2 text-orange-500">
                  <MessageCircleIcon size={18} />
                  <span className="text-xs font-black uppercase text-zinc-500 tracking-wider">
                    Feedback Adhérent
                  </span>
                </div>
                <p className="text-sm font-bold text-zinc-900 italic leading-relaxed">
                  "{stats.program.memberRemarks}"
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1 !py-2 !text-[9px] !rounded-xl !bg-zinc-50 \!backdrop-blur-xl \!border-zinc-200 !text-zinc-900 hover:!bg-white shadow-sm"
                    onClick={async () => {
                      if (stats.program) {
                        try {
                          await updateDoc(
                            doc(db, "programs", stats.program.id.toString()),
                            { memberRemarks: "" },
                          );
                          // No need to update local state manually as onSnapshot will handle it,
                          // but for immediate UI feedback we might want to refresh stats if they are derived from state
                        } catch (err) {
                          console.error("Error clearing memberRemarks:", err);
                        }
                      }
                    }}
                  >
                    MARQUER COMME TRAITÉ
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1 !py-2 !text-[9px] !rounded-xl"
                    onClick={() => handleEditProgram(selectedProfile)}
                  >
                    ADAPTER LE PLAN
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
