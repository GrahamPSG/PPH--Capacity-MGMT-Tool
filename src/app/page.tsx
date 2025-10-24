export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4">
          Paris Mechanical Capacity Manager
        </h1>
        <p className="text-lg mb-2">
          PRP-001: Project Initialization - Complete ✓
        </p>
        <p className="text-gray-600">
          Next.js 14 application with TypeScript, ESLint, Prettier, and Jest configured.
        </p>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <h2 className="font-bold mb-2">Status</h2>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>✓ Next.js 14 App Router</li>
              <li>✓ TypeScript Strict Mode</li>
              <li>✓ Tailwind CSS</li>
              <li>✓ ESLint + Prettier</li>
            </ul>
          </div>
          <div className="p-4 border rounded-lg">
            <h2 className="font-bold mb-2">Next Steps</h2>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>PRP-002: Database Foundation</li>
              <li>PRP-003: Authentication Setup</li>
              <li>PRP-004: User Management</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
