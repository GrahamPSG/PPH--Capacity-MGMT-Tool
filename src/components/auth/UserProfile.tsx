'use client';

import { useEffect, useState } from 'react';

interface UserData {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    divisionAccess: string[];
    picture?: string;
  };
  permissions: string[];
}

export function UserProfile() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then(data => setUserData(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading user data...</div>;
  if (error) return <div>Not logged in</div>;
  if (!userData) return null;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">User Profile</h2>
      <div className="space-y-2">
        <div>
          <span className="font-medium">Name:</span> {userData.user.name}
        </div>
        <div>
          <span className="font-medium">Email:</span> {userData.user.email}
        </div>
        <div>
          <span className="font-medium">Role:</span>{' '}
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm">
            {userData.user.role}
          </span>
        </div>
        <div>
          <span className="font-medium">Divisions:</span>{' '}
          {userData.user.divisionAccess?.join(', ') || 'None'}
        </div>
        <div className="pt-2">
          <span className="font-medium">Permissions:</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {userData.permissions.map(permission => (
              <span
                key={permission}
                className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs"
              >
                {permission}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}