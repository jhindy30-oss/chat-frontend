'use client';
import { useEffect, useState, FormEvent, useRef } from 'react';
import { Send, Lock, UserCircle, ArrowLeft, MessageCircle, Loader2, LogOut, Check, CheckCheck } from 'lucide-react';
import { collection, doc, addDoc, onSnapshot, query, orderBy, serverTimestamp, setDoc, increment } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getMessaging, getToken } from 'firebase/messaging';

// IMPORTANT: Adjust this relative path if needed
import { db, auth } from '../firebase'; 

interface Guest {
  id: string;
  source: string;
  appLanguage?: 'en' | 'es' | 'ar' | 'ur';
  profile: { name: string; age: string; language: string; belief: string; };
  status: string;
  unreadByAdmin?: number;
  unreadByGuest?: number;
  guestTyping?: boolean;
}

interface Message {
  id: string;
  text: string;
  sender: 'guest' | 'admin';
  timestamp: any;
}

const formatTime = (timestamp: any) => {
  if (!timestamp) return '...';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const renderMessageText = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-85 break-all">
          {part}
        </a>
      );
    }
    return part;
  });
};

const getFlag = (lang?: string) => {
  if (lang === 'es') return '🇪🇸';
  if (lang === 'ar') return '🇸🇦';
  if (lang === 'ur') return '🇵🇰';
  return '🇺🇸';
};

