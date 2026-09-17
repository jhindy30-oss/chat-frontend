'use client';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Loader2 } from 'lucide-react';

const socket = io('https://chat-backend-u9kl.onrender.com'); 

export default function GuestScanner({ params }: { params: { source: string } }) {
  const [status, setStatus] = useState('connecting');
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    socket.emit('request-agent', { source: params.source });
    setStatus('waiting');

    socket.on('chat-started', (data: { roomId: string }) => {
      setRoomId(data.roomId);
      setStatus('chatting');
    });

    return () => {
      socket.disconnect(); 
    };
  }, [params.source]);

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
    <div className="h-screen bg-gray-900 text-white">
      <h1 className="p-4 bg-gray-800 border-b border-gray-700">Connected to Host!</h1>
    </div>
  );
}
