import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Admin Dashboard | Restaurant AI',
  description: 'Restaurant AI Management Dashboard',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navigation Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-64 bg-slate-900 border-r border-slate-700 flex flex-col">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-700">
          <Link href="/admin/dashboard" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold">R</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold">Admin</h1>
              <p className="text-xs text-gray-400">Dashboard</p>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem 
            href="/admin/dashboard" 
            icon="📊" 
            label="Dashboard" 
            isActive={true}
          />
          
          <NavItem 
            href="/admin/reservations" 
            icon="📅" 
            label="Reservations" 
            isActive={false}
          />

          <NavItem 
            href="/admin/outlets" 
            icon="🏢" 
            label="Outlets" 
            isActive={false}
          />

          <NavItem 
            href="/admin/menu" 
            icon="🍽️" 
            label="Menu Items" 
            isActive={false}
          />

          <NavItem 
            href="/admin/categories" 
            icon="📁" 
            label="Categories" 
            isActive={false}
          />

          <NavItem 
            href="/admin/audit" 
            icon="📋" 
            label="Audit Log" 
            isActive={false}
          />
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold">
                A
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Admin</p>
              <p className="text-xs text-gray-400">Authenticated session</p>
            </div>
            <Link
              href="/admin/logout"
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              aria-label="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-64 min-h-screen">
        {/* Top Header Bar */}
        <header className="bg-slate-900/50 backdrop-blur border-b border-slate-700 sticky top-0 z-10">
          <div className="px-8 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Restaurant AI Management
            </h2>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span>Restaurant operations</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

// Reusable Nav Item Component
function NavItem({ 
  href, 
  icon, 
  label, 
  isActive 
}: { 
  href: string; 
  icon: string; 
  label: string; 
  isActive: boolean;
}) {
  return (
    <Link 
      href={href}
      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
        isActive
          ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
          : 'text-gray-300 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}
