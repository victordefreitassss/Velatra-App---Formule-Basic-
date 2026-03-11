
import React, { useState, useRef, useEffect } from 'react';
import { AppState, Message } from '../types';
import { Card, Button, Input } from '../components/UI';
import { MessageCircleIcon, PlusIcon, ChevronLeftIcon, FileIcon, DownloadIcon } from '../components/Icons';
import { db, doc, setDoc } from '../firebase';

export const MessagesPage: React.FC<{ state: AppState, setState: any, showToast: any }> = ({ state, setState, showToast }) => {
  const [text, setText] = useState("");
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const user = state.user!;

  // Pour le coach : selectionner un destinataire
  const [selectedDest, setSelectedDest] = useState<number | null>(user.role === 'member' ? 1 : null);

  const contacts = (user.role === 'coach' || user.role === 'owner') 
    ? state.users.filter(u => u.role === 'member') 
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
      <div className="space-y-4">
        <h1 className="text-2xl font-black">Messages</h1>
        <div className="space-y-2">
          {contacts.map(c => (
            <Card key={c.id} onClick={() => setSelectedDest(c.id)} className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-full bg-velatra-bg flex items-center justify-center font-bold">{c.avatar}</div>
               <div className="font-bold">{c.name}</div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const dest = contacts.find(c => c.id === selectedDest);

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] md:h-[calc(100vh-100px)]">
      <header className="flex items-center gap-4 mb-6 pb-4 border-b border-white/5">
        {(user.role === 'coach' || user.role === 'owner') && <button onClick={() => setSelectedDest(null)} className="text-velatra-textDark hover:text-white transition-colors"><ChevronLeftIcon size={24}/></button>}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-velatra-accent to-velatra-accentDark flex items-center justify-center text-lg font-black shadow-lg">{dest?.avatar}</div>
        <div>
          <div className="font-black text-xl uppercase italic tracking-tight leading-none">{dest?.name}</div>
          <div className="text-[10px] text-velatra-textDark font-bold uppercase tracking-widest mt-1">En ligne</div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {thread.map(m => (
          <div key={m.id} className={`flex ${m.from === user.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${m.from === user.id ? 'bg-velatra-accent text-white rounded-tr-none' : 'bg-velatra-bgLight border border-velatra-border rounded-tl-none'}`}>
              {m.text}
              {m.file && (
                <div className="mt-2 p-2 bg-black/20 rounded-xl flex items-center gap-3 border border-white/10">
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
          <button onClick={() => { setFileData(null); setFileName(null); }} className="text-velatra-textDark hover:text-white">
            <PlusIcon size={14} className="rotate-45" />
          </button>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <label className="p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-all text-velatra-textDark hover:text-white">
          <PlusIcon size={20} />
          <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,image/*" />
        </label>
        <Input placeholder="Message..." value={text} onChange={e => setText(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMessage()} />
        <Button onClick={sendMessage} className="!p-3"><MessageCircleIcon size={20} /></Button>
      </div>
    </div>
  );
};
