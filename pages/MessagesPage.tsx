
import React, { useState, useRef, useEffect } from 'react';
import { AppState, Message } from '../types';
import { Card, Button, Input } from '../components/UI';
import { MessageCircleIcon, PlusIcon, ChevronLeftIcon, FileIcon, DownloadIcon } from '../components/Icons';
import { db, doc, setDoc } from '../firebase';

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
      if (file.size > 2 * 1024 * 1024) {
        showToast("Fichier trop lourd (max 2Mo)", "error");
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

  if ((user.role === 'coach' || user.role === 'owner') && !selectedDest) {
    return (
      <div className="space-y-6 page-transition pb-20">
        <div className="px-1">
          <h1 className="text-3xl font-display font-black tracking-tight text-zinc-900 leading-none mb-2">Discussion</h1>
          <p className="text-[10px] text-velatra-accent font-bold uppercase tracking-[3px]">Messagerie avec vos membres</p>
        </div>
        
        <div className="relative">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-900">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <Input 
            placeholder="Rechercher un membre..." 
            className="pl-14 !bg-zinc-50 !border-zinc-200 !rounded-2xl font-bold" 
            value={searchContact} 
            onChange={e => setSearchContact(e.target.value)} 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {contacts.map(c => {
            const unreadCount = state.messages.filter(m => m.from === c.id && m.to === user.id && !m.read).length;
            const lastMessage = state.messages.filter(m => (m.from === c.id && m.to === user.id) || (m.from === user.id && m.to === c.id)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            
            return (
              <Card key={c.id} onClick={() => setSelectedDest(c.id)} className="flex items-center gap-4 !p-4 bg-zinc-50 border-zinc-200 hover:border-velatra-accent/30 transition-all cursor-pointer">
                 <div className="relative">
                   <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-velatra-accent/20 to-zinc-100 border border-zinc-200 flex items-center justify-center font-black text-lg text-velatra-accent shadow-inner">
                     {c.avatar}
                   </div>
                   {unreadCount > 0 && (
                     <div className="absolute -top-1 -right-1 w-5 h-5 bg-velatra-accent text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-zinc-200 shadow-lg animate-pulse">
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
            );
          })}
          {contacts.length === 0 && (
            <div className="col-span-full text-center py-12 text-zinc-500 text-sm italic">
              Aucun membre à contacter pour le moment.
            </div>
          )}
        </div>
      </div>
    );
  }

  const dest = contacts.find(c => c.id === selectedDest);

  return (
    <div className={`flex flex-col ${embedded ? 'h-full' : 'h-[calc(100vh-160px)] md:h-[calc(100vh-100px)]'}`}>
      <header className="flex items-center gap-4 mb-6 pb-4 border-b border-zinc-200">
        {(user.role === 'coach' || user.role === 'owner') && <button onClick={() => setSelectedDest(null)} className="text-zinc-500 hover:text-zinc-900 transition-colors"><ChevronLeftIcon size={24}/></button>}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-velatra-accent to-velatra-accentDark flex items-center justify-center text-lg font-black shadow-lg">{dest?.avatar}</div>
        <div>
          <div className="font-black text-xl uppercase italic tracking-tight leading-none">{dest?.name}</div>
          <div className="text-[10px] text-zinc-900 font-bold uppercase tracking-widest mt-1">En ligne</div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {thread.map(m => (
          <div key={m.id} className={`flex ${m.from === user.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${m.from === user.id ? 'bg-velatra-accent text-white rounded-tr-none' : 'bg-velatra-bgLight border border-velatra-border rounded-tl-none'}`}>
              {m.text}
              {m.file && (
                <div className="mt-2 p-2 bg-zinc-50 rounded-xl flex items-center gap-3 border border-zinc-200">
                  <FileIcon size={16} />
                  <span className="text-[10px] truncate flex-1">Document joint</span>
                  <a href={m.file} download="document" className="p-1 hover:text-velatra-accent transition-colors">
                    <DownloadIcon size={14} />
                  </a>
                </div>
              )}
              <div className="text-[9px] opacity-40 mt-1 text-right">{new Date(m.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {fileName && (
        <div className="mb-2 px-4 py-2 bg-velatra-accent/10 border border-velatra-accent/20 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-velatra-accent">
            <FileIcon size={14} /> {fileName}
          </div>
          <button onClick={() => { setFileData(null); setFileName(null); }} className="text-zinc-500 hover:text-zinc-900">
            <PlusIcon size={14} className="rotate-45" />
          </button>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <label className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-100 transition-all text-zinc-500 hover:text-zinc-900">
          <PlusIcon size={20} />
          <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,image/*" />
        </label>
        <Input placeholder="Message..." value={text} onChange={e => setText(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMessage()} className="!py-3 !bg-zinc-50 !border-none" />
        <Button onClick={sendMessage} className="!p-3"><MessageCircleIcon size={20} /></Button>
      </div>
    </div>
  );
};
