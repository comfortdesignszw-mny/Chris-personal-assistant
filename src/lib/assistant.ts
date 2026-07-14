import { db } from '../db/db';

let recognition: any = null;
try {
  if ('webkitSpeechRecognition' in window) {
    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
  }
} catch (e) {
  console.error("Failed to initialize speech recognition:", e);
}

let synth: SpeechSynthesis | null = null;
try {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    synth = window.speechSynthesis;
  }
} catch (e) {
  console.error("Speech synthesis not available:", e);
}

export const speak = (text: string) => {
  if (!synth) return;
  if (synth.speaking) {
    synth.cancel();
  }
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = synth.getVoices();
  const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Siri')) || voices[0];
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }
  utterance.rate = 1.1;
  synth.speak(utterance);
};

export const stopSpeaking = () => {
  if (synth && synth.speaking) synth.cancel();
};

export const startListening = (onResult: (transcript: string, isFinal: boolean) => void, onEnd: () => void) => {
  if (!recognition) return;
  
  recognition.onresult = (event: any) => {
    let interimTranscript = '';
    let finalTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }
    
    if (finalTranscript) {
      onResult(finalTranscript, true);
    } else if (interimTranscript) {
      onResult(interimTranscript, false);
    }
  };

  recognition.onerror = (event: any) => {
    console.error('Speech recognition error', event.error);
  };

  recognition.onend = () => {
    onEnd();
  };

  try {
    recognition.start();
  } catch(e) {
    console.error(e);
  }
};

export const stopListening = () => {
  if (recognition) recognition.stop();
};

export const processCommand = async (command: string, isOnline: boolean, history: any[] = []): Promise<string> => {
  await db.interactions.add({
    timestamp: Date.now(),
    input: command,
    output: '',
    syncStatus: isOnline ? 'synced' : 'pending'
  });

  if (!isOnline) {
    return processOfflineCommand(command);
  }

  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: command, history })
    });
    
    if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
    }

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    let outputText = data.text;

    // Optional tool execution logic can go here if needed.
    return outputText;
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return "I'm having trouble connecting to my core processor. Let me try processing that locally. " + await processOfflineCommand(command);
  }
};

const processOfflineCommand = async (command: string): Promise<string> => {
  const lower = command.toLowerCase();
  
  if (lower.includes('create file') || lower.includes('new file')) {
    const match = lower.match(/file (.*) with text (.*)/);
    if (match) {
      await db.localFiles.add({
        fileName: match[1].trim(),
        fileType: 'txt',
        content: match[2].trim(),
        createdAt: Date.now()
      });
      return `Local file created: ${match[1].trim()}.`;
    }
    return "I can create a file, but I need a name and content. Try: 'Create file notes.txt with text hello'.";
  }

  if (lower.includes('remind me')) {
    const title = lower.replace('remind me to', '').trim();
    await db.reminders.add({
      title: title,
      dueTime: Date.now() + 3600000, // 1 hour default
      completed: false
    });
    return `I'll remind you to ${title}.`;
  }

  return "I'm currently offline. I can manage local files and reminders until connection is restored.";
};
