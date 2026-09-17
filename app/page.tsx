'use client';
import { useEffect, useState, FormEvent } from 'react';
import { io } from 'socket.io-client';
import { Send } from 'lucide-react';

const socket = io('https://chat-backend-u9kl.onrender.com'); 

interface Guest {
  guestId: string;
  source: string;
}

interface Message {
  text: string;
  senderId: string;
}

export default function HostDashboard() {
  const [queue, setQueue] = useState<Guest[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    socket.emit('register-host');

   socket.on('new-guest-waiting', (guest: Guest) => {
      setQueue((prev) => [...prev, guest]);
      
      // Play an audible ping
      const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Audio playback blocked by browser until interacted with'));

      // Trigger browser notification
      if (Notification.permission === "granted") {
        new Notification("New Hopeline Request", {
          body: `${guest.profile.name} (${guest.profile.age}) is waiting to connect.`,
        });
      }
    });

    socket.on('queue-update', (updatedQueue: Guest[]) => {
      setQueue(updatedQueue);
    });
    
    socket.on('chat-started', (data: { roomId: string }) => {
        setActiveChat(data.roomId);
        setMessages([]); // Clear previous chat history if taking a new guest
    });

    socket.on('receive-message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.disconnect(); 
    };
  }, []);

  const acceptGuest = (guestId: string) => {
    socket.emit('accept-guest', guestId);
  };

  const sendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeChat) return;

    const msgData = { roomId: activeChat, text: input, senderId: socket.id as string };
    socket.emit('send-message', msgData);
    
    // Add our own message to the screen immediately
    setMessages((prev) => [...prev, { text: input, senderId: socket.id as string }]);
    setInput('');
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      {/* Sidebar Queue */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
        <h2 className="p-4 font-bold text-lg border-b bg-gray-50">Waiting Guests ({queue.length})</h2>
        <div className="flex-1 overflow-y-auto">
          {queue.map((guest) => (
            <div key={guest.guestId} className="p-4 border-b hover:bg-gray-50 flex justify-between items-center transition-colors">
              <div>
                <p className="font-semibold text-gray-800">New Scan</p>
                <p className="text-sm text-gray-500">Source: {guest.source}</p>
              </div>
              <button 
                onClick={() => acceptGuest(guest.guestId)}
                className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
              >
                Accept
              </button>
            </div>
          ))}
          {queue.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              <p>Queue is empty.</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {!activeChat ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
            <h3 className="text-xl mb-2 font-medium">You are online</h3>
            <p>Select a guest from the queue to start chatting.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex items-center shadow-sm">
              <div className="h-3 w-3 bg-green-500 rounded-full mr-3"></div>
              <h2 className="text-xl font-bold">Chatting with Guest</h2>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.senderId === socket.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`px-4 py-3 rounded-2xl max-w-[70%] shadow-sm ${
                    msg.senderId === socket.id ? 'bg-black text-white rounded-br-none' : 'bg-white border border-gray-200 rounded-bl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <p>Connection established. Say hello!</p>
                </div>
              )}
            </div>

            {/* Input Area */}
            <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-200 flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-gray-100 border-none rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-black transition-all"
              />
              <button type="submit" className="bg-black text-white p-3 rounded-full hover:bg-gray-800 transition-colors shadow-md">
                <Send size={20} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
