'use client';

import { useEffect, useState } from 'react';

type ReservationDetail = {
  id: string;
  code: string;
  status: string;
  startAt: string;
  partySize: number;
  notes: string | null;
  outlet: {
    name: string;
    changeCutoffMinutes: number;
  };
  table: {
    tableNumber: string;
  };
  customer: {
    name: string;
    phone: string;
  };
};

export default function ReservationManageModal({
  isOpen,
  onClose,
  tenantId,
}: {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
}) {
  const [code, setCode] = useState('');
  const [phoneLast4, setPhoneLast4] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);

  // Edit fields
  const [isEditing, setIsEditing] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editPartySize, setEditPartySize] = useState(2);
  const [editNotes, setEditNotes] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setActionSuccess(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    try {
      const res = await fetch(`${apiUrl}/reservations/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({ code: code.trim().toUpperCase(), phoneLast4: phoneLast4.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Reservasi tidak ditemukan atau 4 digit telepon tidak cocok.');
      }
      const data = json.data ?? json;
      setReservation(data);

      const local = new Date(new Date(data.startAt).getTime() + 7 * 60 * 60_000).toISOString();
      setEditDate(local.slice(0, 10));
      setEditTime(local.slice(11, 16));
      setEditPartySize(data.partySize);
      setEditNotes(data.notes || '');
    } catch (err: any) {
      setError(err.message || 'Verifikasi gagal');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservation) return;
    setLoading(true);
    setError(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    try {
      const res = await fetch(`${apiUrl}/reservations/${encodeURIComponent(reservation.code)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({
          phoneLast4: phoneLast4.trim(),
          date: editDate,
          time: editTime,
          partySize: Number(editPartySize),
          notes: editNotes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Gagal mengubah jadwal reservasi.');
      }
      setActionSuccess('Jadwal reservasi berhasil diperbarui.');
      setIsEditing(false);
      // Refresh
      const updated = json.data ?? json;
      setReservation((prev) => (prev ? { ...prev, ...updated } : updated));
    } catch (err: any) {
      setError(err.message || 'Gagal mengubah reservasi.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!reservation) return;
    if (!window.confirm('Yakin ingin membatalkan reservasi ini?')) return;
    setLoading(true);
    setError(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    try {
      const res = await fetch(`${apiUrl}/reservations/${encodeURIComponent(reservation.code)}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({ phoneLast4: phoneLast4.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Gagal membatalkan reservasi.');
      }
      setActionSuccess('Reservasi berhasil dibatalkan.');
      setReservation((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
    } catch (err: any) {
      setError(err.message || 'Gagal membatalkan reservasi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="manage-reservation-modal-title">
      <div className="relative w-full max-w-lg rounded-xl border border-[#3d332a] bg-[#16201D] text-[#ECE8AF] shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2d2924]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4A943E]" />
            <h2 id="manage-reservation-modal-title" className="text-lg font-bold uppercase tracking-wider text-[#ECE8AF]">
              Cek & Kelola Reservasi
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup dialog kelola reservasi"
            className="w-8 h-8 rounded-full border border-[#3d332a] flex items-center justify-center text-[#ECE8AF]/60 hover:text-[#ECE8AF] hover:border-[#D98327] transition"
          >
            ✕
          </button>
        </div>

        {!reservation ? (
          <form onSubmit={handleVerify} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#ECE8AF]/70 mb-1">
                Kode Reservasi (Tiket)
              </label>
              <input
                type="text"
                placeholder="Contoh: RSV-A1B2C3"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full rounded-lg bg-[#101614] border border-[#3d332a] px-3 py-2 text-sm text-[#ECE8AF] focus:border-[#D98327] focus:outline-none font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#ECE8AF]/70 mb-1">
                4 Digit Terakhir Nomor Telepon
              </label>
              <input
                type="text"
                maxLength={4}
                placeholder="Contoh: 7890"
                value={phoneLast4}
                onChange={(e) => setPhoneLast4(e.target.value)}
                className="w-full rounded-lg bg-[#101614] border border-[#3d332a] px-3 py-2 text-sm text-[#ECE8AF] focus:border-[#D98327] focus:outline-none font-mono"
                required
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 font-mono bg-red-950/40 border border-red-900/50 p-2 rounded">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#D98327] hover:bg-[#BF6F1C] text-black font-semibold text-sm transition"
            >
              {loading ? 'Memverifikasi...' : 'Cari Data Reservasi'}
            </button>
          </form>
        ) : (
          <div className="mt-4 space-y-4">
            {actionSuccess && (
              <div className="p-3 rounded-lg text-xs font-mono border border-[#4A943E]/40 bg-[#186049]/30 text-[#ECE8AF]">
                {actionSuccess}
              </div>
            )}

            {/* Reservation details */}
            <div className="bg-[#101614] border border-[#2d2924] rounded-lg p-4 space-y-2 text-sm font-mono">
              <div className="flex justify-between items-center border-b border-[#2d2924] pb-2">
                <span className="text-[#D98327] font-bold text-base">{reservation.code}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                    reservation.status === 'confirmed'
                      ? 'bg-[#186049] text-[#ECE8AF]'
                      : reservation.status === 'cancelled'
                      ? 'bg-red-950 text-red-400'
                      : 'bg-amber-950/60 text-amber-400'
                  }`}
                >
                  {reservation.status}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#ECE8AF]/60">Cabang:</span>
                <span className="text-[#ECE8AF]">{reservation.outlet?.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#ECE8AF]/60">Pemesan:</span>
                <span className="text-[#ECE8AF]">{reservation.customer?.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#ECE8AF]/60">Telepon:</span>
                <span className="text-[#ECE8AF] font-mono">
                  {reservation.customer?.phone?.replace(/(\d{4})\d+(\d{4})/, '$1****$2')}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#ECE8AF]/60">Jumlah Tamu:</span>
                <span className="text-[#ECE8AF]">{reservation.partySize} Orang</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#ECE8AF]/60">Jadwal:</span>
                <span className="text-[#ECE8AF]">
                  {new Date(reservation.startAt).toLocaleDateString('id-ID', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  • {new Date(reservation.startAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                </span>
              </div>
              {reservation.notes && (
                <div className="pt-2 border-t border-[#2d2924] text-xs text-[#ECE8AF]/80 italic font-sans">
                  "{reservation.notes}"
                </div>
              )}
            </div>

            {/* Actions if eligible */}
            {['pending', 'confirmed'].includes(reservation.status) && (
              <div className="space-y-3 pt-2">
                {!isEditing ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="py-2 rounded-lg border border-[#D98327] bg-[#D98327]/10 hover:bg-[#D98327]/20 text-[#D98327] text-xs font-semibold uppercase tracking-wider transition"
                    >
                      Ubah Jadwal
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={loading}
                      className="py-2 rounded-lg border border-red-900/60 bg-red-950/20 hover:bg-red-950/40 text-red-400 text-xs font-semibold uppercase tracking-wider transition"
                    >
                      Batalkan Booking
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleUpdate} className="space-y-3 p-3 bg-[#101614] rounded-lg border border-[#3d332a]">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#ECE8AF]/60 mb-1">
                          Tanggal Baru
                        </label>
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="w-full rounded bg-[#16201D] border border-[#3d332a] px-2 py-1.5 text-xs text-[#ECE8AF] font-mono"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#ECE8AF]/60 mb-1">
                          Jam Baru
                        </label>
                        <input
                          type="time"
                          value={editTime}
                          onChange={(e) => setEditTime(e.target.value)}
                          className="w-full rounded bg-[#16201D] border border-[#3d332a] px-2 py-1.5 text-xs text-[#ECE8AF] font-mono"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#ECE8AF]/60 mb-1">
                        Jumlah Tamu Baru
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={editPartySize}
                        onChange={(e) => setEditPartySize(Number(e.target.value))}
                        className="w-full rounded bg-[#16201D] border border-[#3d332a] px-2 py-1.5 text-xs text-[#ECE8AF] font-mono"
                        required
                      />
                    </div>
                    {error && (
                      <p className="text-[10px] text-red-400 font-mono bg-red-950/40 border border-red-900/50 p-1.5 rounded">
                        {error}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-1.5 rounded bg-[#D98327] hover:bg-[#BF6F1C] text-black font-semibold text-xs transition"
                      >
                        {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1.5 rounded border border-[#3d332a] text-[#ECE8AF]/70 text-xs hover:text-[#ECE8AF]"
                      >
                        Batal
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            <button
              onClick={() => {
                setReservation(null);
                setIsEditing(false);
                setError(null);
                setActionSuccess(null);
              }}
              className="w-full py-2 text-xs text-[#ECE8AF]/60 hover:text-[#ECE8AF] underline transition"
            >
              Cari Reservasi Lain
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
