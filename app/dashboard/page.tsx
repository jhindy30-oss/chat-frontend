'use client';
import { useEffect, useState, FormEvent } from 'react';
import { io } from 'socket.io-client';
import { Send, Lock } from 'lucide-react';
import CryptoJS from 'crypto-js';

const socket = io('https://chat-backend-u9kl.onrender.com');

interface GuestProfile {
  name: string;
  age: string;
  language: string;
  belief: string;
}

interface Guest {
  guestId: string;
  source: string;
  profile: GuestProfile;
}

interface Message {
  text: string;
  senderId: string;
}

export default function HostDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  
  const [queue, setQueue] = useState<Guest[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  // Request browser notification permissions on load
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    socket.emit('register-host');

    socket.on('new-guest-waiting', (guest: Guest) => {
      setQueue((prev) => [...prev, guest]);
      
      // Trigger browser notification
      if (Notification.permission === "granted") {
        new Notification("New Guest Waiting", {
          body: `${guest.profile.name} (${guest.profile.age}) is waiting to connect.`,
        });
      }
    });

    socket.on('queue-update', (updatedQueue: Guest[]) => {
      setQueue(updatedQueue);
    });
    
    socket.on('chat-started', (data: { roomId: string }) => {
        setActiveChat(data.roomId);
        setMessages([]);
    });

    socket.on('receive-message', (message: Message) => {
      if (!activeChat) return;
      // Decrypt incoming message
      const bytes = CryptoJS.AES.decrypt(message.text, activeChat);
      const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
      setMessages((prev) => [...prev, { ...message, text: decryptedText }]);
    });

    return () => {
      socket.disconnect(); 
    };
  }, [isAuthenticated, activeChat]);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') setIsAuthenticated(true);
    else alert('Incorrect password');
  };

  const acceptGuest = (guestId: string) => {
    socket.emit('accept-guest', guestId);
  };

  const sendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeChat) return;

    // Encrypt outgoing message
    const encryptedText = CryptoJS.AES.encrypt(input, activeChat).toString();
    const msgData = { roomId: activeChat, text: encryptedText, senderId: socket.id as string };
    
    socket.emit('send-message', msgData);
    setMessages((prev) => [...prev, { text: input, senderId: socket.id as string }]);
    setInput('');
  };

  if (!isAuthenticated) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-lg flex flex-col items-center">
          <Lock size={48} className="mb-4 text-gray-800" />
          <h2 className="text-xl font-bold mb-4">Host Dashboard</h2>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter Password" className="w-64 bg-gray-100 p-3 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-black" />
          <button type="submit" className="w-full bg-black text-white p-3 rounded-lg font-medium hover:bg-gray-800">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
        <h2 className="p-4 font-bold text-lg border-b bg-gray-50">Waiting Guests ({queue.length})</h2>
        <div className="flex-1 overflow-y-auto">
          {queue.map((guest) => (
            <div key={guest.guestId} className="p-4 border-b hover:bg-gray-50 flex flex-col transition-colors">
              <div className="mb-3">
                <p className="font-bold text-gray-800">{guest.profile.name}, {guest.profile.age}</p>
                <p className="text-sm text-gray-600">Lang: {guest.profile.language}</p>
                <p className="text-sm text-gray-600">Belief: {guest.profile.belief}</p>
              </div>
              <button onClick={() => acceptGuest(guest.guestId)} className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 w-full">
                Accept Connection
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white">
        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50">
            <h3 className="text-xl font-medium">Select a guest from the queue to start chatting.</h3>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full">
             {/* Messages UI (Same as before) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.senderId === socket.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`px-4 py-3 rounded-2xl max-w-[70%] ${msg.senderId === socket.id ? 'bg-black text-white rounded-br-none' : 'bg-white border border-gray-200 rounded-bl-none'}`}>
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
