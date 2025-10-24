import { NextRequest, NextResponse } from 'next/server';
import { requireManager } from '@/lib/auth/middleware';

/**
 * Example protected API route - requires Manager role or higher
 */
export async function GET(req: NextRequest) {
  // This route is protected by requireManager middleware
  // Only users with OWNER or MANAGER role can access

  // Get user info from headers (set by middleware)
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role');
  const userEmail = req.headers.get('x-user-email');

  return NextResponse.json({
    message: 'This is a protected endpoint',
    user: {
      id: userId,
      role: userRole,
      email: userEmail,
    },
    timestamp: new Date().toISOString(),
  });
}

// Apply auth middleware
export const middleware = requireManager;