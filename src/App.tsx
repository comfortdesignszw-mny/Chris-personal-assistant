import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import { startListening, stopListening, processCommand, speak, stopSpeaking } from './lib/assistant';
import { Mic, MicOff, Settings, Terminal, Activity, Menu } from 'lucide-react';
import { format } from 'date-fns';

export default function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const interactions = useLiveQuery(() => db.interactions.orderBy('timestamp').reverse().toArray()) || [];
  const files = useLiveQuery(() => db.localFiles.orderBy('createdAt').reverse().toArray()) || [];
  const reminders = useLiveQuery(() => db.reminders.filter(r => !r.completed).toArray()) || [];

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
      setIsListening(false);
      setTranscript('');
    } else {
      setIsListening(true);
      startListening(
        (text, isFinal) => {
          setTranscript(text);
          if (isFinal) {
            handleCommand(text);
            stopListening();
            setIsListening(false);
            setTranscript('');
          }
        },
        () => setIsListening(false)
      );
    }
  };

  const stopAll = () => {
    stopListening();
    stopSpeaking();
    setIsListening(false);
    setIsProcessing(false);
    setTranscript('');
  };

  const handleCommand = async (commandText: string) => {
    if (!commandText.trim()) return;
    setIsProcessing(true);
    try {
      const history = interactions.slice(0, 5).reverse().map(i => ({
        role: i.output ? 'model' : 'user',
        parts: [{text: i.output ? i.output : i.input}]
      }));
      
      const response = await processCommand(commandText, isOnline, history);
      
      // Update the db with output
      const latest = await db.interactions.orderBy('timestamp').last();
      if (latest && latest.id) {
        await db.interactions.update(latest.id, { output: response });
      }
      
      speak(response);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const safeFormat = (dateNum: number, fmt: string) => {
    try {
      return format(new Date(dateNum), fmt);
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-300 font-sans flex flex-col overflow-hidden selection:bg-cyan-500/30">
      <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-[0_0_15px_rgba(8,145,178,0.5)]">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Chris <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">v2.0</span>
            </h1>
            <p className="text-xs text-slate-500 font-mono flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></span>
              {isOnline ? 'CORE ONLINE' : 'LOCAL CACHE ACTIVE'}
            </p>
          </div>
        </div>
        <button className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white">
          <Menu className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <section className="flex-1 flex flex-col items-center justify-center relative p-8">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 via-[#0b0f19] to-[#0b0f19]"></div>

          <div className="w-full max-w-2xl text-center space-y-4 z-10 flex flex-col items-center">
            <p className="text-cyan-400 text-sm font-mono uppercase tracking-[0.2em] mb-2">
              {isListening ? "Listening..." : (isProcessing ? "PROCESSING NEURAL INPUT..." : "SYSTEM IDLE")}
            </p>
            
            <div className="h-32 overflow-y-auto flex flex-col justify-end w-full">
              {transcript ? (
                <h2 className="text-3xl font-light text-white leading-relaxed">
                  "{transcript}"
                </h2>
              ) : (
                 interactions.length > 0 && interactions[0].output && (
                   <h2 className="text-2xl font-light text-slate-300 leading-relaxed">
                     {interactions[0].output}
                   </h2>
                 )
              )}
            </div>

            <div className="flex justify-center gap-3 pt-6">
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400">STT {isListening ? "Active" : "Inactive"}</span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400">IndexedDB Synced</span>
            </div>
          </div>
        </section>

        <aside className="w-80 bg-[#0f172a]/40 border-l border-white/5 p-6 flex flex-col gap-6 backdrop-blur-xl overflow-y-auto">
          <h3 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Local Environment</h3>
          
          <div className="group bg-white/5 border border-white/10 rounded-2xl p-4 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[11px] font-bold text-cyan-500">ACTIVE REMINDERS</span>
              <span className="text-[10px] text-slate-400">{reminders.length}</span>
            </div>
            {reminders.length > 0 ? (
              <div className="space-y-3">
                {reminders.slice(0, 3).map((r, i) => (
                  <div key={i}>
                    <p className="text-sm text-white font-medium truncate">{r.title}</p>
                    <p className="text-xs text-slate-500 mt-1 italic">{safeFormat(r.dueTime, 'HH:mm')}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No active routines.</p>
            )}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[11px] font-bold text-indigo-400">LOCAL FILES</span>
              <button className="text-[10px] text-slate-400 underline">View All</button>
            </div>
            <div className="space-y-3">
              {files.length > 0 ? files.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-xs font-mono uppercase">{f.fileType || 'TXT'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{f.fileName}</p>
                    <p className="text-[10px] text-slate-500">{safeFormat(f.createdAt, 'MMM d, HH:mm')}</p>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-slate-500 italic">Sandbox empty.</p>
              )}
            </div>
          </div>

          <div className="mt-auto pt-4">
            <h3 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">System Logs</h3>
            <div className="space-y-2">
              {interactions.slice().reverse().slice(0, 3).map((interaction, i) => (
                 <div key={i} className="text-[10px] font-mono flex gap-2">
                   <span className="text-cyan-500">[{safeFormat(interaction.timestamp, 'HH:mm')}]</span>
                   <span className="text-slate-400 truncate w-48" title={interaction.input}>CMD: {interaction.input}</span>
                 </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      <footer className="h-20 bg-[#0b0f19] border-t border-white/5 flex items-center px-12 gap-8 z-20">
        <button onClick={handleMicToggle} className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${isListening ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-white'}`}>
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <button onClick={stopAll} className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all" title="Stop output">
          <Terminal className="w-4 h-4" />
        </button>
        <div className="flex-1 h-12 bg-white/5 rounded-full border border-white/10 flex items-center px-6 focus-within:border-cyan-500/50 focus-within:bg-white/10 transition-colors">
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Type a command to Chris..." 
            className="w-full bg-transparent border-none outline-none text-sm text-white placeholder-slate-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                handleCommand(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
          />
        </div>
      </footer>
    </div>
  );
}
