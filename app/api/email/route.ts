
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, chatUrl, lang } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, error: 'No email provided' }, { status: 400 });
    }

    // Translate the email based on the guest's selected language
    const subjects: Record<string, string> = {
      en: "New message from your Hopeline friend 💙",
      es: "Nuevo mensaje de tu amigo de Hopeline 💙",
      ar: "رسالة جديدة من صديقك في هوب لاين 💙",
      ur: "ہوپ لائن کے دوست کی طرف سے نیا پیغام 💙",
    };
    
    const bodies: Record<string, string> = {
      en: `Hi there!\n\nYour friend at Hopeline has sent you a new message.\n\nClick here to read and reply:\n${chatUrl}\n\nStay safe,\nThe Hopeline Team`,
      es: `¡Hola!\n\nTu amigo en Hopeline te ha enviado un nuevo mensaje.\n\nHaz clic aquí para leer y responder:\n${chatUrl}\n\nMantente a salvo,\nEl Equipo de Hopeline`,
      ar: `أهلاً بك!\n\nأرسل لك صديقك في هوب لاين رسالة جديدة.\n\nانقر هنا للقراءة والرد:\n${chatUrl}\n\nابق آمناً،\nفريق هوب لاين`,
      ur: `ہیلو!\n\nہوپ لائن پر آپ کے دوست نے آپ کو ایک نیا پیغام بھیجا ہے۔\n\nپڑھنے اور جواب دینے کے لیے یہاں کلک کریں:\n${chatUrl}\n\nمحفوظ رہیں،\nہوپ لائن ٹیم`,
    };

    const subject = subjects[lang] || subjects['en'];
    const text = bodies[lang] || bodies['en'];

    const data = await resend.emails.send({
      // Important: Replace hopeline.cc if your domain is different!
      from: 'Hopeline <hello@hopeline.cc>', 
      to: email,
      subject: subject,
      text: text,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
