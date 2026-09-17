'use client';
import { useEffect, useState, FormEvent } from 'react';
import { io } from 'socket.io-client';
import { Loader2, Send, HeartHandshake } from 'lucide-react';
import CryptoJS from 'crypto-js';

const socket = io('https://chat-backend-u9kl.onrender.com');

interface Message {
  text: string;
  senderId: string;
}

export default function GuestScanner({ params }: { params: { source: string } }) {
  const [profile, setProfile] = useState({ name: '', age: '', language: '', belief: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [status, setStatus] = useState('idle');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  // Safeguard: Prevent accidental closing of the tab
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status === 'chatting' || status === 'waiting') {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [status]);

  useEffect(() => {
    socket.on('chat-started', (data: { roomId: string }) => {
      setRoomId(data.roomId);
      setStatus('chatting');
    });

    socket.on('receive-message', (message: Message) => {
      if (!roomId) return;
      const bytes = CryptoJS.AES.decrypt(message.text, roomId);
      const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
      setMessages((prev) => [...prev, { ...message, text: decryptedText }]);
    });

    // FIX: Remove specific listeners instead of killing the whole connection
    return () => {
      socket.off('chat-started');
      socket.off('receive-message');
    };
  }, [roomId]);

  const joinQueue = (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setStatus('waiting');
    socket.emit('request-agent', { source: params.source, profile });
  };

  const sendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !roomId) return;

    const encryptedText = CryptoJS.AES.encrypt(input, roomId).toString();
    const msgData = { roomId, text: encryptedText, senderId: socket.id as string };
    
    socket.emit('send-message', msgData);
    setMessages((prev) => [...prev, { text: input, senderId: socket.id as string }]);
    setInput('');
  };

  // 1. Hopeline Intake Form
  if (!isSubmitted) {
    return (
      <div className="min-h-screen bg-teal-50 flex items-center justify-center p-4">
        <form onSubmit={joinQueue} className="bg-white p-8 rounded-3xl w-full max-w-md shadow-xl space-y-5 border border-teal-100">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-teal-100 p-4 rounded-full mb-3 text-teal-600">
              <HeartHandshake size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Welcome to Hopeline</h2>
            <p className="text-gray-500 text-sm mt-1 text-center">We are here for you. Please share a few details to get started.</p>
          </div>
          
          <input required type="text" placeholder="Name or Nickname" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full bg-gray-50 p-4 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-gray-800 border border-gray-200" />
          <input required type="number" placeholder="Age" value={profile.age} onChange={e => setProfile({...profile, age: e.target.value})} className="w-full bg-gray-50 p-4 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-gray-800 border border-gray-200" />
          <input required type="text" placeholder="Preferred Language" value={profile.language} onChange={e => setProfile({...profile, language: e.target.value})} className="w-full bg-gray-50 p-4 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-gray-800 border border-gray-200" />
          <input required type="text" placeholder="Belief System" value={profile.belief} onChange={e => setProfile({...profile, belief: e.target.value})} className="w-full bg-gray-50 p-4 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-gray-800 border border-gray-200" />
          
          <button type="submit" className="w-full bg-teal-600 p-4 rounded-xl font-bold text-white hover:bg-teal-700 transition-colors mt-6 shadow-md">
            Connect to Someone
          </button>
        </form>
      </div>
    );
  }

  // 2. Hopeline Waiting Room
  if (status === 'waiting') {
    return (
      <div className="h-screen bg-teal-50 flex flex-col items-center justify-center text-teal-800">
        <Loader2 className="animate-spin mb-4 text-teal-600" size={48} />
        <h2 className="text-xl font-semibold">Finding an available connection...</h2>
        <p className="text-teal-600/70 mt-2">Please keep this window open.</p>
      </div>
    );
  }

  // 3. Hopeline Active Chat
  return (
    <div className="flex flex-col h-screen bg-teal-50 pb-6">
      <div className="p-4 bg-white border-b border-teal-100 shadow-sm flex items-center gap-3">
        <div className="bg-teal-100 p-2 rounded-full text-teal-600">
          <HeartHandshake size={24} />
        </div>
        <h1 className="font-bold text-xl text-gray-800">Hopeline</h1>
        <div className="ml-auto flex items-center gap-2 text-xs font-medium text-teal-600 bg-teal-50 px-3 py-1 rounded-full">
          <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
          Connected
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
           <div key={idx} className={`flex ${msg.senderId === socket.id ? 'justify-end' : 'justify-start'}`}>
             <div className={`px-5 py-3 rounded-2xl max-w-[80%] shadow-sm ${msg.senderId === socket.id ? 'bg-teal-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-teal-100 rounded-bl-none'}`}>
               {msg.text}
             </div>
           </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="px-4 flex gap-2">
        <input type="text" placeholder="Share your thoughts..." value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 bg-white border border-teal-200 rounded-full px-6 py-4 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-800 shadow-sm" />
        <button type="submit" className="bg-teal-600 text-white p-4 rounded-full hover:bg-teal-700 shadow-md transition-transform active:scale-95">
          <Send size={24} />
        </button>
      </form>
    </div>
  );
}
