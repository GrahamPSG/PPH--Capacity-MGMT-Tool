import { handleAuth, handleCallback } from '@/lib/auth/auth0';
import { updateLastLogin } from '@/lib/auth/session';
import { NextRequest } from 'next/server';

// Custom callback handler to update last login
const afterCallback = async (req: NextRequest, session: any) => {
  if (session?.user?.sub) {
    await updateLastLogin(session.user.sub);
  }
  return session;
};

export const GET = handleAuth({
  callback: handleCallback({
    afterCallback,
  }),
});

export const POST = handleAuth();