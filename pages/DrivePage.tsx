import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { AppState, DriveFile, DriveFolder } from '../types';
import { FolderIcon, DownloadIcon, PlusIcon, FileIcon, Trash2Icon, ShareIcon, EyeIcon, ArrowLeftIcon, UploadIcon, XIcon } from '../components/Icons';
import { Button, Input } from '../components/UI';
import { db, storage } from '../firebase';
import { collection, doc, setDoc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-50 border border-zinc-200 rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-zinc-200">
          <h3 className="text-xl font-bold text-zinc-900">{title}</h3>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors">
            <XIcon size={20} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export const DrivePage: React.FC<{ state: AppState }> = ({ state }) => {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [shareModalFile, setShareModalFile] = useState<DriveFile | null>(null);
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFolder = currentFolderId 
    ? state.driveFolders.find(f => f.id === currentFolderId)
    : null;

  const isCoach = state.user?.role === 'coach' || state.user?.role === 'owner' || state.user?.role === 'superadmin';

  const folders = isCoach ? state.driveFolders.filter(f => f.parentId === currentFolderId) : [];
  const files = state.driveFiles.filter(f => {
    if (isCoach) return f.folderId === currentFolderId;
    return f.sharedWith.includes(state.user!.id);
  });

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !state.currentClub?.id) return;

    const folderId = doc(collection(db, 'driveFolders')).id;
    const newFolder: DriveFolder = {
      id: folderId,
      clubId: state.currentClub.id,
      name: newFolderName.trim(),
      parentId: currentFolderId,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'driveFolders', folderId), newFolder);
      setIsCreateFolderModalOpen(false);
      setNewFolderName('');
    } catch (error) {
      console.error("Error creating folder:", error);
      alert("Erreur lors de la création du dossier.");
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !state.currentClub?.id || !state.user) return;

    setIsUploading(true);
    setUploadProgress(0);

    const totalFiles = files.length;
    const fileProgresses = new Array(totalFiles).fill(0);

    const uploadPromises = Array.from(files).map((file, index) => {
      return new Promise<void>((resolve, reject) => {
        const fileId = doc(collection(db, 'driveFiles')).id;
        const storageRef = ref(storage, `drive/${state.currentClub!.id}/${fileId}_${file.name}`);
        
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            fileProgresses[index] = progress;
            const overallProgress = fileProgresses.reduce((a, b) => a + b, 0) / totalFiles;
            setUploadProgress(overallProgress);
          }, 
          (error) => {
            console.error("Error uploading file:", error);
            reject(error);
          }, 
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              
              const newFile: DriveFile = {
                id: fileId,
                clubId: state.currentClub!.id,
                name: file.name,
                url: downloadURL,
                path: uploadTask.snapshot.ref.fullPath,
                size: file.size,
                type: file.type,
                folderId: currentFolderId,
                uploadedBy: state.user!.id,
                createdAt: new Date().toISOString(),
                sharedWith: [],
              };

              await setDoc(doc(db, 'driveFiles', fileId), newFile);
              
              fileProgresses[index] = 100;
              const overallProgress = fileProgresses.reduce((a, b) => a + b, 0) / totalFiles;
              setUploadProgress(overallProgress);
              resolve();
            } catch (err) {
              reject(err);
            }
          }
        );
      });
    });

    try {
      await Promise.all(uploadPromises);
    } catch (error) {
      alert("Erreur lors de l'importation de certains fichiers.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const [confirmDeleteFileId, setConfirmDeleteFileId] = useState<string | null>(null);
  const [confirmDeleteFolderId, setConfirmDeleteFolderId] = useState<string | null>(null);

  const handleDeleteFile = async (file: DriveFile) => {
    setConfirmDeleteFileId(file.id);
  };

  const confirmDeleteFile = async () => {
    if (!confirmDeleteFileId) return;
    const file = state.driveFiles.find(f => f.id === confirmDeleteFileId);
    if (!file) return;

    try {
      const storageRef = ref(storage, file.path);
      await deleteObject(storageRef);
      await deleteDoc(doc(db, 'driveFiles', file.id));
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Erreur lors de la suppression du fichier.");
    } finally {
      setConfirmDeleteFileId(null);
    }
  };

  const handleDeleteFolder = async (folder: DriveFolder) => {
    setConfirmDeleteFolderId(folder.id);
  };

  const confirmDeleteFolder = async () => {
    if (!confirmDeleteFolderId) return;
    const folder = state.driveFolders.find(f => f.id === confirmDeleteFolderId);
    if (!folder) return;

    try {
      await deleteDoc(doc(db, 'driveFolders', folder.id));
    } catch (error) {
      console.error("Error deleting folder:", error);
      alert("Erreur lors de la suppression du dossier.");
    } finally {
      setConfirmDeleteFolderId(null);
    }
  };

  const handleShareFile = async () => {
    if (!shareModalFile) return;

    try {
      await updateDoc(doc(db, 'driveFiles', shareModalFile.id), {
        sharedWith: selectedClients
      });

      // Create notifications for newly shared clients
      const newClients = selectedClients.filter(c => !shareModalFile.sharedWith.includes(c));
      for (const clientId of newClients) {
        await addDoc(collection(db, 'notifications'), {
          clubId: state.currentClub?.id,
          userId: clientId,
          title: 'Nouveau fichier partagé',
          message: `Le fichier "${shareModalFile.name}" a été partagé avec vous.`,
          type: 'info',
          read: false,
          createdAt: new Date().toISOString(),
          link: 'drive'
        });
      }

      setShareModalFile(null);
      setSelectedClients([]);
    } catch (error) {
      console.error("Error sharing file:", error);
      alert("Erreur lors du partage du fichier.");
    }
  };

  const toggleClientSelection = (clientId: number) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const clients = state.users.filter(u => u.role === 'member');

  return (
    <div 
      className={`p-6 max-w-6xl mx-auto animate-in fade-in duration-300 min-h-[calc(100vh-4rem)] ${isDragging ? 'bg-emerald-500/10 border-2 border-dashed border-emerald-500 rounded-3xl' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            {currentFolderId && (
              <button 
                onClick={() => setCurrentFolderId(currentFolder?.parentId || null)}
                className="p-2 text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <ArrowLeftIcon size={20} />
              </button>
            )}
            <h1 className="text-3xl font-black tracking-tight text-zinc-900">
              {currentFolder ? currentFolder.name : 'Drive Intégré'}
            </h1>
          </div>
          <p className="text-zinc-500 mt-1">Stockez et partagez vos documents (PDF, guides, etc).</p>
        </div>
        <div className="flex gap-3">
          {isCoach && (
            <>
              <Button variant="secondary" className="!rounded-full shadow-sm" onClick={() => setIsCreateFolderModalOpen(true)}>
                <PlusIcon size={18} className="mr-2" />
                Nouveau dossier
              </Button>
              <label className="cursor-pointer">
                <input 
                  type="file" 
                  className="hidden" 
                  multiple 
                  onChange={(e) => handleFileUpload(e.target.files)}
                  ref={fileInputRef}
                  disabled={isUploading}
                />
                <Button className="!rounded-full shadow-md pointer-events-none" disabled={isUploading}>
                  {isUploading ? (
                    <span>{Math.round(uploadProgress)}%</span>
                  ) : (
                    <>
                      <UploadIcon size={18} className="mr-2" />
                      Importer
                    </>
                  )}
                </Button>
              </label>
            </>
          )}
        </div>
      </div>

      {folders.length === 0 && files.length === 0 && !isUploading ? (
        <div className="bg-zinc-50/50 rounded-3xl p-12 text-center border border-zinc-200 shadow-sm">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <FolderIcon size={40} />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">Ce dossier est vide</h2>
          <p className="text-zinc-500 max-w-md mx-auto mb-8">
            Importez vos PDF, guides nutritionnels, et autres documents pour les partager facilement avec vos clients.
          </p>
        </div>
      ) : (
        <div className="bg-zinc-50/50 rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 text-sm text-zinc-500">
                <th className="p-4 font-medium">Nom</th>
                <th className="p-4 font-medium">Taille</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {folders.map(folder => (
                <tr key={folder.id} className="border-b border-zinc-900 hover:bg-white transition-colors group cursor-pointer" onClick={() => setCurrentFolderId(folder.id)}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                        <FolderIcon size={20} />
                      </div>
                      <span className="font-medium text-zinc-900">{folder.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-zinc-500 text-sm">-</td>
                  <td className="p-4 text-zinc-500 text-sm">
                    {new Date(folder.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }}
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2Icon size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {files.map(file => (
                <tr key={file.id} className="border-b border-zinc-900 hover:bg-white transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <FileIcon size={20} />
                      </div>
                      <div>
                        <span className="font-medium text-zinc-900 block">{file.name}</span>
                        {file.sharedWith.length > 0 && (
                          <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full mt-1 inline-block">
                            Partagé avec {file.sharedWith.length} client(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-zinc-500 text-sm">{formatFileSize(file.size)}</td>
                  <td className="p-4 text-zinc-500 text-sm">
                    {new Date(file.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a 
                        href={file.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                        title="Voir"
                      >
                        <EyeIcon size={18} />
                      </a>
                      {isCoach && (
                        <>
                          <button 
                            onClick={() => {
                              setShareModalFile(file);
                              setSelectedClients(file.sharedWith || []);
                            }}
                            className="p-2 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                            title="Partager"
                          >
                            <ShareIcon size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteFile(file)}
                            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2Icon size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Folder Modal */}
      <Modal isOpen={isCreateFolderModalOpen} onClose={() => setIsCreateFolderModalOpen(false)} title="Nouveau dossier">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1">Nom du dossier</label>
            <Input 
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Ex: Guides Nutrition"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsCreateFolderModalOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>Créer</Button>
          </div>
        </div>
      </Modal>

      {/* Share File Modal */}
      <Modal isOpen={!!shareModalFile} onClose={() => setShareModalFile(null)} title="Partager le fichier">
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">
            Sélectionnez les clients avec qui vous souhaitez partager <strong className="text-zinc-900">{shareModalFile?.name}</strong>.
          </p>
          
          <div className="max-h-60 overflow-y-auto border border-zinc-200 rounded-xl divide-y divide-white/10">
            {clients.map(client => (
              <label key={client.id} className="flex items-center gap-3 p-3 hover:bg-white cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={selectedClients.includes(client.id)}
                  onChange={() => toggleClientSelection(client.id)}
                  className="w-4 h-4 text-emerald-500 rounded border-zinc-300 bg-zinc-50 focus:ring-emerald-500"
                />
                <div className="flex items-center gap-3">
                  {client.avatar?.startsWith('http') ? (
                    <img src={client.avatar} alt={client.name} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-medium text-sm">
                      {client.avatar || client.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium text-zinc-900">{client.name}</span>
                </div>
              </label>
            ))}
            {clients.length === 0 && (
              <div className="p-4 text-center text-zinc-500 text-sm">
                Aucun client disponible.
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShareModalFile(null)}>Annuler</Button>
            <Button onClick={handleShareFile}>Enregistrer</Button>
          </div>
        </div>
      </Modal>

      {confirmDeleteFileId && createPortal(
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-50 border border-zinc-200 rounded-3xl p-6 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-xl font-black text-zinc-900 mb-2">Supprimer le fichier ?</h3>
            <p className="text-zinc-500 mb-6">Êtes-vous sûr de vouloir supprimer ce fichier ?</p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setConfirmDeleteFileId(null)}>Non, garder</Button>
              <Button variant="danger" fullWidth onClick={confirmDeleteFile}>Oui, supprimer</Button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {confirmDeleteFolderId && createPortal(
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-50 border border-zinc-200 rounded-3xl p-6 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-xl font-black text-zinc-900 mb-2">Supprimer le dossier ?</h3>
            <p className="text-zinc-500 mb-6">Êtes-vous sûr de vouloir supprimer ce dossier et tout son contenu ?</p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setConfirmDeleteFolderId(null)}>Non, garder</Button>
              <Button variant="danger" fullWidth onClick={confirmDeleteFolder}>Oui, supprimer</Button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
};
