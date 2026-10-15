'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getReservationStatusMeta } from '../components/status-badge';

interface Reservation {
  id: string;
  code: string;
  startAt: string;
  partySize: number;
  status: string;
  customer: { name: string; phone: string };
  outlet: { name: string };
  table: { tableNumber: string };
}

interface AuditItem {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  actorId?: string;
  actorType: string;
  createdAt: string;
}

interface OperationalMetrics {
  totalReservations: number;
  pendingReservations: number;
  confirmedReservations: number;
  completedReservations: number;
  totalOutlets: number;
  totalMenuItems: number;
  availableMenuItems: number;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<OperationalMetrics | null>(null);
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([]);
  const [recentAudits, setRecentAudits] = useState<AuditItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token = localStorage.getItem('accessToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [resRes, outletsRes, menuRes, auditRes] = await Promise.all([
        fetch(`${API_URL}/reservations/admin`, { headers }),
        fetch(`${API_URL}/admin/outlets`, { headers }),
        fetch(`${API_URL}/admin/menu-items`, { headers }),
        fetch(`${API_URL}/admin/audit-events`, { headers }),
      ]);

      if (resRes.status === 401 || outletsRes.status === 401 || menuRes.status === 401 || auditRes.status === 401) {
        setError('Sesi autentikasi telah berakhir. Silakan login kembali.');
        return;
      }

      if (!resRes.ok && !outletsRes.ok && !menuRes.ok && !auditRes.ok) {
        setError('Gagal menghubungi server operasional.');
        return;
      }

      let reservationsList: Reservation[] = [];
      if (resRes.ok) {
        const json = await resRes.json();
        reservationsList = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
      }

      let outletsCount = 0;
      if (outletsRes.ok) {
        const json = await outletsRes.json();
        const outlets = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
        outletsCount = outlets.length;
      }

      let menuCount = 0;
      let availableCount = 0;
      if (menuRes.ok) {
        const json = await menuRes.json();
        const menuItems = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
        menuCount = menuItems.length;
        availableCount = menuItems.filter((i: { isAvailable?: boolean }) => i.isAvailable).length;
      }

      let auditList: AuditItem[] = [];
      if (auditRes.ok) {
        const json = await auditRes.json();
        auditList = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
      }

      const pending = reservationsList.filter((r) => r.status === 'pending').length;
      const confirmed = reservationsList.filter((r) => r.status === 'confirmed').length;
      const completed = reservationsList.filter((r) => r.status === 'completed').length;

      setMetrics({
        totalReservations: reservationsList.length,
        pendingReservations: pending,
        confirmedReservations: confirmed,
        completedReservations: completed,
        totalOutlets: outletsCount,
        totalMenuItems: menuCount,
        availableMenuItems: availableCount,
      });

      setRecentReservations(reservationsList.slice(0, 5));
      setRecentAudits(auditList.slice(0, 6));
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError('Gagal memuat sebagian data metrik operasional.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-8 h-8 border-2 border-[var(--brass)] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-[var(--muted)]">Memuat data operasional...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top operational banner */}
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--pandan)]" />
            <h1 className="text-lg font-bold text-[var(--sand)] tracking-tight">
              Ikhtisar Operasional Restoran
            </h1>
          </div>
          <p className="text-xs text-[var(--sand-muted)] mt-1">
            Status real-time reservasi meja, ketersediaan menu, dan aktivitas staf.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void fetchDashboardData()}
            className="btn-outline text-xs"
            title="Muat ulang data terkini"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Sinkron Data</span>
          </button>
          <Link href="/admin/reservations" className="btn-brass text-xs">
            Kelola Reservasi
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-[var(--chili-bg)] border border-[var(--chili-border)] text-[var(--chili-light)] px-4 py-3 rounded text-xs">
          {error}
        </div>
      )}

      {/* Honest Operational Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Pending */}
        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-mono mb-2">
            <span>PERLU RESPON</span>
            <span className="w-2 h-2 rounded-full bg-[var(--ochre)]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[var(--ochre)]">
            {metrics?.pendingReservations ?? 0}
          </div>
          <div className="text-[11px] text-[var(--sand-muted)] mt-1">Reservasi Pending</div>
        </div>

        {/* Confirmed */}
        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-mono mb-2">
            <span>TERKONFIRMASI</span>
            <span className="w-2 h-2 rounded-full bg-[var(--pandan)]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[var(--pandan-light)]">
            {metrics?.confirmedReservations ?? 0}
          </div>
          <div className="text-[11px] text-[var(--sand-muted)] mt-1">Reservasi Siap Meja</div>
        </div>

        {/* Total RSV */}
        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-mono mb-2">
            <span>TOTAL RESERVASI</span>
            <span className="text-[var(--brass)] font-mono text-xs">RSV</span>
          </div>
          <div className="font-mono text-2xl font-bold text-[var(--sand)]">
            {metrics?.totalReservations ?? 0}
          </div>
          <div className="text-[11px] text-[var(--sand-muted)] mt-1">Tercatat di Sistem</div>
        </div>

        {/* Completed */}
        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-mono mb-2">
            <span>SELESAI</span>
            <span className="text-[var(--sand-muted)] font-mono text-xs">OK</span>
          </div>
          <div className="font-mono text-2xl font-bold text-[var(--sand)]">
            {metrics?.completedReservations ?? 0}
          </div>
          <div className="text-[11px] text-[var(--sand-muted)] mt-1">Kunjungan Selesai</div>
        </div>

        {/* Cabang */}
        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-mono mb-2">
            <span>CABANG</span>
            <span className="text-[var(--brass)] font-mono text-xs">OUT</span>
          </div>
          <div className="font-mono text-2xl font-bold text-[var(--sand)]">
            {metrics?.totalOutlets ?? 0}
          </div>
          <div className="text-[11px] text-[var(--sand-muted)] mt-1">Outlet Operasional</div>
        </div>

        {/* Menu Items */}
        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-mono mb-2">
            <span>MENU AKTIF</span>
            <span className="text-[var(--pandan-light)] font-mono text-xs">READY</span>
          </div>
          <div className="font-mono text-2xl font-bold text-[var(--sand)]">
            {metrics?.availableMenuItems ?? 0} <span className="text-xs font-normal text-[var(--muted)]">/ {metrics?.totalMenuItems ?? 0}</span>
          </div>
          <div className="text-[11px] text-[var(--sand-muted)] mt-1">Item Siap Dipesan</div>
        </div>
      </div>

      {/* Main Grid: Recent Reservations & Recent Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Reservations (2 cols) */}
        <div className="lg:col-span-2 bg-[var(--panel)] border border-[var(--line)] rounded-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[var(--line)] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--sand)] tracking-tight">
                Reservasi Meja Terkini
              </h2>
              <p className="text-xs text-[var(--muted)]">
                Daftar antrean dan kedatangan tamu terbaru
              </p>
            </div>
            <Link
              href="/admin/reservations"
              className="text-xs font-mono text-[var(--brass)] hover:underline"
            >
              Lihat Semua →
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--line)] bg-[var(--panel-elevated)] text-[var(--sand-muted)] uppercase font-mono text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Kode</th>
                  <th className="py-2.5 px-3">Tamu</th>
                  <th className="py-2.5 px-3">Waktu Datang</th>
                  <th className="py-2.5 px-3">Lokasi / Meja</th>
                  <th className="py-2.5 px-3">Pax</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {recentReservations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[var(--muted)]">
                      Belum ada data reservasi masuk.
                    </td>
                  </tr>
                ) : (
                  recentReservations.map((r) => (
                    <tr key={r.id} className="hover:bg-[var(--panel-elevated)] transition-colors">
                      <td className="py-3 px-3 font-mono font-semibold text-[var(--brass)]">
                        {r.code}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-[var(--sand)]">{r.customer?.name}</div>
                        <div className="font-mono text-[11px] text-[var(--muted)]">{r.customer?.phone}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[var(--sand-muted)]">
                        {new Date(r.startAt).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-[var(--sand)]">{r.outlet?.name}</div>
                        <div className="font-mono text-[11px] text-[var(--muted)]">Meja {r.table?.tableNumber}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[var(--sand)]">
                        {r.partySize} orang
                      </td>
                      <td className="py-3 px-3">
                        {(() => {
                          const meta = getReservationStatusMeta(r.status);
                          return (
                            <span className={`badge-status ${meta.badgeClass}`}>
                              {meta.label}
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Audit Log Activity (1 col) */}
        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[var(--line)] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--sand)] tracking-tight">
                Jejak Mutasi Terakhir
              </h2>
              <p className="text-xs text-[var(--muted)]">
                Audit otomatis transaksi operasional
              </p>
            </div>
            <Link
              href="/admin/audit"
              className="text-xs font-mono text-[var(--brass)] hover:underline"
            >
              Semua Log →
            </Link>
          </div>

          <div className="p-4 flex-1 space-y-3">
            {recentAudits.length === 0 ? (
              <p className="text-xs text-center py-8 text-[var(--muted)]">
                Belum ada aktivitas mutasi tercatat.
              </p>
            ) : (
              recentAudits.map((a) => (
                <div
                  key={a.id}
                  className="p-2.5 rounded border border-[var(--line)] bg-[var(--panel-input)] text-xs"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-[var(--panel-elevated)] border border-[var(--line)] text-[var(--brass)]">
                      {a.action}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--muted)]">
                      {new Date(a.createdAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--sand-muted)] flex items-center justify-between">
                    <span>Entitas: <strong className="text-[var(--sand)] font-mono">{a.entityType}</strong></span>
                    <span className="font-mono text-[10px] text-[var(--muted)]">oleh {a.actorType}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Operational Quick Actions */}
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-lg p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--sand-muted)] font-mono mb-4">
          Aksi Cepat Operasional
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href="/admin/reservations"
            className="p-3 rounded border border-[var(--line)] bg-[var(--panel-input)] hover:border-[var(--brass-border)] hover:bg-[var(--panel-elevated)] transition-colors group"
          >
            <div className="text-xs font-semibold text-[var(--sand)] group-hover:text-[var(--brass)]">
              Verifikasi Antrean →
            </div>
            <div className="text-[11px] text-[var(--muted)] mt-1">
              Setujui atau tolak reservasi tamu pending
            </div>
          </Link>
          <Link
            href="/admin/menu"
            className="p-3 rounded border border-[var(--line)] bg-[var(--panel-input)] hover:border-[var(--brass-border)] hover:bg-[var(--panel-elevated)] transition-colors group"
          >
            <div className="text-xs font-semibold text-[var(--sand)] group-hover:text-[var(--brass)]">
              Atur Ketersediaan Menu →
            </div>
            <div className="text-[11px] text-[var(--muted)] mt-1">
              Tandai habis/ready hidangan Minang
            </div>
          </Link>
          <Link
            href="/admin/outlets"
            className="p-3 rounded border border-[var(--line)] bg-[var(--panel-input)] hover:border-[var(--brass-border)] hover:bg-[var(--panel-elevated)] transition-colors group"
          >
            <div className="text-xs font-semibold text-[var(--sand)] group-hover:text-[var(--brass)]">
              Konfigurasi Meja Cabang →
            </div>
            <div className="text-[11px] text-[var(--muted)] mt-1">
              Jam buka, dining area, dan kapasitas meja
            </div>
          </Link>
          <Link
            href="/admin/audit"
            className="p-3 rounded border border-[var(--line)] bg-[var(--panel-input)] hover:border-[var(--brass-border)] hover:bg-[var(--panel-elevated)] transition-colors group"
          >
            <div className="text-xs font-semibold text-[var(--sand)] group-hover:text-[var(--brass)]">
              Audit Mutasi Staf →
            </div>
            <div className="text-[11px] text-[var(--muted)] mt-1">
              Telusuri riwayat perubahan data dan actorId
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
