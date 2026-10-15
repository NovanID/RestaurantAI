'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface UserInfo {
  name?: string;
  email?: string;
  role?: string;
  tenantSlug?: string;
}

const NAV_ITEMS = [
  {
    href: '/admin/dashboard',
    label: 'Ikhtisar',
    sub: 'Ringkasan operasional',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
      </svg>
    ),
  },
  {
    href: '/admin/reservations',
    label: 'Reservasi',
    sub: 'Antrean & meja tamu',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/admin/outlets',
    label: 'Cabang Restoran',
    sub: 'Lokasi, jam & meja',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    href: '/admin/menu',
    label: 'Menu Masakan',
    sub: 'Ketersediaan & harga',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    href: '/admin/categories',
    label: 'Kategori Menu',
    sub: 'Pengelompokan hidangan',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    href: '/admin/audit',
    label: 'Audit Trail',
    sub: 'Log mutasi operasional',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // Ignore parsing errors
    }
  }, []);

  // Isolate login and logout pages outside the admin shell
  const isAuthPage = pathname === '/admin/login' || pathname === '/admin/logout';
  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[var(--ironwood)] text-[var(--sand)] flex flex-col lg:flex-row antialiased">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-[var(--panel)] border-b border-[var(--line)] sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded border border-[var(--brass-border)] bg-[var(--brass-bg)] flex items-center justify-center text-[var(--brass)] font-semibold text-xs tracking-wider">
            RM
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-[var(--sand)]">Rumah Makan Minang</h1>
            <p className="text-[10px] text-[var(--muted)] font-mono">PANEL OPERASIONAL</p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded border border-[var(--line)] text-[var(--sand-muted)] hover:text-[var(--sand)] hover:bg-[var(--panel-elevated)]"
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-[var(--panel)] border-r border-[var(--line)] flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[var(--line)]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded border border-[var(--brass-border)] bg-[var(--brass-bg)] flex items-center justify-center text-[var(--brass)] font-semibold text-sm tracking-wider">
              RM
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-[var(--sand)]">Rumah Makan Minang</h1>
              <p className="text-[11px] text-[var(--muted)] font-mono tracking-wide">OPERASIONAL RESMI</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[var(--line)] flex items-center justify-between text-[11px]">
            <span className="text-[var(--muted)] font-mono uppercase">Status</span>
            <span className="inline-flex items-center gap-1.5 text-[var(--pandan-light)] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--pandan)] animate-pulse" />
              Sistem Aktif
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-start gap-3 px-3 py-2.5 rounded transition-colors text-sm ${
                  isActive
                    ? 'bg-[var(--panel-elevated)] text-[var(--brass)] border border-[var(--brass-border)]'
                    : 'text-[var(--sand-muted)] hover:text-[var(--sand)] hover:bg-[var(--panel-elevated)] border border-transparent'
                }`}
              >
                <div className={`mt-0.5 shrink-0 ${isActive ? 'text-[var(--brass)]' : 'text-[var(--muted)]'}`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium tracking-tight leading-none mb-1">{item.label}</div>
                  <div className="text-[11px] text-[var(--muted)] leading-tight truncate">{item.sub}</div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-[var(--line)] bg-[var(--panel)]">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[var(--sand)] truncate">{user?.name || 'Staff Petugas'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--panel-input)] border border-[var(--line)] text-[var(--brass)]">
                  {user?.role || 'staff'}
                </span>
                <span className="text-[10px] text-[var(--muted)] font-mono truncate">
                  @{user?.tenantSlug || 'padang-sederhana'}
                </span>
              </div>
            </div>
            <Link
              href="/admin/logout"
              title="Keluar dari sesi"
              className="p-2 rounded border border-[var(--line)] text-[var(--sand-muted)] hover:text-[var(--chili-light)] hover:border-[var(--chili-border)] hover:bg-[var(--chili-bg)] transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </Link>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Top Header Bar */}
        <header className="hidden lg:flex items-center justify-between px-8 py-3.5 bg-[var(--panel)] border-b border-[var(--line)] sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase font-mono text-[var(--muted)] tracking-wider">
              Restoran AI / Minang Operations
            </span>
            <span className="text-[var(--line)]">|</span>
            <span className="text-xs font-mono text-[var(--sand-muted)]">
              Waktu Server: WIB (UTC+7)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded bg-[var(--panel-input)] border border-[var(--line)] text-[var(--sand-muted)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--pandan)]" />
              Database Operasional Terhubung
            </span>
          </div>
        </header>

        {/* Page Container */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
