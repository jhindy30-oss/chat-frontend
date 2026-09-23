'use client';
import { useEffect, useState, FormEvent, useRef } from 'react';
import { Send, HeartHandshake, Loader2, Globe } from 'lucide-react';

// IMPORTANT: Ensure this path matches where your firebase.ts is located
import { db } from '../../firebase'; 
import { collection, doc, setDoc, addDoc, onSnapshot, query, orderBy, serverTimestamp, increment } from 'firebase/firestore';

interface Message {
  id: string;
  text: string;
  sender: 'guest' | 'admin';
}

const translations = {
  en: {
    brand: "Hopeline",
    slogan: "The answers you are looking for.",
    instructions: "Share a few details below to get started 👇",
    namePlace: "Name or Nickname 👤",
    agePlace: "Age 🎂",
    langPlace: "Preferred Language 🌍",
    beliefPlace: "Belief System 🕊️",
    submitBtn: "Find Your Guide ✨",
    chatHeader: "Hopeline 💙",
    chatSubHeader: "Active Guide 🧭",
    secureMsg: "Messages are secure and encrypted 🔒",
    chatPlace: "Type a message... ✍️",
    autoGreet: "Hi there 👋. Thank you for reaching out. A guide has been notified and will be with you shortly to help you find the answers you are looking for."
  },
  es: {
    brand: "Hopeline",
    slogan: "Las respuestas que estás buscando.",
    instructions: "Comparte algunos detalles a continuación para comenzar 👇",
    namePlace: "Nombre o Apodo 👤",
    agePlace: "Edad 🎂",
    langPlace: "Idioma preferido 🌍",
    beliefPlace: "Sistema de creencias 🕊️",
    submitBtn: "Encuentra tu Guía ✨",
    chatHeader: "Hopeline 💙",
    chatSubHeader: "Guía Activo 🧭",
    secureMsg: "Los mensajes son seguros y están encriptados 🔒",
    chatPlace: "Escribe un mensaje... ✍️",
    autoGreet: "Hola 👋. Gracias por contactarnos. Un guía ha sido notificado y estará contigo en breve para ayudarte a encontrar las respuestas que buscas."
  },
  ar: {
    brand: "هوب لاين",
    slogan: "الإجابات التي تبحث عنها.",
    instructions: "شارك بعض التفاصيل أدناه للبدء 👇",
    namePlace: "الاسم أو اللقب 👤",
    agePlace: "العمر 🎂",
    langPlace: "اللغة المفضلة 🌍",
    beliefPlace: "المعتقد أو الدين 🕊️",
    submitBtn: "ابحث عن دليلك ✨",
    chatHeader: "هوب لاين 💙",
    chatSubHeader: "دليل نشط 🧭",
    secureMsg: "الرسائل آمنة ومشفرة 🔒",
    chatPlace: "اكتب رسالة... ✍️",
    autoGreet: "أهلاً بك 👋. شكرًا لتواصلك معنا. تم إبلاغ الدليل وسيكون معك قريبًا لمساعدتك في العثور على الإجابات التي تبحث عنها."
  },
  ur: {
    brand: "ہوپ لائن",
    slogan: "وہ جوابات جن کی آپ کو تلاش ہے۔",
    instructions: "شروع کرنے کے لیے نیچے کچھ تفصیلات شیئر کریں 👇",
    namePlace: "نام یا عرفی نام 👤",
    agePlace: "عمر 🎂",
    langPlace: "پسندیدہ زبان 🌍",
    beliefPlace: "عقیدہ یا مذہب 🕊️",
    submitBtn: "اپنا رہنما تلاش کریں ✨",
    chatHeader: "ہوپ لائن 💙",
    chatSubHeader: "فعال رہنما 🧭",
    secureMsg: "پیغامات محفوظ اور انکرپٹڈ ہیں 🔒",
    chatPlace: "پیغام لکھیں... ✍️",
    autoGreet: "ہیلو 👋۔ ہم سے رابطہ کرنے کا شکریہ۔ ایک رہنما کو مطلع کر دیا گیا ہے اور وہ جلد ہی آپ کے ساتھ ہوں گے تاکہ آپ کو وہ جوابات تلاش کرنے میں مدد مل سکے جو آپ ڈھونڈ رہے ہیں۔"
  }
};

type LangKey = 'en' | 'es' | 'ar' | 'ur';

