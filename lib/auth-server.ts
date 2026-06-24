import { NextRequest } from 'next/server';

export interface FirebaseUser {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
}

export async function verifyAuth(req: NextRequest): Promise<FirebaseUser | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) return null;

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      console.error('NEXT_PUBLIC_FIREBASE_API_KEY is not configured in environment variables');
      return null;
    }

    // Call Firebase Auth REST API to verify the ID token
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (data?.users?.[0]) {
      const user = data.users[0];
      return {
        uid: user.localId,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoUrl,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error verifying Firebase ID Token:', error);
    return null;
  }
}
