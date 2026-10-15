'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface DashboardStats {
  totalReservations: number;
  pendingReservations: number;
  confirmedReservations: number;
  todayCheckins: number;
  totalRevenue: number;
  activeTables: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch stats data (placeholder - will be implemented with real API)
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // TODO: Implement real API call
      // For now, show loading state
      setTimeout(() => {
        setStats({
          totalReservations: 0,
          pendingReservations: 0,
          confirmedReservations: 0,
          todayCheckins: 0,
          totalRevenue: 0,
          activeTables: 0,
        });
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
        <p className="text-blue-100">Here's what's happening with your restaurant today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Reservations */}
        <StatCard 
          title="Total Reservations" 
          value={stats?.totalReservations || '-'} 
          icon="📅"
          trend="+12%"
          color="blue"
        />

        {/* Pending Reservations */}
        <StatCard 
          title="Pending Approval" 
          value={stats?.pendingReservations || '-'} 
          icon="⏳"
          trend="Needs attention"
          color="yellow"
        />

        {/* Confirmed Reservations */}
        <StatCard 
          title="Confirmed Today" 
          value={stats?.confirmedReservations || '-'} 
          icon="✅"
          trend="+5%"
          color="green"
        />

        {/* Today Check-ins */}
        <StatCard 
          title="Today Check-ins" 
          value={stats?.todayCheckins || '-'} 
          icon="🚪"
          trend="-2%"
          color="purple"
        />

        {/* Total Revenue */}
        <StatCard 
          title="Revenue Today" 
          value={`Rp ${stats?.totalRevenue?.toLocaleString() || '-'}`} 
          icon="💰"
          trend="+8%"
          color="emerald"
        />

        {/* Active Tables */}
        <StatCard 
          title="Active Tables" 
          value={stats?.activeTables || '-'} 
          icon="🪑"
          trend="Real-time"
          color="indigo"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionButton 
            href="/admin/reservations" 
            icon="📅"
            title="Manage Reservations" 
            description="View and manage all reservations"
          />
          
          <ActionButton 
            href="/admin/menu" 
            icon="🍽️"
            title="Update Menu" 
            description="Add or edit menu items"
          />
          
          <ActionButton 
            href="/admin/outlets" 
            icon="🏢"
            title="Outlet Settings" 
            description="Configure outlet information"
          />
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <p className="text-gray-400 text-sm">No recent activities yet. This section will show the latest admin actions once data is available.</p>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ 
  title, 
  value, 
  icon, 
  trend, 
  color 
}: { 
  title: string; 
  value: string | number; 
  icon: string; 
  trend: string; 
  color: string;
}) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
    green: 'from-green-500/20 to-green-600/10 border-green-500/30',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
    indigo: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} backdrop-blur rounded-xl p-6 border`}>
      <div className="flex items-start justify-between mb-4">
        <div className="text-2xl">{icon}</div>
        <span className={`text-xs px-2 py-1 rounded-full bg-${color}-500/10 text-${color}-400`}>
          {trend}
        </span>
      </div>
      <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

// Action Button Component
function ActionButton({ 
  href, 
  icon, 
  title, 
  description 
}: { 
  href: string; 
  icon: string; 
  title: string; 
  description: string;
}) {
  return (
    <Link href={href}>
      <div className="group bg-slate-700/50 hover:bg-slate-600/50 rounded-lg p-4 border border-slate-600 hover:border-blue-500 transition-all cursor-pointer">
        <div className="flex items-center space-x-3 mb-2">
          <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
          <h3 className="font-semibold">{title}</h3>
        </div>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </Link>
  );
}