export default function HostDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Dashboard states
  const [chats, setChats] = useState<Guest[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  
  // Guest Redirect State
  const [showGuestWarning, setShowGuestWarning] = useState(false);
  const [guestReturnLink, setGuestReturnLink] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousUnreadTotal = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Check for existing login session on load
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const savedGuestId = localStorage.getItem('hopeline_guest_id');
    if (savedGuestId) {
      setShowGuestWarning(true);
      setGuestReturnLink(`/connect/web?chat=${savedGuestId}`);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const q = query(collection(db, 'chats'), orderBy('lastMessageAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedChats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Guest[];
      setChats(fetchedChats);

      const totalUnread = fetchedChats.reduce((sum, chat) => sum + (chat.unreadByAdmin || 0), 0);
      document.title = totalUnread > 0 ? `(${totalUnread}) Hopeline` : 'Host Dashboard';

      if (totalUnread > previousUnreadTotal.current && previousUnreadTotal.current !== 0) {
        const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
        audio.volume = 0.5;
        audio.play().catch(() => {});
        
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          new Notification("New Message 👋", { body: "A guest has sent a new message." });
        }
      }
      previousUnreadTotal.current = totalUnread;
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!activeChat) return;

    setDoc(doc(db, 'chats', activeChat), { unreadByAdmin: 0 }, { merge: true });

    const q = query(collection(db, 'chats', activeChat, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Message, 'id'>) })));
      setDoc(doc(db, 'chats', activeChat), { unreadByAdmin: 0 }, { merge: true });
    });

    return () => unsubscribe();
  }, [activeChat]);

  const handleTyping = async () => {
    if (!activeChat) return;
    await setDoc(doc(db, 'chats', activeChat), { adminTyping: true }, { merge: true });
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(async () => {
      await setDoc(doc(db, 'chats', activeChat), { adminTyping: false }, { merge: true });
    }, 2000);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setIsAuthenticated(true);
    } catch (error: any) {
      alert('Login failed: Invalid email or password.');
      return; 
    }

    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const messaging = getMessaging();
          const token = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY });
          if (token) {
            await setDoc(doc(db, 'admin_tokens', token), { token, lastActive: serverTimestamp() });
          }
        }
      }
    } catch (notifyError: any) {
      console.error("Push Notification Setup Failed:", notifyError);
    }
  };

  const handleSignOut = () => signOut(auth);

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

    await setDoc(doc(db, 'chats', activeChat), { 
      status: 'active', 
      lastMessageAt: serverTimestamp(),
      unreadByGuest: increment(1),
      adminTyping: false
    }, { merge: true });
  };

  const currentGuest = chats.find(c => c.id === activeChat);

  if (isAuthLoading) {
    return <div className="h-[100dvh] bg-slate-50 flex items-center justify-center"><Loader2 className="animate-spin text-sky-500" size={48} /></div>;
  }

  if (!isAuthenticated) {
    if (showGuestWarning) {
      return (
        <div className="h-[100dvh] bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center border border-sky-100 w-full max-w-sm text-center">
            <div className="bg-sky-100 p-4 rounded-full mb-4 text-sky-600"><MessageCircle size={36} /></div>
            <h2 className="text-xl font-bold mb-2 text-gray-900">Active Chat Found</h2>
            <p className="text-sm text-gray-500 mb-6">It looks like you are currently talking with a friend.</p>
            <a href={guestReturnLink} className="w-full bg-sky-500 text-white p-3.5 rounded-xl font-bold text-sm hover:bg-sky-600 transition-colors shadow-sm block mb-4">Return to Chat ✨</a>
            <button onClick={() => setShowGuestWarning(false)} className="text-xs text-gray-400 hover:text-gray-600 underline">Admin Login</button>
          </div>
        </div>
      );
    }

    return (
      <div className="h-[100dvh] bg-slate-50 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center border border-sky-100 w-full max-w-sm">
          <div className="bg-sky-100 p-3 rounded-full mb-3 text-sky-600"><Lock size={32} /></div>
          <h2 className="text-xl font-bold mb-1 text-gray-900">Host Dashboard 💙</h2>
          <p className="text-xs text-gray-500 mb-6 text-center">Sign in to manage incoming guest conversations</p>
          <input type="email" name="email" id="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Admin Email 👤" className="w-full bg-gray-50 p-3 rounded-xl mb-3 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-gray-900" />
          <input type="password" name="password" id="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Password 🔒" className="w-full bg-gray-50 p-3 rounded-xl mb-5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-gray-900" />
          <button type="submit" className="w-full bg-sky-500 text-white p-3 rounded-xl font-bold text-sm hover:bg-sky-600 transition-colors shadow-sm">Sign In ✨</button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-slate-50 text-gray-900 overflow-hidden">
      
      {/* SIDEBAR */}
      <div className={`${activeChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 bg-white border-r border-gray-200 flex-col shrink-0 z-10`}>
        <div className="p-4 border-b border-gray-200 bg-slate-50/80 flex items-center justify-between">
          <h2 className="font-bold text-base text-gray-900">Active Threads 💬</h2>
          <span className="bg-sky-100 text-sky-700 text-xs font-bold px-2.5 py-0.5 rounded-full">{chats.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.map((guest) => {
            const isSelected = activeChat === guest.id;
            const isNew = guest.status === 'new';
            const hasUnread = (guest.unreadByAdmin || 0) > 0;
            const flag = getFlag(guest.appLanguage);
            
            return (
              <div key={guest.id} onClick={() => setActiveChat(guest.id)} className={`p-4 border-b border-gray-100 cursor-pointer transition-colors relative ${isSelected ? 'bg-sky-50/60 border-l-4 border-l-sky-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}>
                <div className="mb-1 flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${hasUnread || isNew ? 'font-bold text-black' : 'font-medium text-gray-700'}`}>{flag} {guest.profile?.name || 'Anonymous'}</p>
                    {isNew && <span className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm">New</span>}
                  </div>
                  {hasUnread && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">{guest.unreadByAdmin}</span>}
                </div>
                <p className={`text-xs truncate ${hasUnread ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                  {guest.guestTyping ? <span className="text-sky-500 italic">Typing... ✍</span> : ([guest.profile?.language, guest.profile?.belief].filter(Boolean).join(' • ') || 'No intake details')}
                </p>
              </div>
            );
          })}
        </div>
        {/* LOGOUT BUTTON */}
        <div className="p-4 border-t border-gray-200 bg-slate-50">
          <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 font-medium p-2.5 hover:bg-gray-200/50 rounded-xl transition-colors active:scale-95">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className={`${!activeChat ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-white h-full overflow-hidden`}>
        {!activeChat ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-slate-50 p-6">
            <UserCircle size={48} className="mb-2 stroke-1 text-slate-300" />
            <h3 className="text-base font-medium text-gray-600">Select a thread to view or reply 👀</h3>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="px-4 md:px-6 py-3.5 border-b border-gray-200 bg-slate-50/80 flex items-center shrink-0">
              <button onClick={() => setActiveChat(null)} className="md:hidden mr-3 text-gray-500 hover:text-gray-900 active:scale-95 transition-transform p-1">
                <ArrowLeft size={22} />
              </button>
              <div>
                <h2 className="font-bold text-base text-gray-900">{getFlag(currentGuest?.appLanguage)} {currentGuest?.profile?.name || 'Guest Thread'}</h2>
                <p className="text-xs text-gray-500">{[currentGuest?.profile?.age ? `${currentGuest?.profile.age} yrs` : null, currentGuest?.profile?.language, currentGuest?.profile?.belief].filter(Boolean).join(' • ')}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-[#f0f4f8]">
              {messages.map((msg) => {
                const isRTL = (currentGuest?.appLanguage === 'ar' || currentGuest?.appLanguage === 'ur') && msg.sender === 'guest';
                // If unreadByGuest is 0, it means they have seen all our admin messages
                const isRead = currentGuest?.unreadByGuest === 0;
                
                return (
                  <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div dir={isRTL ? 'rtl' : 'ltr'} className={`px-4 py-2.5 rounded-2xl max-w-[85%] md:max-w-[70%] text-sm leading-relaxed shadow-2xs break-words whitespace-pre-wrap select-text ${msg.sender === 'admin' ? 'bg-sky-500 text-white rounded-br-xs' : 'bg-white text-gray-900 border border-gray-200/80 rounded-bl-xs'}`}>
                      {renderMessageText(msg.text)}
                      <div className={`text-[10px] mt-1.5 flex items-center justify-end gap-1 ${msg.sender === 'admin' ? 'text-
