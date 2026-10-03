import React from "react";
import { type Client360SectionId } from "../../components/client360";
import { CoachFollowup } from "../../components/CoachingFollowup";
import { FileTextIcon, Trash2Icon } from "../../components/Icons";
import { Button } from "../../components/UI";
import { AppState, User } from "../../types";

interface Props {
  memberTab: Client360SectionId;
  selectedProfile: User;
  state: AppState;
  notesRef: React.MutableRefObject<HTMLTextAreaElement>;
  coachingNotes: string;
  setCoachingNotes: React.Dispatch<React.SetStateAction<string>>;
  coachingNoteDate: string;
  setCoachingNoteDate: React.Dispatch<React.SetStateAction<string>>;
  handleSaveCoachingNotes: () => Promise<void>;
  isSavingCoachingNotes: boolean;
  handleDeleteCoachingNote: (noteId: string) => Promise<void>;
}

export function MemberFollowup({
  memberTab,
  selectedProfile,
  state,
  notesRef,
  coachingNotes,
  setCoachingNotes,
  coachingNoteDate,
  setCoachingNoteDate,
  handleSaveCoachingNotes,
  isSavingCoachingNotes,
  handleDeleteCoachingNote,
}: Props) {
  return (
    <>
      {memberTab === "followup" && (
        <section className="va-client-360-followup space-y-6">
          {selectedProfile.firebaseUid && (
            <CoachFollowup
              memberUid={selectedProfile.firebaseUid}
              programs={[]}
              section="followup"
              actorRole={state.user?.role}
            />
          )}
          {/* NOTES DE SUIVI SECTION */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 mt-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200/60 pb-3">
              <div className="flex items-center gap-2">
                <FileTextIcon
                  size={20}
                  className="text-emerald-500 lg:text-indigo-500"
                />
                <h4 className="text-base font-semibold text-zinc-900">
                  Notes de suivi de l’adhérent
                </h4>
              </div>
              <span className="text-xs font-medium text-emerald-950 lg:text-indigo-950 bg-emerald-50 lg:bg-indigo-50 border border-emerald-200 lg:border-indigo-200 px-2.5 py-1 rounded-full">
                Coach
              </span>
            </div>
            <p className="text-sm text-zinc-700 leading-normal">
              Utilisez cet espace pour noter les forces, faiblesses, ressentis,
              et adaptations pour {selectedProfile.name}.
            </p>
            <textarea
              ref={notesRef}
              onFocus={(event) => {
                const field = event.currentTarget;
                requestAnimationFrame(() =>
                  field.scrollIntoView({ block: "center" }),
                );
              }}
              value={coachingNotes}
              onChange={(e) => setCoachingNotes(e.target.value)}
              placeholder="Saisissez une note de suivi…"
              className="w-full h-24 bg-white border border-zinc-300 rounded-xl p-4 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-emerald-800 lg:focus:border-indigo-800 focus:ring-2 focus:ring-emerald-800/20 lg:focus:ring-indigo-800/20 transition-colors resize-y shadow-sm"
            />
            <div className="va-client-360-note-footer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-700">
                  Date de la note
                </span>
                <input
                  type="date"
                  value={coachingNoteDate}
                  onChange={(e) => setCoachingNoteDate(e.target.value)}
                  className="bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-zinc-800 outline-none focus:border-emerald-500 lg:focus:border-indigo-500 cursor-pointer shadow-sm"
                />
              </div>
              <Button
                variant="success"
                onClick={handleSaveCoachingNotes}
                disabled={isSavingCoachingNotes}
                className="va-client-360-save-note !min-h-11 !py-2.5 !px-6 !text-sm w-full sm:w-auto"
              >
                {isSavingCoachingNotes ? "Enregistrement…" : "Ajouter la note"}
              </Button>
            </div>

            {/* HISTORIQUE DES NOTES */}
            <div className="pt-6 border-t border-zinc-200/60 space-y-4">
              <h5 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
                <FileTextIcon
                  size={16}
                  className="text-emerald-800 lg:text-indigo-800"
                />{" "}
                Notes enregistrées (
                {(selectedProfile.coachingNotesHistory || []).length})
              </h5>

              {/* Legacy note or default display if history is empty but notes string is not empty */}
              {(!selectedProfile.coachingNotesHistory ||
                selectedProfile.coachingNotesHistory.length === 0) &&
                selectedProfile.notes && (
                  <div className="bg-white border border-zinc-200 rounded-2xl p-4 text-xs shadow-sm flex justify-between items-start">
                    <div className="space-y-1 w-full">
                      <p className="text-zinc-700 text-xs font-medium">
                        Note globale existante
                      </p>
                      <p className="text-zinc-800 whitespace-pre-wrap font-medium">
                        {selectedProfile.notes}
                      </p>
                    </div>
                  </div>
                )}

              {selectedProfile.coachingNotesHistory &&
              selectedProfile.coachingNotesHistory.length > 0 ? (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {selectedProfile.coachingNotesHistory.map((note) => (
                    <div
                      key={note.id}
                      className="bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl p-4 text-xs shadow-sm space-y-2 relative group transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-700 bg-zinc-100 px-2 py-1 rounded-md">
                          {new Date(note.date).toLocaleString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <button
                          onClick={() => handleDeleteCoachingNote(note.id)}
                          className="text-zinc-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors"
                          title="Supprimer la note"
                        >
                          <Trash2Icon size={14} />
                        </button>
                      </div>
                      <p className="text-xs text-zinc-500">
                        {note.authorName || "Auteur non renseigné"}
                      </p>
                      <p className="text-zinc-800 leading-relaxed font-semibold whitespace-pre-wrap">
                        {note.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                !selectedProfile.notes && (
                  <div className="text-center py-6 bg-zinc-100/50 border border-dashed border-zinc-200 rounded-2xl">
                    <p className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
                      Aucune note enregistrée pour le moment.
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
