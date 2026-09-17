'use client';
import { useEffect, useState, FormEvent } from 'react';
import { io } from 'socket.io-client';
import { Loader2, Send } from 'lucide-react';
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

  useEffect(() => {
    socket.on('chat-started', (data: { roomId: string }) => {
      setRoomId(data.roomId);
      setStatus('chatting');
    });

    socket.on('receive-message', (message: Message) => {
      if (!roomId) return;
      // Decrypt incoming message
      const bytes = CryptoJS.AES.decrypt(message.text, roomId);
      const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
      setMessages((prev) => [...prev, { ...message, text: decryptedText }]);
    });

    return () => {
      socket.disconnect();
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

    // Encrypt outgoing message
    const encryptedText = CryptoJS.AES.encrypt(input, roomId).toString();
    const msgData = { roomId, text: encryptedText, senderId: socket.id as string };
    
    socket.emit('send-message', msgData);
    setMessages((prev) => [...prev, { text: input, senderId: socket.id as string }]);
    setInput('');
  };

  if (!isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <form onSubmit={joinQueue} className="bg-gray-800 p-8 rounded-2xl w-full max-w-md shadow-xl text-white space-y-4">
          <h2 className="text-2xl font-bold mb-6">Join the Chat</h2>
          <input required type="text" placeholder="Name" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full bg-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          <input required type="number" placeholder="Age" value={profile.age} onChange={e => setProfile({...profile, age: e.target.value})} className="w-full bg-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          <input required type="text" placeholder="Preferred Language" value={profile.language} onChange={e => setProfile({...profile, language: e.target.value})} className="w-full bg-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          <input required type="text" placeholder="Belief System" value={profile.belief} onChange={e => setProfile({...profile, belief: e.target.value})} className="w-full bg-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          <button type="submit" className="w-full bg-blue-600 p-3 rounded-lg font-bold hover:bg-blue-700 transition-colors mt-4">Connect to Host</button>
        </form>
      </div>
    );
  }

  if (status === 'waiting') {
    return (
      <div className="h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin mb-4" size={48} />
        <h2 className="text-xl font-semibold">Waiting for a host...</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white pb-6">
      {/* Messages UI (Same as before) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
           <div key={idx} className={`flex ${msg.senderId === socket.id ? 'justify-end' : 'justify-start'}`}>
             <div className={`px-4 py-2 rounded-2xl max-w-[75%] ${msg.senderId === socket.id ? 'bg-blue-600 rounded-br-none' : 'bg-gray-700 rounded-bl-none'}`}>
               {msg.text}
             </div>
           </div>
        ))}
      </div>
      <form onSubmit={sendMessage} className="px-4 flex gap-2">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 bg-gray-800 rounded-full px-6 py-3 focus:outline-none text-white" />
        <button type="submit" className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700"><Send size={20} /></button>
      </form>
    </div>
  );
}
