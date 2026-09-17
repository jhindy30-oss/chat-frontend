'use client';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('https://chat-backend-u9kl.onrender.com'); 

interface Guest {
  guestId: string;
  source: string;
}

export default function HostDashboard() {
  const [queue, setQueue] = useState<Guest[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);

  useEffect(() => {
    socket.emit('register-host');

    socket.on('new-guest-waiting', (guest: Guest) => {
      setQueue((prev) => [...prev, guest]);
    });

    socket.on('queue-update', (updatedQueue: Guest[]) => {
      setQueue(updatedQueue);
    });
    
    socket.on('chat-started', (data: { roomId: string }) => {
        setActiveChat(data.roomId);
    });

    return () => {
      socket.disconnect(); 
    };
  }, []);

  const acceptGuest = (guestId: string) => {
    socket.emit('accept-guest', guestId);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <h2 className="p-4 font-bold text-lg border-b">Waiting Guests ({queue.length})</h2>
        <div className="flex-1 overflow-y-auto">
          {queue.map((guest) => (
            <div key={guest.guestId} className="p-4 border-b hover:bg-gray-50 flex justify-between items-center">
              <div>
                <p className="font-semibold text-gray-800">New Scan</p>
                <p className="text-sm text-gray-500">Source: {guest.source}</p>
              </div>
              <button 
                onClick={() => acceptGuest(guest.guestId)}
                className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800"
              >
                Accept
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-gray-50 flex items-center justify-center">
        {!activeChat ? (
          <div className="text-gray-400 text-center">
            <h3 className="text-xl mb-2">You are online</h3>
            <p>Select a guest from the queue to start chatting.</p>
          </div>
        ) : (
          <div className="w-full h-full p-6">
            <h2 className="text-2xl font-bold mb-4">Chatting with Guest</h2>
          </div>
        )}
      </div>
    </div>
  );
}
