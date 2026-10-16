'use client';

import { useState } from 'react';

type AvailabilityTable = {
  id: string;
  tableNumber: string;
  capacity: number;
  area?: { name: string };
};

type Outlet = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  maxPartySize: number;
};

export default function ReservationBookingModal({
  outlets,
  isOpen,
  onClose,
}: {
  outlets: Outlet[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const [selectedOutlet, setSelectedOutlet] = useState<string>(outlets[0]?.id || '');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState<string>('12:00');
  const [partySize, setPartySize] = useState<number>(2);

  // Flow states
  const [checking, setChecking] = useState(false);
  const [tablesAvailable, setTablesAvailable] = useState<AvailabilityTable[] | null>(null);
  const [checkMessage, setCheckMessage] = useState<string>('');

  // Customer form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<{
    code: string;
    outletName: string;
    date: string;
    time: string;
    partySize: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentOutlet = outlets.find((o) => o.id === selectedOutlet) || outlets[0];

  const handleCheckAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setCheckMessage('');
    setError(null);
    setTablesAvailable(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    try {
      const res = await fetch(
        `${apiUrl}/availability?outletId=${encodeURIComponent(selectedOutlet)}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}&partySize=${encodeURIComponent(partySize)}`,
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Pengecekan meja gagal');
      }

      const isAvail = json.available ?? (json.data && json.data.available);
      const tables = json.tables ?? (json.data && json.data.tables) ?? [];

      if (isAvail && tables.length > 0) {
        setTablesAvailable(tables);
        setCheckMessage('Meja tersedia! Silakan lengkapi identitas pemesan di bawah.');
      } else {
        setTablesAvailable([]);
        setCheckMessage(json.message || 'Maaf, meja pada jam dan tanggal tersebut telah terisi penuh.');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setChecking(false);
    }
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    try {
      const idempotencyKey = `web-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const res = await fetch(`${apiUrl}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outletId: selectedOutlet,
          date,
          time,
          partySize,
          name,
          phone,
          notes: notes.trim() || undefined,
          idempotencyKey,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Gagal memproses reservasi.');
      }

      const resData = json.data ?? json;
      setBookingSuccess({
        code: resData.code,
        outletName: currentOutlet?.name || 'Cabang Restoran',
        date,
        time,
        partySize,
      });
    } catch (err: any) {
      setError(err.message || 'Gagal membuat reservasi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl rounded-xl border border-[#3d332a] bg-[#16201D] text-[#ECE8AF] shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2d2924]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D98327]" />
            <h2 className="text-lg font-bold uppercase tracking-wider text-[#ECE8AF]">
              {bookingSuccess ? 'Tiket Reservasi Terbit' : 'Reservasi Meja Makan'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#3d332a] flex items-center justify-center text-[#ECE8AF]/60 hover:text-[#ECE8AF] hover:border-[#D98327] transition"
          >
            ✕
          </button>
        </div>

        {bookingSuccess ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#186049] border border-[#4A943E] mx-auto flex items-center justify-center text-2xl text-[#ECE8AF]">
              ✓
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-[#D98327] font-semibold">Kode Booking Anda</p>
              <h3 className="text-3xl font-mono font-bold tracking-wider text-[#ECE8AF] mt-1">
                {bookingSuccess.code}
              </h3>
            </div>
            <div className="bg-[#101614] border border-[#2d2924] rounded-lg p-4 text-left text-sm space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-[#ECE8AF]/60">Cabang:</span>
                <span className="text-[#ECE8AF]">{bookingSuccess.outletName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#ECE8AF]/60">Jadwal:</span>
                <span className="text-[#ECE8AF]">{bookingSuccess.date} • {bookingSuccess.time} WIB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#ECE8AF]/60">Jumlah Tamu:</span>
                <span className="text-[#ECE8AF]">{bookingSuccess.partySize} Orang</span>
              </div>
            </div>
            <p className="text-xs text-[#ECE8AF]/70 max-w-sm mx-auto">
              Simpan kode reservasi ini. Uni/Uda dapat melihat, mengubah, atau membatalkan reservasi lewat tombol 'Cek Reservasi' dengan 4 digit nomor telepon terakhir.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-lg bg-[#D98327] hover:bg-[#BF6F1C] text-black font-semibold text-sm transition"
            >
              Tutup & Selesai
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {/* Step 1: Check Availability */}
            <form onSubmit={handleCheckAvailability} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#ECE8AF]/70 mb-1">
                    Cabang Restoran
                  </label>
                  <select
                    value={selectedOutlet}
                    onChange={(e) => setSelectedOutlet(e.target.value)}
                    className="w-full rounded-lg bg-[#101614] border border-[#3d332a] px-3 py-2 text-sm text-[#ECE8AF] focus:border-[#D98327] focus:outline-none font-sans"
                  >
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#ECE8AF]/70 mb-1">
                    Jumlah Tamu
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={currentOutlet?.maxPartySize || 12}
                    value={partySize}
                    onChange={(e) => setPartySize(Number(e.target.value))}
                    className="w-full rounded-lg bg-[#101614] border border-[#3d332a] px-3 py-2 text-sm text-[#ECE8AF] focus:border-[#D98327] focus:outline-none font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#ECE8AF]/70 mb-1">
                    Tanggal Kedatangan
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg bg-[#101614] border border-[#3d332a] px-3 py-2 text-sm text-[#ECE8AF] focus:border-[#D98327] focus:outline-none font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#ECE8AF]/70 mb-1">
                    Jam (WIB)
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-lg bg-[#101614] border border-[#3d332a] px-3 py-2 text-sm text-[#ECE8AF] focus:border-[#D98327] focus:outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={checking}
                className="w-full py-2.5 rounded-lg border border-[#D98327] bg-[#D98327]/10 hover:bg-[#D98327]/20 text-[#D98327] font-semibold text-sm transition"
              >
                {checking ? 'Mengecek Meja...' : 'Cek Ketersediaan Meja'}
              </button>
            </form>

            {/* Check Feedback */}
            {checkMessage && (
              <div
                className={`p-3 rounded-lg text-xs font-mono border ${
                  tablesAvailable && tablesAvailable.length > 0
                    ? 'border-[#4A943E]/40 bg-[#186049]/30 text-[#ECE8AF]'
                    : 'border-red-900/40 bg-red-950/20 text-red-300'
                }`}
              >
                {checkMessage}
              </div>
            )}

            {/* Step 2: Customer Details Form */}
            {tablesAvailable && tablesAvailable.length > 0 && (
              <form onSubmit={handleCreateReservation} className="pt-3 border-t border-[#2d2924] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#ECE8AF]/70 mb-1">
                      Nama Pemesan
                    </label>
                    <input
                      type="text"
                      placeholder="Uda / Uni..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg bg-[#101614] border border-[#3d332a] px-3 py-2 text-sm text-[#ECE8AF] focus:border-[#D98327] focus:outline-none font-sans"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#ECE8AF]/70 mb-1">
                      Nomor Telepon / WhatsApp
                    </label>
                    <input
                      type="tel"
                      placeholder="0812xxxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-lg bg-[#101614] border border-[#3d332a] px-3 py-2 text-sm text-[#ECE8AF] focus:border-[#D98327] focus:outline-none font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#ECE8AF]/70 mb-1">
                    Catatan Khusus (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Dekat jendela, kursi bayi, dll"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-lg bg-[#101614] border border-[#3d332a] px-3 py-2 text-sm text-[#ECE8AF] focus:border-[#D98327] focus:outline-none font-sans"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-400 font-mono bg-red-950/40 border border-red-900/50 p-2 rounded">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-lg bg-[#D98327] hover:bg-[#BF6F1C] text-black font-semibold text-sm transition"
                >
                  {submitting ? 'Memproses Booking...' : 'Konfirmasi & Terbitkan Tiket Reservasi'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
