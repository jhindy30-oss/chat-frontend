'use client';
import { useEffect, useState, FormEvent, useRef } from 'react';
import { Send, HeartHandshake, Loader2 } from 'lucide-react';

// IMPORTANT: Ensure this path matches where your firebase.ts is located
import { db } from '../../firebase'; 
import { collection, doc, setDoc, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';

interface Message {
  id: string;
  text: string;
  sender: 'guest' | 'admin';
}

export default function GuestScanner({ params }: { params: { source: string } }) {
  const [guestId, setGuestId] = useState<string | null>(null);
  const [profile, setProfile] = useState({ name: '', age: '', language: '', belief: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 1. Check for returning guests
  useEffect(() => {
    const savedId = localStorage.getItem('hopeline_guest_id');
    if (savedId) {
      setGuestId(savedId);
      setIsSubmitted(true);
    }
    setLoading(false);
  }, []);

  // 2. Listen to Firestore messages once an ID exists
  useEffect(() => {
    if (!guestId || !isSubmitted) return;

    const messagesRef = collection(db, 'chats', guestId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Message, 'id'>)
      }));
      setMessages(fetchedMessages);
    });

    return () => unsubscribe();
  }, [guestId, isSubmitted]);

  const joinQueue = async (e: FormEvent) => {
    e.preventDefault();
    
    try {
      const newId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : Date.now().toString();
      
      localStorage.setItem('hopeline_guest_id', newId);
      setGuestId(newId);
      
      await setDoc(doc(db, 'chats', newId), {
        source: params?.source || 'web-link',
        profile,
        status: 'active',
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp()
      });
      
      setIsSubmitted(true);
    } catch (error: any) {
      alert("Database Error: " + error.message);
    }
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !guestId) return;
    
    const textToSave = input;
    setInput('');

    await addDoc(collection(db, 'chats', guestId, 'messages'), {
      text: textToSave,
      sender: 'guest',
      timestamp: serverTimestamp()
    });

    await setDoc(doc(db, 'chats', guestId), { lastMessageAt: serverTimestamp() }, { merge: true });
  };

  if (loading) {
     return <div className="h-[100dvh] bg-teal-50 flex items-center justify-center"><Loader2 className="animate-spin text-teal-600" size={48} /></div>;
  }

  // Intake Form
  if (!isSubmitted) {
    return (
      <div className="h-[100dvh] bg-teal-50 flex items-center justify-center p-4">
        <form onSubmit={joinQueue} className="bg-white p-6 rounded-3xl w-full max-w-md shadow-xl space-y-4 border border-teal-100">
          <div className="flex flex-col items-center mb-4">
            <div className="bg-teal-100 p-3 rounded-full mb-2 text-teal-600">
              <HeartHandshake size={28} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Welcome to Hopeline</h2>
            <p className="text-gray-500 text-xs mt-1 text-center">We are here for you. Share a few details to get started.</p>
          </div>
          <input required type="text" placeholder="Name or Nickname" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full bg-gray-50 p-3.5 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none text-gray-800 border border-gray-200" />
          <input required type="number" placeholder="Age" value={profile.age} onChange={e => setProfile({...profile, age: e.target.value})} className="w-full bg-gray-50 p-3.5 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none text-gray-800 border border-gray-200" />
          <input required type="text" placeholder="Preferred Language" value={profile.language} onChange={e => setProfile({...profile, language: e.target.value})} className="w-full bg-gray-50 p-3.5 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none text-gray-800 border border-gray-200" />
          <input required type="text" placeholder="Belief System" value={profile.belief} onChange={e => setProfile({...profile, belief: e.target.value})} className="w-full bg-gray-50 p-3.5 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none text-gray-800 border border-gray-200" />
          <button type="submit" className="w-full bg-teal-600 p-3.5 rounded-xl font-bold text-white hover:bg-teal-700 transition-colors mt-4 shadow-md text-sm">
            Connect to Someone
          </button>
        </form>
      </div>
    );
  }

  // Active Chat Screen
  return (
    <div className="flex flex-col h-[100dvh] bg-slate-100 overflow-hidden select-none">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-200 shadow-sm flex items-center gap-3 shrink-0 z-10">
        <div className="bg-teal-600 text-white p-2 rounded-full flex items-center justify-center">
          <HeartHandshake size={20} />
        </div>
        <div>
          <h1 className="font-bold text-base text-gray-900 leading-tight">Hopeline Support</h1>
          <p className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active Advocate
          </p>
        </div>
      </div>
      
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#e5ddd5]/30">
        <div className="text-center my-2">
          <span className="bg-white/80 border border-gray-200/60 text-gray-500 text-[11px] px-3 py-1 rounded-full font-medium shadow-2xs">
            Messages are secure and encrypted
          </span>
        </div>

        {messages.map((msg) => {
          const isGuest = msg.sender === 'guest';
          return (
            <div key={msg.id} className={`flex ${isGuest ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`px-4 py-2.5 rounded-2xl max-w-[82%] text-sm leading-relaxed shadow-2xs break-words ${
                  isGuest 
                    ? 'bg-teal-600 text-white rounded-br-xs' 
                    : 'bg-white text-gray-800 border border-gray-200/80 rounded-bl-xs'
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Bottom Input Area */}
      <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-200 flex items-center gap-2 shrink-0 shadow-lg">
        <input 
          type="text" 
          placeholder="Type a message..." 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          className="flex-1 bg-gray-100 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 placeholder-gray-400" 
        />
        <button 
          type="submit" 
          disabled={!input.trim()}
          className="bg-teal-600 text-white p-2.5 rounded-full hover:bg-teal-700 disabled:opacity-40 disabled:hover:bg-teal-600 transition-all shrink-0 active:scale-95 shadow-sm"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