const renderMessageText = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-80 break-all">
          {part}
        </a>
      );
    }
    return part;
  });
};

export default function GuestScanner({ params }: { params: { source: string } }) {
  const [selectedLang, setSelectedLang] = useState<LangKey | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [profile, setProfile] = useState({ name: '', age: '', language: '', belief: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [isHostTyping, setIsHostTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousMessageCount = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const savedId = localStorage.getItem('hopeline_guest_id');
    const savedLang = localStorage.getItem('hopeline_lang') as LangKey;
    if (savedLang) setSelectedLang(savedLang);
    if (savedId) {
      setGuestId(savedId);
      setIsSubmitted(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!guestId || !isSubmitted) return;

    const messagesRef = collection(db, 'chats', guestId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const unsubMessages = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Message, 'id'>) })));
    });

    const unsubDoc = onSnapshot(doc(db, 'chats', guestId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsHostTyping(data.adminTyping || false);
        if (data.unreadByGuest > 0) setDoc(doc(db, 'chats', guestId), { unreadByGuest: 0 }, { merge: true });
      }
    });

    return () => { unsubMessages(); unsubDoc(); };
  }, [guestId, isSubmitted]);

  useEffect(() => {
    if (messages.length > previousMessageCount.current && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender === 'admin') {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([100, 30, 100]); 
        const audio = new Audio('https://actions.google.com/sounds/v1/water/water_drop.ogg');
        audio.volume = 0.4; audio.play().catch(() => {});
      }
    }
    previousMessageCount.current = messages.length;
    scrollToBottom();
  }, [messages]);

  const handleTyping = async () => {
    if (!guestId) return;
    await setDoc(doc(db, 'chats', guestId), { guestTyping: true }, { merge: true });
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(async () => {
      await setDoc(doc(db, 'chats', guestId), { guestTyping: false }, { merge: true });
    }, 2000);
  };

  const selectLanguage = (lang: LangKey) => {
    setSelectedLang(lang);
    localStorage.setItem('hopeline_lang', lang);
  };

  const joinQueue = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
      localStorage.setItem('hopeline_guest_id', newId);
      setGuestId(newId);
      
      await setDoc(doc(db, 'chats', newId), {
        source: params?.source || 'web-link',
        profile,
        appLanguage: selectedLang,
        status: 'new',
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        unreadByAdmin: 1, 
        unreadByGuest: 0
      });

      await addDoc(collection(db, 'chats', newId, 'messages'), {
        text: translations[selectedLang!].autoGreet,
        sender: 'admin',
        timestamp: serverTimestamp()
      });

      setIsSubmitted(true);
    } catch (error: any) {
      alert("Database Error: " + error.message);
    }
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !guestId) return;
    
    const textToSave = input;
    setInput('');

    await addDoc(collection(db, 'chats', guestId, 'messages'), {
      text: textToSave,
      sender: 'guest',
      timestamp: serverTimestamp()
    });

    await setDoc(doc(db, 'chats', guestId), { 
      lastMessageAt: serverTimestamp(),
      unreadByAdmin: increment(1),
      guestTyping: false
    }, { merge: true });
  };

  if (loading) {
     return <div className="h-[100dvh] bg-sky-50 flex items-center justify-center"><Loader2 className="animate-spin text-sky-500" size={48} /></div>;
  }

  // 1. Language Selection Screen
  if (!selectedLang) {
    return (
      <div className="h-[100dvh] bg-sky-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-xl flex flex-col gap-4 text-center border border-sky-100">
          <Globe size={48} className="text-sky-500 mx-auto mb-2" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Choose your language<br/>
            <span className="text-[13px] text-gray-500 font-medium mt-1 block">Elige tu idioma / اختر لغتك / اپنی زبان کا انتخاب کریں</span>
          </h2>
          <button onClick={() => selectLanguage('en')} className="w-full bg-sky-50 p-4 rounded-2xl font-bold text-sky-700 hover:bg-sky-100 transition-colors border border-sky-200">English 🇺🇸🇬🇧</button>
          <button onClick={() => selectLanguage('es')} className="w-full bg-sky-50 p-4 rounded-2xl font-bold text-sky-700 hover:bg-sky-100 transition-colors border border-sky-200">Español 🇪🇸</button>
          <button onClick={() => selectLanguage('ar')} className="w-full bg-sky-50 p-4 rounded-2xl font-bold text-sky-700 hover:bg-sky-100 transition-colors border border-sky-200" dir="rtl">العربية 🇸🇦</button>
          <button onClick={() => selectLanguage('ur')} className="w-full bg-sky-50 p-4 rounded-2xl font-bold text-sky-700 hover:bg-sky-100 transition-colors border border-sky-200" dir="rtl">اردو 🇵🇰</button>
        </div>
      </div>
    );
  }

  const t = translations[selectedLang];
  const isRtl = selectedLang === 'ar' || selectedLang === 'ur';

  // 2. Intake Form Screen
  if (!isSubmitted) {
    return (
      <div className="h-[100dvh] bg-sky-50 flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <form onSubmit={joinQueue} className="bg-white p-6 rounded-3xl w-full max-w-md shadow-xl space-y-4 border border-sky-100">
          <div className="flex flex-col items-center mb-4 text-center">
            <div className="bg-sky-100 p-3 rounded-full mb-3 text-sky-600">
              <HeartHandshake size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{t.brand} 👋</h2>
            <p className="text-sky-600 font-medium text-sm mt-1">{t.slogan}</p>
            <p className="text-gray-500 text-xs mt-3">{t.instructions}</p>
          </div>
          <input required type="text" placeholder={t.namePlace} value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full bg-gray-50 p-3.5 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none text-gray-800 border border-gray-200" />
          <input required type="number" placeholder={t.agePlace} value={profile.age} onChange={e => setProfile({...profile, age: e.target.value})} className="w-full bg-gray-50 p-3.5 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none text-gray-800 border border-gray-200" />
          <input required type="text" placeholder={t.langPlace} value={profile.language} onChange={e => setProfile({...profile, language: e.target.value})} className="w-full bg-gray-50 p-3.5 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none text-gray-800 border border-gray-200" />
          <input required type="text" placeholder={t.beliefPlace} value={profile.belief} onChange={e => setProfile({...profile, belief: e.target.value})} className="w-full bg-gray-50 p-3.5 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none text-gray-800 border border-gray-200" />
          <button type="submit" className="w-full bg-sky-500 p-3.5 rounded-xl font-bold text-white hover:bg-sky-600 transition-colors mt-4 shadow-md text-sm">{t.submitBtn}</button>
        </form>
      </div>
    );
  }

  // 3. Active Chat Screen
  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50 overflow-hidden select-none" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="px-4 py-3 bg-white border-b border-gray-200 shadow-sm flex items-center gap-3 shrink-0 z-10">
        <div className="bg-sky-500 text-white p-2 rounded-full flex items-center justify-center">
          <HeartHandshake size={20} />
        </div>
        <div>
          <h1 className="font-bold text-base text-gray-900 leading-tight">{t.chatHeader}</h1>
          <p className="text-xs text-sky-600 flex items-center gap-1 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span> {t.chatSubHeader}
          </p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f0f4f8]">
        <div className="text-center my-2">
          <span className="bg-white/80 border border-gray-200/60 text-gray-500 text-[11px] px-3 py-1 rounded-full font-medium shadow-2xs">{t.secureMsg}</span>
        </div>

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'guest' ? 'justify-end' : 'justify-start'}`}>
            <div className={`px-4 py-2.5 rounded-2xl max-w-[82%] text-sm leading-relaxed shadow-2xs break-words select-text ${msg.sender === 'guest' ? 'bg-sky-500 text-white rounded-br-xs' : 'bg-white text-gray-800 border border-gray-200/80 rounded-bl-xs'}`}>
              {renderMessageText(msg.text)}
            </div>
          </div>
        ))}
        
        {isHostTyping && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-white border border-gray-200/80 rounded-bl-xs flex items-center gap-1 shadow-2xs">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-200 flex items-center gap-2 shrink-0 shadow-lg">
        <input 
          type="text" 
          placeholder={t.chatPlace} 
          value={input} 
          onChange={(e) => { setInput(e.target.value); handleTyping(); }} 
          className="flex-1 bg-gray-100 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-gray-900 placeholder-gray-400" 
        />
        <button type="submit" disabled={!input.trim()} className="bg-sky-500 text-white p-2.5 rounded-full hover:bg-sky-600 disabled:opacity-40 transition-all shrink-0 active:scale-95 shadow-sm">
          <Send size={18} className={isRtl ? 'rotate-180' : ''} />
        </button>
      </form>
    </div>
  );
}
