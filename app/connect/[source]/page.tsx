'use client';
import { useEffect, useState, FormEvent } from 'react';
import { io } from 'socket.io-client';
import { Loader2, Send } from 'lucide-react';

const socket = io('https://chat-backend-u9kl.onrender.com'); 

interface Message {
  text: string;
  senderId: string;
}

export default function GuestScanner({ params }: { params: { source: string } }) {
  const [status, setStatus] = useState('connecting');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    socket.emit('request-agent', { source: params.source });
    setStatus('waiting');

    socket.on('chat-started', (data: { roomId: string }) => {
      setRoomId(data.roomId);
      setStatus('chatting');
    });

    socket.on('receive-message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.disconnect(); 
    };
  }, [params.source]);

  const sendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !roomId) return;

    const msgData = { roomId, text: input, senderId: socket.id as string };
    socket.emit('send-message', msgData);
    
    // Add our own message to the screen immediately
    setMessages((prev) => [...prev, { text: input, senderId: socket.id as string }]);
    setInput('');
  };

  if (status === 'waiting') {
    return (
      <div className="h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin mb-4" size={48} />
        <h2 className="text-xl font-semibold">Looking for an available host...</h2>
        <p className="text-gray-400 mt-2">Please keep this screen open.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white pb-6">
      <div className="p-4 bg-gray-800 border-b border-gray-700 shadow-sm flex items-center justify-between">
        <h1 className="font-semibold text-lg">Connected to Host</h1>
        <span className="flex h-3 w-3 rounded-full bg-green-500"></span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.senderId === socket.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`px-4 py-2 rounded-2xl max-w-[75%] shadow-md ${
              msg.senderId === socket.id ? 'bg-blue-600 rounded-br-none' : 'bg-gray-700 rounded-bl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="px-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-white"
        />
        <button type="submit" className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition-colors shadow-lg">
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
