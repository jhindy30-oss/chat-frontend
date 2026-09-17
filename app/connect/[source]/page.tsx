'use client';
import { useEffect, useState, FormEvent } from 'react';
import { Send, HeartHandshake, Loader2 } from 'lucide-react';
import { db } from '../../../firebase'; 
import { collection, doc, setDoc, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';

interface Message {
  id: string;
  text: string;
  sender: 'guest' | 'admin';
}

export default function GuestScanner({ params }: { params: { source: string } }) {
  const [guestId, setGuestId] = useState<string | null>(null);
  const [profile, setProfile] = useState({ name: '', age: '', language: '', belief: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);

  // 1. Check for returning guests
  useEffect(() => {
    const savedId = localStorage.getItem('hopeline_guest_id');
    if (savedId) {
      setGuestId(savedId);
      setIsSubmitted(true);
    }
    setLoading(false);
  }, []);

  // 2. Listen to Firestore messages once an ID exists
  useEffect(() => {
    if (!guestId || !isSubmitted) return;

    const messagesRef = collection(db, 'chats', guestId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Message, 'id'>)
      }));
      setMessages(fetchedMessages);
    });

    return () => unsubscribe();
  }, [guestId, isSubmitted]);

  const joinQueue = async (e: FormEvent) => {
    e.preventDefault();
    const newId = crypto.randomUUID();
    
    // Save to local device memory
    localStorage.setItem('hopeline_guest_id', newId);
    setGuestId(newId);
    
    // Create the chat room in Firebase
    await setDoc(doc(db, 'chats', newId), {
      source: params.source,
      profile,
      status: 'active',
      createdAt: serverTimestamp(),
      lastMessageAt: serverTimestamp()
    });
    
    setIsSubmitted(true);
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !guestId) return;
    
    const textToSave = input;
    setInput(''); // Clear input instantly for UI responsiveness

    await addDoc(collection(db, 'chats', guestId, 'messages'), {
      text: textToSave,
      sender: 'guest',
      timestamp: serverTimestamp()
    });

    // Update parent doc so it bumps to the top of the admin queue
    await setDoc(doc(db, 'chats', guestId), { lastMessageAt: serverTimestamp() }, { merge: true });
  };

  if (loading) {
     return <div className="h-screen bg-teal-50 flex items-center justify-center"><Loader2 className="animate-spin text-teal-600" size={48} /></div>;
  }

  // Intake Form
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

  // Active Chat
  return (
    <div className="flex flex-col h-screen bg-teal-50 pb-6">
      <div className="p-4 bg-white border-b border-teal-100 shadow-sm flex items-center gap-3">
        <div className="bg-teal-100 p-2 rounded-full text-teal-600">
          <HeartHandshake size={24} />
        </div>
        <h1 className="font-bold text-xl text-gray-800">Hopeline</h1>
        <div className="ml-auto flex items-center gap-2 text-xs font-medium text-teal-600 bg-teal-50 px-3 py-1 rounded-full">
          <span className="flex h-2 w-2 rounded-full bg-green-500"></span> Secure
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
           <div key={msg.id} className={`flex ${msg.sender === 'guest' ? 'justify-end' : 'justify-start'}`}>
             <div className={`px-5 py-3 rounded-2xl max-w-[80%] shadow-sm ${msg.sender === 'guest' ? 'bg-teal-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-teal-100 rounded-bl-none'}`}>
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
