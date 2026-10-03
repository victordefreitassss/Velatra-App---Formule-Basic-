import React from "react";
import {
  type Client360AdminSectionId,
  type Client360SectionId,
} from "../../components/client360";
import {
  EyeIcon,
  FileIcon,
  FileTextIcon,
  FolderIcon,
  Trash2Icon,
  UploadIcon,
} from "../../components/Icons";
import { Button } from "../../components/UI";
import { openDriveFile } from "../../services/driveAccess";
import { AppState, User } from "../../types";

interface Props {
  memberTab: Client360SectionId;
  adminSection: Client360AdminSectionId;
  officialDocumentCategory:
    | "Certificat médical"
    | "Formulaire d'inscription"
    | "Consentement parent"
    | "Pièce d'identité"
    | "Autre";
  setOfficialDocumentCategory: React.Dispatch<
    React.SetStateAction<
      | "Certificat médical"
      | "Formulaire d'inscription"
      | "Consentement parent"
      | "Pièce d'identité"
      | "Autre"
    >
  >;
  handleOfficialDocumentUpload: (files: FileList | null) => Promise<void>;
  isUploadingOfficialDocument: boolean;
  selectedProfile: User;
  state: AppState;
  handleDeleteOfficialDocument: (docId: string) => Promise<void>;
  handleDriveFileUpload: (files: FileList | null) => Promise<void>;
  isUploadingDriveFile: boolean;
  uploadProgress: number;
  showToast: any;
  setConfirmDeleteFileId: React.Dispatch<React.SetStateAction<string>>;
}

export function MemberDocuments({
  memberTab,
  adminSection,
  officialDocumentCategory,
  setOfficialDocumentCategory,
  handleOfficialDocumentUpload,
  isUploadingOfficialDocument,
  selectedProfile,
  state,
  handleDeleteOfficialDocument,
  handleDriveFileUpload,
  isUploadingDriveFile,
  uploadProgress,
  showToast,
  setConfirmDeleteFileId,
}: Props) {
  return (
    <>
      {memberTab === "administrative" && adminSection === "documents" && (
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
              <FolderIcon size={24} />
            </div>
            <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">
              Documents
            </h3>
          </div>

          {/* DOCUMENTS ADMINISTRATIFS */}
          <div className="bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-[40px] p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest">
                  Documents Administratifs
                </h4>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Certificats médicaux, formulaires d'inscription...
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={officialDocumentCategory}
                  onChange={(e) =>
                    setOfficialDocumentCategory(e.target.value as any)
                  }
                  className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-emerald-500 lg:focus:border-indigo-500 shrink-0"
                >
                  <option value="Certificat médical">Certificat médical</option>
                  <option value="Formulaire d'inscription">
                    Formulaire d'inscription
                  </option>
                  <option value="Consentement parent">
                    Consentement parent
                  </option>
                  <option value="Pièce d'identité">Pièce d'identité</option>
                  <option value="Autre">Autre</option>
                </select>
                <label className="cursor-pointer shrink-0">
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) =>
                      handleOfficialDocumentUpload(e.target.files)
                    }
                    disabled={isUploadingOfficialDocument}
                    accept="image/*,.pdf"
                  />
                  <Button
                    variant="secondary"
                    className="!py-2 !px-4 !text-[10px] !rounded-xl pointer-events-none"
                    disabled={isUploadingOfficialDocument}
                  >
                    {isUploadingOfficialDocument ? (
                      <span>...</span>
                    ) : (
                      <>
                        <UploadIcon size={14} className="mr-2 inline" />
                        IMPORTER
                      </>
                    )}
                  </Button>
                </label>
              </div>
            </div>

            <div className="space-y-3">
              {selectedProfile.documents &&
              selectedProfile.documents.length > 0 ? (
                selectedProfile.documents
                  .sort(
                    (a, b) =>
                      new Date(b.uploadDate).getTime() -
                      new Date(a.uploadDate).getTime(),
                  )
                  .map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-2xl hover:border-emerald-500/30 lg:hover:border-indigo-500/30 transition-colors shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-500/10 lg:bg-indigo-500/10 rounded-xl flex items-center justify-center text-emerald-500 lg:text-indigo-500 shadow-sm border border-emerald-500/20 lg:border-indigo-500/20">
                          <FileTextIcon size={20} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-zinc-900">
                            {doc.category}
                          </div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                            {doc.name} •{" "}
                            {new Date(doc.uploadDate).toLocaleDateString(
                              "fr-FR",
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-zinc-500 hover:text-emerald-500 lg:hover:text-indigo-500 hover:bg-emerald-500/10 lg:hover:bg-indigo-500/10 rounded-xl transition-colors"
                        >
                          <EyeIcon size={18} />
                        </a>
                        {state.user?.role !== "manager" && (
                          <button
                            onClick={() => handleDeleteOfficialDocument(doc.id)}
                            className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                          >
                            <Trash2Icon size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8 text-zinc-500 text-sm">
                  Aucun document administratif pour le moment.
                </div>
              )}
            </div>
          </div>

          {/* DOCUMENTS PARTAGÉS GÉNÉRIQUES */}
          <div className="bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-[40px] p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest">
                  Fichiers partagés
                </h4>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Vidéos, bilans PDF, historiques partagés...
                </p>
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(e) => handleDriveFileUpload(e.target.files)}
                  disabled={isUploadingDriveFile}
                />
                <Button
                  variant="secondary"
                  className="!py-2 !px-4 !text-[10px] !rounded-xl pointer-events-none"
                  disabled={isUploadingDriveFile}
                >
                  {isUploadingDriveFile ? (
                    <span>{Math.round(uploadProgress)}%</span>
                  ) : (
                    <>
                      <UploadIcon size={14} className="mr-2 inline" />
                      IMPORTER
                    </>
                  )}
                </Button>
              </label>
            </div>

            <div className="space-y-3">
              {state.driveFiles?.filter(
                (f) =>
                  f.clubId === state.user?.clubId &&
                  f.sharedWith?.includes(Number(selectedProfile.id)),
              ).length > 0 ? (
                state.driveFiles
                  .filter(
                    (f) =>
                      f.clubId === state.user?.clubId &&
                      f.sharedWith?.includes(Number(selectedProfile.id)),
                  )
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime(),
                  )
                  .map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-4 bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-2xl hover:border-blue-500/30 transition-colors shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-blue-500 shadow-sm border ">
                          <FileIcon size={20} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-zinc-900">
                            {file.name}
                          </div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                            {(file.size / 1024 / 1024).toFixed(2)} MB •{" "}
                            {new Date(file.createdAt).toLocaleDateString(
                              "fr-FR",
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            void openDriveFile(file).catch((error) =>
                              showToast(error.message, "error"),
                            );
                          }}
                          className="p-2 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-colors"
                        >
                          <EyeIcon size={18} />
                        </button>
                        {(state.user?.role !== "manager" ||
                          file.uploadedBy === state.user.id) && (
                          <button
                            onClick={() => setConfirmDeleteFileId(file.id)}
                            className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                          >
                            <Trash2Icon size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8 text-zinc-500 text-sm">
                  Aucun document partagé avec ce client.
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
