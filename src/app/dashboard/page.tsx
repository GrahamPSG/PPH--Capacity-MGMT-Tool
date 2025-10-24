import { LoginButton, LogoutButton } from '@/components/auth/LoginButton';
import { UserProfile } from '@/components/auth/UserProfile';

export default function Dashboard() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">
          Paris Mechanical Dashboard
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Authentication</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <LoginButton />
                <LogoutButton />
              </div>
              <UserProfile />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
            <div className="space-y-2">
              <a
                href="/api/auth/me"
                className="block p-3 bg-gray-50 rounded hover:bg-gray-100"
              >
                /api/auth/me - Get current user
              </a>
              <a
                href="/api/protected/example"
                className="block p-3 bg-gray-50 rounded hover:bg-gray-100"
              >
                /api/protected/example - Protected endpoint (Manager only)
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">PRP-003 Status</h3>
          <ul className="text-sm space-y-1">
            <li>✅ Auth0 SDK configured</li>
            <li>✅ RBAC system implemented</li>
            <li>✅ Auth middleware created</li>
            <li>✅ Protected routes working</li>
            <li>✅ User profile endpoint</li>
          </ul>
        </div>
      </div>
    </main>
  );
}