'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ConfirmationModal } from '../../../components/confirmation-modal';
import { useParams } from 'next/navigation';

interface Outlet {
  id: string;
  name: string;
  slug: string;
  address?: string;
}

interface OpeningHour {
  id?: string;
  outletId: string;
  weekday: number; // 0 = Sunday, 6 = Saturday
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

interface DiningArea {
  id: string;
  name: string;
  createdAt: string;
}

interface RestaurantTable {
  id: string;
  tableNumber: string;
  capacity: number;
  status: 'active' | 'inactive';
  area?: DiningArea | null;
}

const WEEKDAYS_ID = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

export default function OutletSettingsPage() {
  const params = useParams();
  const outletId = (params?.id as string) || '';

  const [loading, setLoading] = useState(true);
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);
  const [areas, setAreas] = useState<DiningArea[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [activeTab, setActiveTab] = useState<'hours' | 'areas' | 'tables'>('hours');
  const [error, setError] = useState<string | null>(null);

  const fetchOutletData = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    setError(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token = localStorage.getItem('accessToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [outletRes, hoursRes, areasRes, tablesRes] = await Promise.all([
        fetch(`${API_URL}/admin/outlets/${outletId}`, { headers }),
        fetch(`${API_URL}/admin/outlets/${outletId}/opening-hours`, { headers }),
        fetch(`${API_URL}/admin/outlets/${outletId}/areas`, { headers }),
        fetch(`${API_URL}/admin/outlets/${outletId}/tables`, { headers }),
      ]);

      if (!outletRes.ok) throw new Error('Cabang outlet tidak ditemukan.');

      const outletJson = await outletRes.json();
      setOutlet(outletJson.data || outletJson);

      if (hoursRes.ok) {
        const hJson = await hoursRes.json();
        setOpeningHours(Array.isArray(hJson) ? hJson : (Array.isArray(hJson?.data) ? hJson.data : []));
      }
      if (areasRes.ok) {
        const aJson = await areasRes.json();
        setAreas(Array.isArray(aJson) ? aJson : (Array.isArray(aJson?.data) ? aJson.data : []));
      }
      if (tablesRes.ok) {
        const tJson = await tablesRes.json();
        setTables(Array.isArray(tJson) ? tJson : (Array.isArray(tJson?.data) ? tJson.data : []));
      }
    } catch (err: unknown) {
      console.error('Failed to fetch outlet details:', err);
      setError(err instanceof Error ? err.message : 'Gagal memuat pengaturan cabang.');
    } finally {
      setLoading(false);
    }
  }, [outletId]);

  useEffect(() => {
    void fetchOutletData();
  }, [fetchOutletData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-8 h-8 border-2 border-[var(--brass)] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-[var(--muted)]">Memuat konfigurasi outlet...</p>
      </div>
    );
  }

  if (!outlet) {
    return (
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-lg p-8 text-center space-y-3">
        <p className="text-sm text-[var(--sand)]">Outlet tidak ditemukan atau akses tidak sah.</p>
        <Link href="/admin/outlets" className="btn-outline text-xs inline-flex">
          ← Kembali ke Daftar Cabang
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 antialiased">
      {/* Header */}
      <div>
        <Link 
          href="/admin/outlets" 
          className="text-xs font-mono text-[var(--muted)] hover:text-[var(--sand)] inline-flex items-center gap-1.5 mb-3"
        >
          <span>←</span>
          <span>Kembali ke Daftar Cabang</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--sand)]">
              {outlet.name} — Pengaturan Operasional
            </h1>
            <p className="text-xs text-[var(--sand-muted)] mt-1 font-mono">
              slug: @{outlet.slug} · ID: {outlet.id}
            </p>
          </div>
          <span className="badge-status active">
            Cabang Terhubung
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-[var(--chili-bg)] border border-[var(--chili-border)] text-[var(--chili-light)] px-4 py-3 rounded text-xs">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-[var(--line)]">
        <nav className="flex space-x-6 text-xs">
          <button
            onClick={() => setActiveTab('hours')}
            className={`pb-3 font-medium transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'hours'
                ? 'border-[var(--brass)] text-[var(--brass)] font-semibold'
                : 'border-transparent text-[var(--sand-muted)] hover:text-[var(--sand)]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Jam Buka & Operasional</span>
          </button>

          <button
            onClick={() => setActiveTab('areas')}
            className={`pb-3 font-medium transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'areas'
                ? 'border-[var(--brass)] text-[var(--brass)] font-semibold'
                : 'border-transparent text-[var(--sand-muted)] hover:text-[var(--sand)]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Area Makan ({areas.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tables')}
            className={`pb-3 font-medium transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'tables'
                ? 'border-[var(--brass)] text-[var(--brass)] font-semibold'
                : 'border-transparent text-[var(--sand-muted)] hover:text-[var(--sand)]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span>Tata Letak Meja ({tables.length})</span>
          </button>
        </nav>
      </div>

      {/* Tab 1: Hours */}
      {activeTab === 'hours' && (
        <OpeningHoursSection
          outletId={outletId}
          initialHours={openingHours}
          onSaved={() => void fetchOutletData()}
        />
      )}

      {/* Tab 2: Areas */}
      {activeTab === 'areas' && (
        <AreasSection
          outletId={outletId}
          areas={areas}
          onRefresh={() => void fetchOutletData()}
        />
      )}

      {/* Tab 3: Tables */}
      {activeTab === 'tables' && (
        <TablesSection
          outletId={outletId}
          areas={areas}
          tables={tables}
          onRefresh={() => void fetchOutletData()}
        />
      )}
    </div>
  );
}

// Sub-component 1: Opening Hours
function OpeningHoursSection({
  outletId,
  initialHours,
  onSaved,
}: {
  outletId: string;
  initialHours: OpeningHour[];
  onSaved: () => void;
}) {
  const [hours, setHours] = useState<OpeningHour[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // Fill all 7 weekdays
    const completeHours: OpeningHour[] = [];
    for (let i = 0; i < 7; i++) {
      const found = initialHours.find((h) => h.weekday === i);
      completeHours.push(
        found || {
          outletId,
          weekday: i,
          openTime: '10:00',
          closeTime: '22:00',
          isClosed: false,
        },
      );
    }
    setHours(completeHours);
  }, [initialHours, outletId]);

  const handleToggleClosed = (weekday: number, isClosed: boolean) => {
    setHours((prev) =>
      prev.map((h) => (h.weekday === weekday ? { ...h, isClosed } : h)),
    );
  };

  const handleTimeChange = (
    weekday: number,
    field: 'openTime' | 'closeTime',
    val: string,
  ) => {
    setHours((prev) =>
      prev.map((h) => (h.weekday === weekday ? { ...h, [field]: val } : h)),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token = localStorage.getItem('accessToken');

      const payload = hours.map((h) => ({
        weekday: h.weekday,
        openTime: h.openTime,
        closeTime: h.closeTime,
        isClosed: h.isClosed,
      }));

      const res = await fetch(`${API_URL}/admin/outlets/${outletId}/opening-hours`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMsg('Jadwal operasional berhasil disimpan.');
        onSaved();
      } else {
        alert('Gagal menyimpan jam operasional.');
      }
    } catch (err) {
      console.error('Save hours error:', err);
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-lg overflow-hidden space-y-4">
      <div className="p-4 border-b border-[var(--line)] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--sand)]">Jadwal Mingguan Cabang</h2>
          <p className="text-xs text-[var(--muted)]">Atur rentang jam layanan buka dan hari libur</p>
        </div>
        {msg && <span className="text-xs font-mono text-[var(--pandan-light)]">{msg}</span>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[var(--line)] bg-[var(--panel-elevated)] text-[var(--sand-muted)] uppercase font-mono text-[11px]">
            <tr>
              <th className="py-2.5 px-4">Hari</th>
              <th className="py-2.5 px-4">Status Buka</th>
              <th className="py-2.5 px-4">Jam Buka</th>
              <th className="py-2.5 px-4">Jam Tutup</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {hours.map((h) => (
              <tr key={h.weekday} className="hover:bg-[var(--panel-elevated)] transition-colors">
                <td className="py-3 px-4 font-semibold text-[var(--sand)]">
                  {WEEKDAYS_ID[h.weekday]}
                </td>
                <td className="py-3 px-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!h.isClosed}
                      onChange={(e) => handleToggleClosed(h.weekday, !e.target.checked)}
                      className="accent-[var(--brass)]"
                    />
                    <span className={`badge-status ${!h.isClosed ? 'active' : 'inactive'}`}>
                      {!h.isClosed ? 'Buka' : 'Tutup'}
                    </span>
                  </label>
                </td>
                <td className="py-3 px-4">
                  {!h.isClosed ? (
                    <input
                      type="time"
                      value={h.openTime}
                      onChange={(e) => handleTimeChange(h.weekday, 'openTime', e.target.value)}
                      className="field-input font-mono text-xs py-1"
                    />
                  ) : (
                    <span className="text-[var(--muted)] font-mono">-</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {!h.isClosed ? (
                    <input
                      type="time"
                      value={h.closeTime}
                      onChange={(e) => handleTimeChange(h.weekday, 'closeTime', e.target.value)}
                      className="field-input font-mono text-xs py-1"
                    />
                  ) : (
                    <span className="text-[var(--muted)] font-mono">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-[var(--panel-elevated)] border-t border-[var(--line)] flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-brass text-xs"
        >
          {saving ? 'Menyimpan Jadwal...' : 'Simpan Jadwal Operasional'}
        </button>
      </div>
    </div>
  );
}

// Sub-component 2: Dining Areas
function AreasSection({
  outletId,
  areas,
  onRefresh,
}: {
  outletId: string;
  areas: DiningArea[];
  onRefresh: () => void;
}) {
  const [newAreaName, setNewAreaName] = useState('');
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editingAreaName, setEditingAreaName] = useState('');
  const [areaToDelete, setAreaToDelete] = useState<DiningArea | null>(null);
  const [creating, setCreating] = useState(false);
  const [savingArea, setSavingArea] = useState(false);
  const [deletingArea, setDeletingArea] = useState(false);

  const handleAddArea = async () => {
    if (!newAreaName.trim()) return;
    setCreating(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token = localStorage.getItem('accessToken');

      const res = await fetch(`${API_URL}/admin/outlets/${outletId}/areas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newAreaName.trim() }),
      });

      if (res.ok) {
        setNewAreaName('');
        onRefresh();
      } else {
        alert('Gagal membuat area makan baru.');
      }
    } catch (err) {
      console.error('Create area error:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateArea = async () => {
    if (!editingAreaId || !editingAreaName.trim()) return;
    setSavingArea(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/admin/areas/${editingAreaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editingAreaName.trim() }),
      });
      if (res.ok) {
        setEditingAreaId(null);
        onRefresh();
      }
    } catch (err) {
      console.error('Update area error:', err);
    } finally {
      setSavingArea(false);
    }
  };

  const handleDeleteArea = async () => {
    if (!areaToDelete) return;
    setDeletingArea(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/admin/areas/${areaToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAreaToDelete(null);
        onRefresh();
      }
    } catch (err) {
      console.error('Delete area error:', err);
    } finally {
      setDeletingArea(false);
    }
  };

  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-lg p-5 space-y-5">
      <div className="border-b border-[var(--line)] pb-3">
        <h2 className="text-sm font-semibold text-[var(--sand)]">Area Makan Restoran</h2>
        <p className="text-xs text-[var(--muted)]">Zonasi penempatan meja (Indoor AC, Lesehan VIP, Outdoor Teras)</p>
      </div>

      <div className="flex gap-2 max-w-md">
        <input
          type="text"
          value={newAreaName}
          onChange={(e) => setNewAreaName(e.target.value)}
          placeholder="Nama area baru (mis. Ruang VIP Gadang)..."
          className="flex-1 field-input text-xs"
          onKeyDown={(e) => e.key === 'Enter' && void handleAddArea()}
        />
        <button
          onClick={handleAddArea}
          disabled={creating || !newAreaName.trim()}
          className="btn-brass text-xs shrink-0"
        >
          {creating ? 'Menambah...' : '+ Tambah Area'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {areas.length === 0 ? (
          <p className="text-xs text-[var(--muted)] col-span-3 py-6 text-center">
            Belum ada area makan yang dibuat untuk cabang ini.
          </p>
        ) : (
          areas.map((area) => (
            <div
              key={area.id}
              className="p-3 rounded border border-[var(--line)] bg-[var(--panel-input)] flex items-center justify-between"
            >
              <div className="min-w-0 flex-1 mr-2">
                {editingAreaId === area.id ? (
                  <div className="flex gap-1.5">
                    <input
                      value={editingAreaName}
                      onChange={(e) => setEditingAreaName(e.target.value)}
                      className="field-input text-xs py-1 min-w-0"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleUpdateArea();
                        if (e.key === 'Escape') setEditingAreaId(null);
                      }}
                    />
                    <button type="button" onClick={() => void handleUpdateArea()} disabled={savingArea} className="text-[var(--pandan-light)] text-xs">Simpan</button>
                    <button type="button" onClick={() => setEditingAreaId(null)} className="text-[var(--muted)] text-xs">Batal</button>
                  </div>
                ) : (
                  <>
                    <span className="font-semibold text-xs text-[var(--sand)] block">{area.name}</span>
                    <span className="text-[10px] font-mono text-[var(--muted)]">
                      Dibuat {new Date(area.createdAt).toLocaleDateString('id-ID')}
                    </span>
                  </>
                )}
              </div>
              {editingAreaId !== area.id && (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => { setEditingAreaId(area.id); setEditingAreaName(area.name); }} className="text-[var(--brass)] text-xs hover:underline">Ubah</button>
                  <button type="button" onClick={() => setAreaToDelete(area)} className="text-[var(--chili-light)] text-xs hover:underline">Hapus</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      <ConfirmationModal
        isOpen={Boolean(areaToDelete)}
        title="Hapus Area Makan"
        message={`Area ${areaToDelete?.name || ''} akan dihapus. Meja yang masih berada di area ini akan dilepas dari zonasi, bukan dihapus.`}
        confirmLabel="Hapus Area"
        isLoading={deletingArea}
        onConfirm={() => void handleDeleteArea()}
        onCancel={() => setAreaToDelete(null)}
      />
    </div>
  );
}

// Sub-component 3: Tables
function TablesSection({
  outletId,
  areas,
  tables,
  onRefresh,
}: {
  outletId: string;
  areas: DiningArea[];
  tables: RestaurantTable[];
  onRefresh: () => void;
}) {
  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [areaId, setAreaId] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [editNumber, setEditNumber] = useState('');
  const [editCapacity, setEditCapacity] = useState(4);
  const [editAreaId, setEditAreaId] = useState('');
  const [tableToDelete, setTableToDelete] = useState<RestaurantTable | null>(null);
  const [savingTable, setSavingTable] = useState(false);
  const [deletingTable, setDeletingTable] = useState(false);

  const handleAddTable = async () => {
    if (!tableNumber.trim()) return;
    setCreating(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token = localStorage.getItem('accessToken');

      const res = await fetch(`${API_URL}/admin/outlets/${outletId}/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tableNumber: tableNumber.trim(),
          capacity: Number(capacity) || 4,
          areaId: areaId || undefined,
        }),
      });

      if (res.ok) {
        setTableNumber('');
        setAreaId('');
        onRefresh();
      } else {
        const errorJson = await res.json().catch(() => ({}));
        alert(errorJson?.error?.message || 'Gagal menambahkan meja baru.');
      }
    } catch (err) {
      console.error('Create table error:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleSaveTable = async () => {
    if (!editingTable || !editNumber.trim()) return;
    setSavingTable(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/admin/tables/${editingTable.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tableNumber: editNumber.trim(), capacity: editCapacity, areaId: editAreaId || null }),
      });
      if (res.ok) {
        setEditingTable(null);
        onRefresh();
      }
    } catch (err) {
      console.error('Update table error:', err);
    } finally {
      setSavingTable(false);
    }
  };

  const handleDeleteTable = async () => {
    if (!tableToDelete) return;
    setDeletingTable(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/admin/tables/${tableToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTableToDelete(null);
        onRefresh();
      }
    } catch (err) {
      console.error('Delete table error:', err);
    } finally {
      setDeletingTable(false);
    }
  };

  const handleToggleTable = async (tableId: string, currentStatus: 'active' | 'inactive') => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token = localStorage.getItem('accessToken');

      const res = await fetch(`${API_URL}/admin/tables/${tableId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: currentStatus === 'active' ? 'inactive' : 'active',
        }),
      });

      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Toggle table error:', err);
    }
  };

  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-lg space-y-4 overflow-hidden">
      <div className="p-4 border-b border-[var(--line)]">
        <h2 className="text-sm font-semibold text-[var(--sand)]">Konfigurasi Meja Makan</h2>
        <p className="text-xs text-[var(--muted)]">Nomor meja unik, kapasitas kursi (pax), dan penetapan area</p>
      </div>

      {/* Add table form */}
      <div className="p-4 border-b border-[var(--line)] bg-[var(--panel-elevated)] flex flex-wrap gap-2 items-center">
        <input
          type="text"
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
          placeholder="No. Meja (mis. M01)"
          className="field-input font-mono text-xs w-36"
        />

        <select
          value={capacity}
          onChange={(e) => setCapacity(Number(e.target.value))}
          className="field-input font-mono text-xs w-32"
        >
          {[1, 2, 4, 6, 8, 10, 12, 16].map((n) => (
            <option key={n} value={n}>{n} pax</option>
          ))}
        </select>

        <select
          value={areaId}
          onChange={(e) => setAreaId(e.target.value)}
          className="field-input text-xs w-44"
        >
          <option value="">(Tanpa Area Khusus)</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        <button
          onClick={handleAddTable}
          disabled={creating || !tableNumber.trim()}
          className="btn-brass text-xs"
        >
          {creating ? 'Menyimpan...' : '+ Tambah Meja'}
        </button>
      </div>

      {/* Table list */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[var(--line)] bg-[var(--panel-elevated)] text-[var(--sand-muted)] uppercase font-mono text-[11px]">
            <tr>
              <th className="py-2.5 px-4">No. Meja</th>
              <th className="py-2.5 px-4">Area Zonasi</th>
              <th className="py-2.5 px-4">Kapasitas Tamu</th>
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {tables.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[var(--muted)]">
                  Belum ada meja yang terdaftar untuk cabang ini.
                </td>
              </tr>
            ) : (
              tables.map((t) => editingTable?.id === t.id ? (
                <tr key={t.id} className="bg-[var(--panel-elevated)]">
                  <td className="py-2 px-2"><input className="field-input font-mono text-xs" value={editNumber} onChange={(e) => setEditNumber(e.target.value)} aria-label="Nomor meja" /></td>
                  <td className="py-2 px-2">
                    <select className="field-input text-xs" value={editAreaId} onChange={(e) => setEditAreaId(e.target.value)}>
                      <option value="">Tanpa area</option>
                      {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </td>
                  <td className="py-2 px-2">
                    <select className="field-input font-mono text-xs" value={editCapacity} onChange={(e) => setEditCapacity(Number(e.target.value))}>
                      {[1, 2, 4, 6, 8, 10, 12, 16].map((n) => <option key={n} value={n}>{n} pax</option>)}
                    </select>
                  </td>
                  <td className="py-2 px-2 text-[var(--muted)] text-xs">Simpan perubahan</td>
                  <td className="py-2 px-2 text-right whitespace-nowrap">
                    <button type="button" onClick={() => void handleSaveTable()} disabled={savingTable || !editNumber.trim()} className="text-[var(--pandan-light)] text-xs mr-2">Simpan</button>
                    <button type="button" onClick={() => setEditingTable(null)} className="text-[var(--muted)] text-xs">Batal</button>
                  </td>
                </tr>
              ) : (
                <tr key={t.id} className="hover:bg-[var(--panel-elevated)] transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold text-[var(--brass)]">
                    {t.tableNumber}
                  </td>
                  <td className="py-3 px-4">
                    {t.area?.name || <span className="text-[var(--muted)] font-mono">—</span>}
                  </td>
                  <td className="py-3 px-4 font-mono text-[var(--sand)]">
                    {t.capacity} orang
                  </td>
                  <td className="py-3 px-4">
                    <span className={`badge-status ${t.status === 'active' ? 'active' : 'inactive'}`}>
                      {t.status === 'active' ? 'Siap Digunakan' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => { setEditingTable(t); setEditNumber(t.tableNumber); setEditCapacity(t.capacity); setEditAreaId(t.area ? t.area.id : ''); }}
                      className="text-xs font-mono text-[var(--brass)] hover:underline mr-3"
                    >
                      Ubah
                    </button>
                    <button
                      onClick={() => setTableToDelete(t)}
                      className="text-xs font-mono text-[var(--chili-light)] hover:underline mr-3"
                    >
                      Hapus
                    </button>
                    <button
                      onClick={() => void handleToggleTable(t.id, t.status)}
                      className={`text-xs font-mono hover:underline ${
                        t.status === 'active' ? 'text-[var(--chili-light)]' : 'text-[var(--pandan-light)]'
                      }`}
                    >
                      {t.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmationModal
        isOpen={Boolean(tableToDelete)}
        title="Hapus / Nonaktifkan Meja"
        message={`Meja ${tableToDelete?.tableNumber || ''} akan dihapus. Jika meja pernah memiliki riwayat reservasi, sistem otomatis menonaktifkan statusnya agar riwayat tamu tetap utuh.`}
        confirmLabel="Hapus Meja"
        isLoading={deletingTable}
        onConfirm={() => void handleDeleteTable()}
        onCancel={() => setTableToDelete(null)}
      />
    </div>
  );
}
