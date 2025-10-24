import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Paris Mechanical Capacity Management
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Integrated capacity planning and cash flow forecasting platform
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Projects Card */}
          <Link href="/projects" className="group">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <svg className="h-8 w-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h2 className="ml-3 text-xl font-semibold text-gray-900 group-hover:text-blue-600">
                  Projects
                </h2>
              </div>
              <p className="text-gray-600">
                Manage projects, track status, and monitor progress across all divisions
              </p>
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-gray-500">Active: 12</span>
                <span className="text-blue-600">View all →</span>
              </div>
            </div>
          </Link>

          {/* Employees Card */}
          <Link href="/employees" className="group">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <h2 className="ml-3 text-xl font-semibold text-gray-900 group-hover:text-blue-600">
                  Employees
                </h2>
              </div>
              <p className="text-gray-600">
                Manage workforce, track availability, and monitor utilization rates
              </p>
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-gray-500">Total: 45</span>
                <span className="text-blue-600">Manage →</span>
              </div>
            </div>
          </Link>

          {/* Capacity Planning Card */}
          <Link href="/capacity" className="group">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <svg className="h-8 w-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h2 className="ml-3 text-xl font-semibold text-gray-900 group-hover:text-blue-600">
                  Capacity Planning
                </h2>
              </div>
              <p className="text-gray-600">
                Analyze capacity, forecast labor needs, and optimize crew assignments
              </p>
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-gray-500">Utilization: 78%</span>
                <span className="text-blue-600">Analyze →</span>
              </div>
            </div>
          </Link>

          {/* Assignments Card */}
          <Link href="/assignments" className="group">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <svg className="h-8 w-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h2 className="ml-3 text-xl font-semibold text-gray-900 group-hover:text-blue-600">
                  Crew Assignments
                </h2>
              </div>
              <p className="text-gray-600">
                Schedule crews, track hours, and manage daily assignments
              </p>
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-gray-500">This week: 125</span>
                <span className="text-blue-600">Schedule →</span>
              </div>
            </div>
          </Link>

          {/* Financial Card */}
          <Link href="/financials" className="group">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <svg className="h-8 w-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="ml-3 text-xl font-semibold text-gray-900 group-hover:text-blue-600">
                  Financials
                </h2>
              </div>
              <p className="text-gray-600">
                Track project costs, monitor cash flow, and analyze profitability
              </p>
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-gray-500">YTD Revenue: $2.4M</span>
                <span className="text-blue-600">View →</span>
              </div>
            </div>
          </Link>

          {/* Reports Card */}
          <Link href="/reports" className="group">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v1a1 1 0 001 1h4a1 1 0 001-1v-1m3-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v8m5 0h2m1 0h3m-10 0h-3m4-13v2.5" />
                </svg>
                <h2 className="ml-3 text-xl font-semibold text-gray-900 group-hover:text-blue-600">
                  Reports
                </h2>
              </div>
              <p className="text-gray-600">
                Generate detailed reports and export data for analysis
              </p>
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-gray-500">Latest: Today</span>
                <span className="text-blue-600">Generate →</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">12</p>
              <p className="text-sm text-gray-600">Active Projects</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">45</p>
              <p className="text-sm text-gray-600">Employees</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">78%</p>
              <p className="text-sm text-gray-600">Utilization</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">3</p>
              <p className="text-sm text-gray-600">Alerts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
