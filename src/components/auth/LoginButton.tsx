'use client';

import Link from 'next/link';

export function LoginButton() {
  return (
    <Link
      href="/api/auth/login"
      className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      Login with Auth0
    </Link>
  );
}

export function LogoutButton() {
  return (
    <Link
      href="/api/auth/logout"
      className="inline-flex items-center justify-center rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
    >
      Logout
    </Link>
  );
}