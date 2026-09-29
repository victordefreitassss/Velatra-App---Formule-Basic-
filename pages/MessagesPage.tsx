
import React, { useState, useRef, useEffect } from 'react';
import { AppState, Message, User } from '../types';
import { Card, Button, Input, Textarea } from '../components/UI';
import { MessageCircleIcon, PlusIcon, ChevronLeftIcon, FileIcon, DownloadIcon } from '../components/Icons';
import { apiFetch, db, doc, setDoc, addDoc, collection, updateDoc } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemberConversationViewport } from '../components/useMemberConversationViewport';

export const MessagesPage: React.FC<{ state: AppState, setState: any, showToast: any, embedded?: boolean, initialMemberId?: number }> = ({ state, setState, showToast, embedded, initialMemberId }) => {
  const [text, setText] = useState("");
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [searchContact, setSearchContact] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const user = state.user!;
  const [memberCoach, setMemberCoach] = useState<User | null>(null);
  const [memberCoachLoading, setMemberCoachLoading] = useState(user.role === 'member');
  const [memberCoachError, setMemberCoachError] = useState<string | null>(null);

  // A member contact is resolved by the server from Studio assignment or Solo ownership.
  const [selectedDest, setSelectedDest] = useState<number | null>(user.role === 'member' ? null : initialMemberId || null);

  useEffect(() => {
    if (user.role !== 'member' && initialMemberId) setSelectedDest(initialMemberId);
  }, [initialMemberId, user.role]);

  useEffect(() => {
    if (user.role !== 'member') return;
    let active = true;
    setMemberCoachLoading(true);
    apiFetch('/api/member/assigned-coach')
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Impossible de charger votre coach.");
        if (!active) return;
        if (result.coach) {
          const coach = result.coach as User;
          setMemberCoach(coach);
          setSelectedDest(Number(coach.id));
        } else {
          setMemberCoach(null);
          setSelectedDest(null);
        }
      })
      .catch(error => {
        if (!active) return;
        setMemberCoachError(error instanceof Error ? error.message : "Impossible de charger votre coach.");
      })
      .finally(() => {
        if (active) setMemberCoachLoading(false);
      });
    return () => { active = false; };
  }, [user.role, user.firebaseUid]);

  const contacts = (user.role === 'coach' || user.role === 'owner') 
    ? state.users.filter(u => u.role === 'member' && u.clubId === user.clubId &&
      (user.role === 'owner' || u.assignedCoachUid === user.firebaseUid) &&
      (!embedded || !initialMemberId || Number(u.id) === initialMemberId) && u.name.toLowerCase().includes(searchContact.toLowerCase()))
    : memberCoach ? [memberCoach] : [];
  const selectedContactAvailable = !embedded || !initialMemberId || contacts.some(contact => Number(contact.id) === Number(selectedDest));

  const conversationRef = useMemberConversationViewport(user.role === 'member' && !embedded && !memberCoachLoading && !!memberCoach);
  const thread = selectedContactAvailable ? state.messages.filter(m =>
    (m.from === user.id && m.to === selectedDest) || 
    (m.from === selectedDest && m.to === user.id)
  ).sort((a,b)=>a.date.localeCompare(b.date)) : [];

  useEffect(() => {
    const container=scrollRef.current?.parentElement;
    if(container) container.scrollTop=container.scrollHeight;
  }, [thread.length, selectedDest]);

  useEffect(() => {
    const unreadMessages = thread.filter(m => m.to === user.id && !m.read);
    if (unreadMessages.length > 0) {
      unreadMessages.forEach(async (m) => {
        try {
          await updateDoc(doc(db, "messages", m.id.toString()), { read: true });
        } catch (err) {
          console.error("Error marking message as read", err);
        }
      });
    }
  }, [thread, user.id]);

  if (user.role === 'member' && memberCoachLoading) {
    return <div className="va-member-page" role="status"><div className="h-12 rounded-xl bg-zinc-100"/><p className="text-sm text-zinc-700">Ouverture de votre conversation…</p></div>;
  }

  if (user.role === 'member' && !memberCoach) {
    return (
      <div className="va-member-page"><header><h1>Mon coach</h1></header><section className="va-member-empty"><MessageCircleIcon/><h2>{memberCoachError ? 'Conversation indisponible' : 'Votre coach arrive bientôt'}</h2><p>{memberCoachError || 'Le club doit vous attribuer un coach pour ouvrir votre conversation privée.'}</p><button className="va-member-primary" onClick={()=>setState((p:AppState)=>({...p,page:'about'}))}>Contacter mon club</button></section></div>
    );
  }

  const sendMessage = async () => {
    if ((!text && !fileData) || !selectedDest || !selectedContactAvailable) return;
    const messageId = Date.now().toString();
    const assignedCoachUid = user.role === 'member'
      ? (memberCoach?.role === 'coach' ? memberCoach.firebaseUid : undefined)
      : user.role === 'coach'
        ? user.firebaseUid
        : state.users.find(contact => contact.id === selectedDest)?.assignedCoachUid;
    const newMessage: Message = {
      id: Date.now(),
      clubId: user.clubId,
      ...(assignedCoachUid ? { assignedCoachUid } : {}),
      from: user.id,
      to: selectedDest,
      text: text || (fileData ? "Fichier joint" : ""),
      date: new Date().toISOString(),
      read: false,
      file: fileData
    };
    
    try {
      await setDoc(doc(db, "messages", messageId), newMessage);
      
      // Staff can create a recipient notification for an assigned member.
      // Member messages remain private and are delivered by the message listener.
      if (user.role !== 'member') {
        await addDoc(collection(db, 'notifications'), {
          clubId: user.clubId,
          ...(assignedCoachUid ? { assignedCoachUid } : {}),
          userId: selectedDest,
          title: 'Nouveau message',
          message: `Vous avez reçu un nouveau message de ${user.name}.`,
          type: 'info',
          read: false,
          createdAt: new Date().toISOString(),
          link: 'messages'
        });
      }

      setText("");
      setFileData(null);
      setFileName(null);
    } catch (err) {
      showToast("Message non envoyé. Votre texte est conservé ; réessayez.", "error");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 700 * 1024) {
        showToast("Fichier trop lourd (max 700Ko)", "error");
        return;
      }
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFileData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: any = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  if (embedded && initialMemberId && !selectedContactAvailable) {
    return <div role="status" className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-700">Conversation indisponible pour cet adhérent.</div>;
  }

  if ((user.role === 'coach' || user.role === 'owner') && !selectedDest) {
    return (
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 va-polish-page"
      >
        <motion.div variants={itemVariants} className="px-1">
          <h1 className="text-3xl font-display font-black tracking-tight text-zinc-900 leading-none mb-2">Discussion</h1>
          <p className="text-sm text-zinc-600">Échangez avec vos adhérents.</p>
        </motion.div>
        
        <motion.div variants={itemVariants} className="relative">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <Input 
            placeholder="Rechercher un membre…" aria-label="Rechercher un contact"
            className="pl-14 !bg-white backdrop-blur-xl !border-zinc-200/50 !rounded-2xl font-bold shadow-sm focus:!bg-white" 
            value={searchContact} 
            onChange={e => setSearchContact(e.target.value)} 
          />
        </motion.div>

        <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence>
            {contacts.map(c => {
              const unreadCount = state.messages.filter(m => m.from === c.id && m.to === user.id && !m.read).length;
              const lastMessage = state.messages.filter(m => (m.from === c.id && m.to === user.id) || (m.from === user.id && m.to === c.id)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
              
              return (
                <motion.div
                  key={c.id}
                  variants={itemVariants}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card onClick={() => setSelectedDest(c.id)} className="flex items-center gap-4 !p-4 bg-white backdrop-blur-xl border-zinc-200/50 hover:border-emerald-500/30 hover:shadow-md transition-all cursor-pointer shadow-sm">
                     <div className="relative">
                       <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-zinc-100/50 border border-zinc-200/50 flex items-center justify-center font-black text-lg text-emerald-500 shadow-inner backdrop-blur-md overflow-hidden">
                         {c.avatar?.startsWith('http') ? (
                           <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
                         ) : (
                           c.avatar || c.name.substring(0, 2).toUpperCase()
                         )}
                       </div>
                       {unreadCount > 0 && (
                         <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-zinc-900 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
                           {unreadCount}
                         </div>
                       )}
                     </div>
                     <div className="flex-1 min-w-0">
                       <div className="font-black text-zinc-900 truncate">{c.name}</div>
                       <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                         {lastMessage ? (lastMessage.from === user.id ? `Vous: ${lastMessage.text}` : lastMessage.text) : "Nouvelle conversation"}
                       </div>
                     </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {contacts.length === 0 && (
            <motion.div variants={itemVariants} className="col-span-full text-center py-12 text-zinc-500 text-sm bg-white rounded-3xl border border-zinc-200/50">
              <p className="font-semibold text-zinc-900">{searchContact ? 'Aucun contact trouvé' : 'Aucun adhérent à contacter'}</p>
              <p className="mt-2">{searchContact ? 'Essayez un autre nom.' : 'Ajoutez un adhérent pour commencer une conversation.'}</p>
              <Button variant="secondary" className="mx-auto mt-4" onClick={() => searchContact ? setSearchContact('') : setState((previous: AppState) => ({ ...previous, page: 'users', pendingUiAction: 'add-member' }))}>{searchContact ? 'Effacer la recherche' : 'Ajouter un adhérent'}</Button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    );
  }

  const dest = contacts.find(c => c.id === selectedDest);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      ref={conversationRef}
      className={`flex flex-col ${user.role === 'member' ? 'va-member-chat' : ''} ${embedded ? 'va-member-chat-embedded h-full' : 'va-message-thread'}`}
    >
      <header className="shrink-0 flex items-center gap-4 mb-6 pb-4 border-b border-zinc-200/50 bg-zinc-50 backdrop-blur-md p-4 rounded-2xl">
        {(user.role === 'coach' || user.role === 'owner') && (
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Retour aux conversations"
            onClick={() => setSelectedDest(null)} 
            className="text-zinc-500 hover:text-zinc-900 transition-colors bg-zinc-50 p-2 rounded-xl shadow-sm"
          >
            <ChevronLeftIcon size={24}/>
          </motion.button>
        )}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-lg font-black shadow-lg text-zinc-900 overflow-hidden">
          {dest?.avatar?.startsWith('http') ? (
            <img src={dest?.avatar} alt={dest?.name} className="w-full h-full object-cover" />
          ) : (
            dest?.avatar || dest?.name?.substring(0, 2).toUpperCase()
          )}
        </div>
        <div>
          <div className="font-semibold text-xl tracking-tight leading-tight text-zinc-900">{dest?.name}</div>
          <div className="text-xs text-zinc-600 mt-1">{user.role === 'member' ? 'Votre coach · conversation privée' : 'Conversation privée'}</div>
        </div>
      </header>

      <div className="va-chat-scroll flex-1 min-h-0 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {thread.length === 0 && <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center">
          <MessageCircleIcon size={26} className="mx-auto mb-3 text-emerald-800" />
          <h2 className="font-display text-xl font-semibold">Votre échange commence ici</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">Un retour sur la séance, une question ou un encouragement : écrivez votre premier message ci-dessous.</p>
        </div>}
        <AnimatePresence initial={false}>
          {thread.map(m => (
            <motion.div 
              key={m.id} 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${m.from === user.id ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`va-chat-bubble ${m.from === user.id ? 'is-mine' : ''} max-w-[80%] px-4 py-3 rounded-2xl text-sm shadow-sm backdrop-blur-md ${m.from === user.id ? 'bg-emerald-500/90 text-zinc-900 rounded-tr-none' : 'bg-zinc-100 border border-zinc-200/50 rounded-tl-none text-zinc-900'}`}>
                {m.text}
                {m.file && (
                  <div className={`mt-2 p-2 rounded-xl flex items-center gap-3 border ${m.from === user.id ? 'bg-zinc-50 border-zinc-400' : 'bg-white/50 border-zinc-200/50'}`}>
                    <FileIcon size={16} />
                    <span className="text-[10px] truncate flex-1 font-medium">Document joint</span>
                    <a aria-label="Télécharger le document joint" href={m.file} download="document" className={`p-1 transition-colors ${m.from === user.id ? 'hover:text-zinc-700' : 'hover:text-emerald-500'}`}>
                      <DownloadIcon size={14} />
                    </a>
                  </div>
                )}
                <div className={`va-chat-time text-[9px] mt-1 text-right font-medium ${m.from === user.id ? 'text-zinc-900/70' : 'text-zinc-500'}`}>
                  {new Date(m.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={scrollRef} />
      </div>

      {fileName && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 px-4 py-2 bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 rounded-xl flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500">
            <FileIcon size={14} /> {fileName}
          </div>
          <button aria-label="Retirer la pièce jointe" onClick={() => { setFileData(null); setFileName(null); }} className="text-zinc-500 hover:text-zinc-900 transition-colors">
            <PlusIcon size={14} className="rotate-45" />
          </button>
        </motion.div>
      )}

      <div className="va-chat-composer mt-4 shrink-0 flex gap-2 items-end bg-zinc-50 backdrop-blur-md p-2 rounded-2xl border border-zinc-200/50 shadow-sm">
        <label title="Joindre un fichier" className="p-3 bg-zinc-50 border border-zinc-200/50 rounded-xl cursor-pointer hover:bg-white transition-all text-zinc-500 hover:text-emerald-500 shadow-sm flex items-center justify-center shrink-0 h-[50px] w-[50px]">
          <PlusIcon size={20} />
          <input type="file" aria-label="Joindre un fichier PDF ou une image" className="sr-only" onChange={handleFileChange} accept=".pdf,image/*" />
        </label>
        <Textarea 
          placeholder="Écrivez votre message…" aria-label="Votre message"
          value={text} 
          onChange={e => setText(e.target.value)} 
          onKeyPress={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }} 
          className="!py-3 !bg-zinc-50 backdrop-blur-xl !border-zinc-200/50 shadow-inner focus:!bg-white min-h-[50px] max-h-[120px]" 
          rows={1}
        />
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="shrink-0 h-[50px] w-[50px]">
          <Button aria-label="Envoyer le message" onClick={sendMessage} disabled={!text.trim() && !fileData} className="!p-3 h-full w-full shadow-lg shadow-emerald-500/20 flex items-center justify-center">
            <MessageCircleIcon size={20} />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};
