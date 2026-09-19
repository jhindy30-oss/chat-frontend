'use client';
import { useEffect, useState, FormEvent, useRef } from 'react';
import { Send, Lock, HeartHandshake, UserCircle } from 'lucide-react';
import { collection, doc, addDoc, onSnapshot, query, orderBy, serverTimestamp, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';

// IMPORTANT: Adjust this relative path if needed to match where your firebase.ts lives
import { db, auth } from '../firebase'; 

interface Guest {
  id: string;
  source: string;
  profile: { name: string; age: string; language: string; belief: string; };
  status: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'guest' | 'admin';
}

export default function HostDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [chats, setChats] = useState<Guest[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  
  const chatListLengthRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages in active thread
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  // Global Inbox Listener
  useEffect(() => {
    if (!isAuthenticated) return;

    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, orderBy('lastMessageAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedChats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Guest[];
      
      setChats(fetchedChats);

      if (fetchedChats.length > chatListLengthRef.current && chatListLengthRef.current !== 0) {
        const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
        audio.volume = 0.5;
        audio.play().catch(() => console.log('Audio blocked'));

        if (Notification.permission === "granted") {
          new Notification("New Hopeline Request", { body: "A new guest has submitted an intake form." });
        }
      }
      chatListLengthRef.current = fetchedChats.length;
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Active Chat Listener
  useEffect(() => {
    if (!activeChat) return;

    const messagesRef = collection(db, 'chats', activeChat, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Message, 'id'>)
      }));
      setMessages(fetchedMessages);
    });

    return () => unsubscribe();
  }, [activeChat]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setIsAuthenticated(true);
    } catch (error: any) {
      alert('Login failed: Invalid email or password.');
    }
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeChat) return;

    const textToSave = input;
    setInput('');

    await addDoc(collection(db, 'chats', activeChat, 'messages'), {
      text: textToSave,
      sender: 'admin',
      timestamp: serverTimestamp()
    });

    await setDoc(doc(db, 'chats', activeChat), { lastMessageAt: serverTimestamp() }, { merge: true });
  };

  const currentGuest = chats.find(c => c.id === activeChat);

  if (!isAuthenticated) {
    return (
      <div className="h-[100dvh] bg-slate-100 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center border border-gray-200/80 w-full max-w-sm">
          <div className="bg-slate-100 p-3 rounded-full mb-3 text-slate-800">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-bold mb-1 text-gray-900">Host Dashboard</h2>
          <p className="text-xs text-gray-500 mb-6 text-center">Sign in to manage incoming guest conversations</p>
          <input 
            type="email" 
            required 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            placeholder="Admin Email" 
            className="w-full bg-gray-50 p-3 rounded-xl mb-3 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900" 
          />
          <input 
            type="password" 
            required 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            placeholder="Password" 
            className="w-full bg-gray-50 p-3 rounded-xl mb-5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900" 
          />
          <button type="submit" className="w-full bg-teal-600 text-white p-3 rounded-xl font-bold text-sm hover:bg-teal-700 transition-colors shadow-sm">
            Sign In
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-slate-100 text-gray-900 overflow-hidden">
      {/* Sidebar Queue */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0 z-10">
        <div className="p-4 border-b border-gray-200 bg-slate-50/80 flex items-center justify-between">
          <h2 className="font-bold text-base text-gray-900">Active Threads</h2>
          <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
            {chats.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.map((guest) => {
            const isSelected = activeChat === guest.id;
            return (
              <div 
                key={guest.id} 
                onClick={() => setActiveChat(guest.id)}
                className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                  isSelected 
                    ? 'bg-teal-50/60 border-l-4 border-l-teal-600' 
                    : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                }`}
              >
                <div className="mb-1 flex justify-between items-start">
                  <p className="font-bold text-sm text-gray-900">{guest.profile?.name || 'Anonymous'}</p>
                  {guest.profile?.age && (
                    <span className="text-[11px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded">
                      {guest.profile.age}y
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {[guest.profile?.language, guest.profile?.belief].filter(Boolean).join(' • ') || 'No intake details'}
                </p>
              </div>
            );
          })}
          {chats.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              <p className="text-sm">Inbox is empty.</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col bg-white h-full overflow-hidden">
        {!activeChat ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-slate-50 p-6">
            <UserCircle size={48} className="mb-2 stroke-1 text-slate-300" />
            <h3 className="text-base font-medium text-gray-600">Select a thread to view or reply</h3>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="px-6 py-3.5 border-b border-gray-200 bg-slate-50/80 flex items-center justify-between shrink-0">
              <div>
                <h2 className="font-bold text-base text-gray-900">{currentGuest?.profile?.name || 'Guest Thread'}</h2>
                <p className="text-xs text-gray-500">
                  {[
                    currentGuest?.profile?.age ? `${currentGuest.profile.age} years old` : null,
                    currentGuest?.profile?.language,
                    currentGuest?.profile?.belief,
                    `Source: ${currentGuest?.source || 'web-link'}`
                  ].filter(Boolean).join(' • ')}
                </p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-[#e5ddd5]/20">
              {messages.map((msg) => {
                const isAdmin = msg.sender === 'admin';
                return (
                  <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      className={`px-4 py-2.5 rounded-2xl max-w-[70%] text-sm leading-relaxed shadow-2xs break-words ${
                        isAdmin 
                          ? 'bg-slate-900 text-white rounded-br-xs' 
                          : 'bg-white text-gray-900 border border-gray-200/80 rounded-bl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-200 flex items-center gap-3 shrink-0">
              <input 
                type="text" 
                placeholder="Type your response..." 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                className="flex-1 bg-gray-100 border border-gray-200 rounded-full px-5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 placeholder-gray-400" 
              />
              <button 
                type="submit" 
                disabled={!input.trim()}
                className="bg-slate-900 text-white p-2.5 rounded-full hover:bg-black disabled:opacity-40 transition-all shrink-0 active:scale-95 shadow-sm"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
