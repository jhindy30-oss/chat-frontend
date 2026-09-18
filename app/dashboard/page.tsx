'use client';
import { useEffect, useState, FormEvent, useRef } from 'react';
import { Send, Lock } from 'lucide-react';
import { db, auth } from '../../firebase'; // Add auth here
import { collection, doc, addDoc, onSnapshot, query, orderBy, serverTimestamp, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth'; // Add this

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

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  // 1. Global Inbox Listener
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

      // Trigger alerts if a brand new chat was created
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

  // 2. Active Chat Listener
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

  if (!isAuthenticated) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-lg flex flex-col items-center">
          <Lock size={48} className="mb-4 text-gray-800" />
          <h2 className="text-xl font-bold mb-4">Host Dashboard</h2>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Admin Email" className="w-64 bg-gray-100 p-3 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-black" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter Password" className="w-64 bg-gray-100 p-3 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-black" />
          <button type="submit" className="w-full bg-black text-white p-3 rounded-lg font-medium hover:bg-gray-800">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
        <h2 className="p-4 font-bold text-lg border-b bg-gray-50">Active Threads ({chats.length})</h2>
        <div className="flex-1 overflow-y-auto">
          {chats.map((guest) => (
            <div 
              key={guest.id} 
              onClick={() => setActiveChat(guest.id)}
              className={`p-4 border-b cursor-pointer transition-colors ${activeChat === guest.id ? 'bg-gray-100 border-l-4 border-l-black' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}
            >
              <div className="mb-1 flex justify-between items-start">
                <p className="font-bold text-gray-800">{guest.profile?.name || 'Anonymous'}</p>
                <span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-600">{guest.profile?.age} yrs</span>
              </div>
              <p className="text-sm text-gray-600 truncate">{guest.profile?.belief} • {guest.profile?.language}</p>
            </div>
          ))}
          {chats.length === 0 && <div className="p-8 text-center text-gray-400"><p>Inbox is empty.</p></div>}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white">
        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50">
            <h3 className="text-xl font-medium">Select a thread to view or reply.</h3>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full">
            <div className="p-4 border-b border-gray-200 bg-gray-50 font-semibold shadow-sm">Chatting with {chats.find(c => c.id === activeChat)?.profile.name}</div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`px-4 py-3 rounded-2xl max-w-[70%] ${msg.sender === 'admin' ? 'bg-black text-white rounded-br-none' : 'bg-gray-100 border border-gray-200 rounded-bl-none'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} className="p-4 bg-white border-t flex gap-3">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 bg-gray-100 rounded-full px-6 py-3 focus:outline-none" />
              <button type="submit" className="bg-black text-white p-3 rounded-full"><Send size={20} /></button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
