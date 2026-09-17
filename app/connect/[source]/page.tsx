// app/connect/[source]/page.tsx (e.g., source = "helpdesk")
'use client';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Loader2 } from 'lucide-react';

const socket = io('https://chat-backend-u9kl.onrender.com/');

export default function GuestScanner({ params }) {
  const [status, setStatus] = useState('connecting'); // connecting, waiting, chatting
  const [roomId, setRoomId] = useState(null);

  useEffect(() => {
    // Tell the server this guest is waiting
    socket.emit('request-agent', { source: params.source });
    setStatus('waiting');

    // Listen for a host accepting the chat
    socket.on('chat-started', (data) => {
      setRoomId(data.roomId);
      setStatus('chatting');
    });

    return () => socket.disconnect();
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
      {/* Render the actual chat UI here, passing the roomId to your message functions */}
      <h1 className="p-4 bg-gray-800 border-b border-gray-700">Connected to Host!</h1>
      {/* Message list and input go here */}
    </div>
  );
}