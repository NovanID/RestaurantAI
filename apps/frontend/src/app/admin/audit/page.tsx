'use client';

import { useCallback, useEffect, useState } from 'react';

interface AuditEvent {
  id: string;
  tenantId: string;
  actorType: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  createdAt: string;
}

const ENTITY_TYPES = [
  { value: '', label: 'Semua Tipe Entitas' },
  { value: 'reservation', label: 'Reservasi (reservation)' },
  { value: 'menu_item', label: 'Item Menu (menu_item)' },
  { value: 'category', label: 'Kategori (category)' },
  { value: 'outlet', label: 'Cabang (outlet)' },
  { value: 'opening_hours', label: 'Jam Operasional (opening_hours)' },
  { value: 'dining_area', label: 'Area Makan (dining_area)' },
  { value: 'restaurant_table', label: 'Meja Restoran (restaurant_table)' },
];

export default function AuditLogPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [selectedEntity, setSelectedEntity] = useState('');
  const [actionSearch, setActionSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const fetchAuditEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token = localStorage.getItem('accessToken');
      
      const params = new URLSearchParams();
      if (selectedEntity) params.set('entityType', selectedEntity);
      if (actionSearch.trim()) params.set('action', actionSearch.trim());

      const response = await fetch(`${API_URL}/admin/audit-events?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Gagal memuat jejak audit dari server.');
      }

      const json = await response.json();
      const list = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
      setEvents(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [actionSearch, selectedEntity]);

  useEffect(() => {
    void fetchAuditEvents();
  }, [fetchAuditEvents]);

  return (
    <div className="space-y-6 antialiased">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--sand)]">
            Audit Trail & Jejak Aktivitas
          </h1>
          <p className="text-xs text-[var(--sand-muted)] mt-1">
            Log rekaman mutasi data operasional: actorId, perubahan nilai (before/after), dan waktu mutasi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void fetchAuditEvents()}
            disabled={loading}
            className="btn-outline text-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Segarkan Log</span>
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-mono uppercase text-[var(--muted)] mb-1">
              Filter Tipe Entitas
            </label>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="w-full field-input text-xs"
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-[var(--muted)] mb-1">
              Cari Nama Aksi Mutasi
            </label>
            <input
              type="text"
              value={actionSearch}
              onChange={(e) => setActionSearch(e.target.value)}
              placeholder="mis. updated, created, confirmed..."
              className="w-full field-input text-xs font-mono"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => void fetchAuditEvents()}
              className="btn-brass text-xs w-full py-2.5"
            >
              Terapkan Filter
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-[var(--chili-bg)] border border-[var(--chili-border)] text-[var(--chili-light)] px-4 py-3 rounded text-xs">
          {error}
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--line)] bg-[var(--panel-elevated)] text-[var(--sand-muted)] uppercase font-mono text-[11px]">
              <tr>
                <th className="py-3 px-4">Waktu (WIB)</th>
                <th className="py-3 px-4">Nama Aksi</th>
                <th className="py-3 px-4">Entitas & ID</th>
                <th className="py-3 px-4">Pelaku (Actor)</th>
                <th className="py-3 px-4">Snapshot Data</th>
                <th className="py-3 px-4 text-right">Rincian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {loading ? (
                <tr>
                  <td className="p-8 text-center text-[var(--muted)]" colSpan={6}>
                    <div className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-[var(--brass)] border-t-transparent rounded-full animate-spin" />
                      <span className="font-mono">Menelusuri rekaman audit...</span>
                    </div>
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td className="p-8 text-center text-[var(--muted)]" colSpan={6}>
                    Belum ada rekaman audit mutasi untuk kriteria yang dipilih.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr
                    key={event.id}
                    className="hover:bg-[var(--panel-elevated)] transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="py-3 px-4 font-mono text-[var(--sand-muted)] whitespace-nowrap">
                      {new Date(event.createdAt).toLocaleString('id-ID', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[var(--brass-bg)] border border-[var(--brass-border)] text-[var(--brass)]">
                        {event.action}
                      </span>
                    </td>

                    {/* Entity */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-[var(--sand)]">{event.entityType}</div>
                      {event.entityId && (
                        <div className="font-mono text-[10px] text-[var(--muted)] truncate max-w-[140px]" title={event.entityId}>
                          {event.entityId}
                        </div>
                      )}
                    </td>

                    {/* Actor */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-[var(--panel-input)] border border-[var(--line)] text-[var(--sand-muted)]">
                          {event.actorType}
                        </span>
                      </div>
                      {event.actorId && (
                        <div className="font-mono text-[10px] text-[var(--muted)] truncate max-w-[140px] mt-0.5" title={event.actorId}>
                          ID: {event.actorId}
                        </div>
                      )}
                    </td>

                    {/* Summary of changes */}
                    <td className="py-3 px-4 text-[11px] text-[var(--muted)] max-w-xs truncate">
                      {event.before && event.after ? (
                        <span className="text-[var(--sand-muted)]">Perubahan tercatat (before → after)</span>
                      ) : event.after ? (
                        <span className="text-[var(--pandan-light)]">Entitas baru dibuat</span>
                      ) : event.before ? (
                        <span className="text-[var(--chili-light)]">Entitas dihapus/dinonaktifkan</span>
                      ) : (
                        <span>-</span>
                      )}
                    </td>

                    {/* Detail Modal trigger */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedEvent(event)}
                        className="text-xs font-mono text-[var(--brass)] hover:underline"
                      >
                        Lihat Diff →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-[var(--line)] bg-[var(--panel-elevated)] flex items-center justify-between text-[11px] text-[var(--muted)] font-mono">
          <span>Menampilkan {events.length} jejak audit</span>
          <span>Batas query: 100 rekaman terbaru</span>
        </div>
      </div>

      {/* Detail JSON Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[var(--panel)] border border-[var(--line-strong)] rounded-lg max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-[var(--line)] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--sand)]">
                  Rincian Mutasi Operasional
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xs text-[var(--brass)] font-semibold">{selectedEvent.action}</span>
                  <span className="text-[var(--muted)] text-xs">·</span>
                  <span className="font-mono text-[11px] text-[var(--sand-muted)]">{selectedEvent.entityType}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-[var(--muted)] hover:text-[var(--sand)] text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs border border-[var(--line)] bg-[var(--panel-input)] p-3 rounded font-mono">
              <div>
                <span className="text-[var(--muted)]">Event ID:</span> {selectedEvent.id}
              </div>
              <div>
                <span className="text-[var(--muted)]">Waktu:</span> {new Date(selectedEvent.createdAt).toLocaleString('id-ID')}
              </div>
              <div>
                <span className="text-[var(--muted)]">Actor:</span> {selectedEvent.actorType} ({selectedEvent.actorId || '-'})
              </div>
              <div>
                <span className="text-[var(--muted)]">Entity ID:</span> {selectedEvent.entityId || '-'}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {/* Before state */}
              <div>
                <div className="text-[11px] font-mono uppercase text-[var(--muted)] mb-1">
                  Kondisi Sebelum (Before):
                </div>
                <pre className="p-3 bg-[var(--ironwood)] border border-[var(--line)] rounded font-mono text-[11px] text-[var(--sand-muted)] overflow-x-auto">
                  {selectedEvent.before ? JSON.stringify(selectedEvent.before, null, 2) : '(kosong / entitas baru)'}
                </pre>
              </div>

              {/* After state */}
              <div>
                <div className="text-[11px] font-mono uppercase text-[var(--muted)] mb-1">
                  Kondisi Sesudah (After):
                </div>
                <pre className="p-3 bg-[var(--ironwood)] border border-[var(--line)] rounded font-mono text-[11px] text-[var(--sand)] overflow-x-auto">
                  {selectedEvent.after ? JSON.stringify(selectedEvent.after, null, 2) : '(kosong / entitas dihapus)'}
                </pre>
              </div>
            </div>

            <div className="border-t border-[var(--line)] pt-3 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="btn-outline text-xs"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
