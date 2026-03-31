
import React, { useState, useRef, useEffect } from 'react';
import { AppState, Message } from '../types';
import { Card, Button, Input } from '../components/UI';
import { MessageCircleIcon, PlusIcon, ChevronLeftIcon, FileIcon, DownloadIcon } from '../components/Icons';
import { db, doc, setDoc, addDoc, collection } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';

export const MessagesPage: React.FC<{ state: AppState, setState: any, showToast: any, embedded?: boolean }> = ({ state, setState, showToast, embedded }) => {
  const [text, setText] = useState("");
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [searchContact, setSearchContact] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const user = state.user!;

  // Pour le coach : selectionner un destinataire
  const [selectedDest, setSelectedDest] = useState<number | null>(user.role === 'member' ? (state.users.find(u => u.role === 'coach' || u.role === 'owner')?.id || null) : null);

  const contacts = (user.role === 'coach' || user.role === 'owner') 
    ? state.users.filter(u => u.role === 'member' && u.name.toLowerCase().includes(searchContact.toLowerCase())) 
    : state.users.filter(u => u.role === 'coach' || u.role === 'owner');

  const thread = state.messages.filter(m => 
    (m.from === user.id && m.to === selectedDest) || 
    (m.from === selectedDest && m.to === user.id)
  );

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  const sendMessage = async () => {
    if ((!text && !fileData) || !selectedDest) return;
    const messageId = Date.now().toString();
    const newMessage: Message = {
      id: Date.now(),
      clubId: user.clubId,
      from: user.id,
      to: selectedDest,
      text: text || (fileData ? "Fichier joint" : ""),
      date: new Date().toISOString(),
      read: false,
      file: fileData
    };
    
    try {
      await setDoc(doc(db, "messages", messageId), newMessage);
      
      // Create notification for the recipient
      await addDoc(collection(db, 'notifications'), {
        clubId: user.clubId,
        userId: selectedDest,
        title: 'Nouveau message',
        message: `Vous avez reçu un nouveau message de ${user.name}.`,
        type: 'info',
        read: false,
        createdAt: new Date().toISOString(),
        link: 'messages'
      });

      setText("");
      setFileData(null);
      setFileName(null);
    } catch (err) {
      showToast("Erreur d'envoi", "error");
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

  if ((user.role === 'coach' || user.role === 'owner') && !selectedDest) {
    return (
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 flex-1 h-full overflow-y-auto min-h-0"
      >
        <motion.div variants={itemVariants} className="px-1">
          <h1 className="text-3xl font-display font-black tracking-tight text-zinc-900 leading-none mb-2">Discussion</h1>
          <p className="text-[10px] text-velatra-accent font-bold uppercase tracking-[3px]">Messagerie avec vos membres</p>
        </motion.div>
        
        <motion.div variants={itemVariants} className="relative">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <Input 
            placeholder="Rechercher un membre..." 
            className="pl-14 !bg-white/60 backdrop-blur-xl ! !rounded-2xl font-bold shadow-sm focus:!bg-white" 
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
                  <Card onClick={() => setSelectedDest(c.id)} className="flex items-center gap-3 md:gap-4 !p-3 md:!p-4 bg-white/60 backdrop-blur-xl  hover:border-velatra-accent/30 hover:shadow-md transition-all cursor-pointer shadow-sm">
                     <div className="relative">
                       <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-velatra-accent/20 to-zinc-100/50 border  flex items-center justify-center font-black text-base md:text-lg text-velatra-accent shadow-inner backdrop-blur-md">
                         {c.avatar}
                       </div>
                       {unreadCount > 0 && (
                         <div className="absolute -top-1 -right-1 w-5 h-5 bg-velatra-accent text-zinc-900 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
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
            <motion.div variants={itemVariants} className="col-span-full text-center py-12 text-zinc-500 text-sm italic bg-white/40 backdrop-blur-md rounded-3xl border ">
              Aucun membre à contacter pour le moment.
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
      className={`flex flex-col min-h-0 overflow-hidden ${embedded ? 'h-full' : 'flex-1 h-full'}`}
    >
      <header className="flex items-center gap-3 md:gap-4 mb-3 pb-3 md:mb-6 md:pb-4 border-b  bg-white/40 backdrop-blur-md p-3 md:p-4 rounded-t-2xl md:rounded-t-3xl -mx-3 -mt-3 md:-mx-4 md:-mt-4">
        {(user.role === 'coach' || user.role === 'owner') && (
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSelectedDest(null)} 
            className="text-zinc-500 hover:text-zinc-900 transition-colors bg-white/60 p-1.5 md:p-2 rounded-xl shadow-sm"
          >
            <ChevronLeftIcon size={20} className="md:w-6 md:h-6" />
          </motion.button>
        )}
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-velatra-accent to-velatra-accentDark flex items-center justify-center text-base md:text-lg font-black shadow-lg text-zinc-900">{dest?.avatar}</div>
        <div>
          <div className="font-black text-lg md:text-xl uppercase italic tracking-tight leading-none text-zinc-900">{dest?.name}</div>
          <div className="text-[10px] text-velatra-accent font-bold uppercase tracking-widest mt-1">En ligne</div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        <AnimatePresence initial={false}>
          {thread.map(m => (
            <motion.div 
              key={m.id} 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${m.from === user.id ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] md:max-w-[80%] px-2.5 py-1.5 md:px-4 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-sm shadow-sm backdrop-blur-md ${m.from === user.id ? 'bg-velatra-accent/90 text-zinc-900 rounded-tr-none' : 'bg-white/80 border  rounded-tl-none text-zinc-900'}`}>
                {m.text}
                {m.file && (
                  <div className={`mt-2 p-2 rounded-xl flex items-center gap-3 border ${m.from === user.id ? 'bg-white/20 border-white/30' : 'bg-zinc-50/50 '}`}>
                    <FileIcon size={16} />
                    <span className="text-[10px] truncate flex-1 font-medium">Document joint</span>
                    <a href={m.file} download="document" className={`p-1 transition-colors ${m.from === user.id ? 'hover:text-zinc-800' : 'hover:text-velatra-accent'}`}>
                      <DownloadIcon size={14} />
                    </a>
                  </div>
                )}
                <div className={`text-[9px] mt-1 text-right font-medium ${m.from === user.id ? 'text-zinc-900/70' : 'text-zinc-400'}`}>
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
          className="mb-2 px-4 py-2 bg-velatra-accent/10 backdrop-blur-md border border-velatra-accent/20 rounded-xl flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-2 text-[10px] font-bold text-velatra-accent">
            <FileIcon size={14} /> {fileName}
          </div>
          <button onClick={() => { setFileData(null); setFileName(null); }} className="text-zinc-500 hover:text-zinc-900 transition-colors">
            <PlusIcon size={14} className="rotate-45" />
          </button>
        </motion.div>
      )}

      <div className="mt-2 md:mt-4 flex gap-1.5 md:gap-2 bg-white/40 backdrop-blur-md p-1 md:p-2 rounded-xl md:rounded-2xl border  shadow-sm">
        <label className="p-1.5 md:p-3 bg-white/60 border  rounded-lg md:rounded-xl cursor-pointer hover:bg-white transition-all text-zinc-500 hover:text-velatra-accent shadow-sm flex items-center justify-center">
          <PlusIcon size={18} className="md:w-5 md:h-5" />
          <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,image/*" />
        </label>
        <Input 
          placeholder="Message..." 
          value={text} 
          onChange={e => setText(e.target.value)} 
          onKeyPress={e => e.key === 'Enter' && sendMessage()} 
          className="!py-1.5 md:!py-3 text-xs md:text-sm !bg-white/60 backdrop-blur-xl ! shadow-inner focus:!bg-white" 
        />
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button onClick={sendMessage} className="!p-1.5 md:!p-3 h-full shadow-lg shadow-velatra-accent/20">
            <MessageCircleIcon size={16} className="md:w-5 md:h-5" />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};
