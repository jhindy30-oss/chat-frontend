import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Initialize Firebase Admin securely
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function POST(req: Request) {
  try {
    const { title, body } = await req.json();

    // Grab all registered admin devices from Firestore
    const tokensSnap = await admin.firestore().collection('admin_tokens').get();
    const tokens = tokensSnap.docs.map(doc => doc.id);

    if (tokens.length > 0) {
      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
