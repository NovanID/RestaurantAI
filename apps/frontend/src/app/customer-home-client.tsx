'use client';

import { useState } from 'react';
import ReservationBookingModal from './components/reservation-booking-modal';
import ReservationManageModal from './components/reservation-manage-modal';
import ChatWidget from './components/chat-widget';

export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  priceIdr: number;
  imageUrl: string | null;
  category?: { name: string } | null;
};

export type Outlet = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  maxPartySize: number;
  openingHours?: Array<{
    weekday: number;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }>;
};

export default function CustomerHomeClient({
  menuItems,
  outlets,
  tenantId,
}: {
  menuItems: MenuItem[];
  outlets: Outlet[];
  tenantId: string;
}) {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('Semua');

  const categories = ['Semua', ...Array.from(new Set(menuItems.map((m) => m.category?.name).filter(Boolean)))];

  const filteredItems =
    activeCategory === 'Semua'
      ? menuItems
      : menuItems.filter((m) => m.category?.name === activeCategory);

  const weekdayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  return (
    <div className="min-h-screen bg-[#101614] text-[#ECE8AF] flex flex-col font-sans selection:bg-[#D98327]/30 selection:text-[#ECE8AF]">
      {/* Top Navigation */}
      <header className="border-b border-[#2d2924] bg-[#16201D]/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg border border-[#D98327]/60 bg-[#D98327]/10 flex items-center justify-center text-[#D98327] font-bold text-base tracking-widest font-mono">
              RM
            </div>
            <div>
              <span className="font-bold text-base tracking-wide uppercase text-[#ECE8AF] block">
                Rumah Makan Minang Asli
              </span>
              <span className="block text-[11px] text-[#4A943E] font-mono tracking-wider font-semibold">
                CITA RASA PUSAKA PADANG SEJAK 1982
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsManageOpen(true)}
              className="px-3.5 py-2 rounded-lg border border-[#3d332a] bg-[#101614] hover:border-[#D98327] text-xs font-semibold text-[#ECE8AF] tracking-wide transition font-mono"
            >
              Cek Reservasi
            </button>
            <button
              onClick={() => setIsBookingOpen(true)}
              className="px-4 py-2 rounded-lg bg-[#D98327] hover:bg-[#BF6F1C] text-black font-semibold text-xs tracking-wider uppercase transition shadow-lg shadow-[#D98327]/20"
            >
              Reservasi Meja
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative border-b border-[#2d2924] bg-gradient-to-b from-[#186049]/20 via-[#16201D] to-[#101614] py-16 sm:py-24 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#4A943E]/40 bg-[#186049]/30 text-[#ECE8AF] text-xs font-mono tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-[#4A943E] animate-pulse" />
            TERBUKA UNTUK RESERVASI KELUARGA & ACARA
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#ECE8AF] leading-tight">
            Warisan Kuliner Minang,
            <span className="block text-[#D98327] mt-2">Kelezatan Tanpa Kompromi.</span>
          </h1>

          <p className="mt-5 text-sm sm:text-base text-[#ECE8AF]/75 max-w-2xl mx-auto leading-relaxed">
            Nikmati sajian hidang otentik racikan rempah Bukittinggi, daging sapi pilihan, serta gulai berkuah kental khas Ranah Minang di seluruh cabang kami.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setIsBookingOpen(true)}
              className="px-6 py-3 rounded-xl bg-[#D98327] hover:bg-[#BF6F1C] text-black font-bold text-sm tracking-wider uppercase transition shadow-xl shadow-[#D98327]/20"
            >
              Pesan Meja Sekarang
            </button>
            <a
              href="#menu"
              className="px-6 py-3 rounded-xl border border-[#3d332a] bg-[#16201D] hover:border-[#D98327] text-sm font-semibold text-[#ECE8AF] tracking-wide transition"
            >
              Lihat Hidangan Etalase ↓
            </a>
          </div>
        </div>
      </section>

      {/* Outlet Locations & Hours Section (PRO-92) */}
      <section id="outlets" className="py-16 px-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between pb-6 border-b border-[#2d2924] mb-8">
          <div>
            <span className="text-xs uppercase font-mono tracking-widest text-[#D98327]">Cabang Kami</span>
            <h2 className="text-2xl font-bold tracking-tight text-[#ECE8AF] mt-1">Lokasi & Jam Operasional</h2>
          </div>
          <span className="text-xs font-mono text-[#ECE8AF]/60 hidden sm:inline-block">2 CABANG AKTIF</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {outlets.map((outlet) => (
            <div
              key={outlet.id}
              className="rounded-xl border border-[#2d2924] bg-[#16201D] p-6 space-y-4 hover:border-[#D98327]/50 transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-[#ECE8AF]">{outlet.name}</h3>
                  <p className="text-xs text-[#ECE8AF]/70 mt-1">{outlet.address || 'Jakarta Selatan'}</p>
                </div>
                <span className="px-2.5 py-1 rounded bg-[#186049] text-[#ECE8AF] text-[10px] font-mono uppercase font-bold tracking-wider">
                  Buka Tiap Hari
                </span>
              </div>

              <div className="pt-3 border-t border-[#2d2924] text-xs font-mono space-y-1.5 text-[#ECE8AF]/80">
                <div className="flex justify-between">
                  <span className="text-[#ECE8AF]/50">Telepon Meja:</span>
                  <span>{outlet.phone || '(021) 719-1234'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#ECE8AF]/50">WhatsApp Cabang:</span>
                  <span className="text-[#4A943E]">{outlet.whatsapp || '+62 812-9988-7766'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#ECE8AF]/50">Maks. Tamu per Meja:</span>
                  <span>{outlet.maxPartySize} Orang</span>
                </div>
              </div>

              {outlet.openingHours && outlet.openingHours.length > 0 && (
                <div className="pt-3 border-t border-[#2d2924]">
                  <p className="text-[10px] uppercase font-mono text-[#D98327] tracking-wider mb-2">Jadwal Operasional:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-[#ECE8AF]/70">
                    {outlet.openingHours.slice(0, 4).map((h) => (
                      <div key={h.weekday} className="bg-[#101614] p-1.5 rounded border border-[#2d2924]">
                        <span className="block text-[#ECE8AF]/50">{weekdayNames[h.weekday]}:</span>
                        <span>{h.isClosed ? 'Tutup' : `${h.openTime}-${h.closeTime}`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Menu Section (PRO-92) */}
      <section id="menu" className="py-16 px-6 max-w-6xl mx-auto w-full flex-1">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-6 border-b border-[#2d2924] gap-4">
          <div>
            <span className="text-xs uppercase font-mono tracking-widest text-[#D98327]">Etalase Hidang</span>
            <h2 className="text-2xl font-bold tracking-tight text-[#ECE8AF] mt-1">Daftar Menu Favorit</h2>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat || 'Semua')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  activeCategory === cat
                    ? 'bg-[#D98327] text-black'
                    : 'bg-[#16201D] text-[#ECE8AF]/70 hover:text-[#ECE8AF] border border-[#2d2924]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-[#2d2924] rounded-xl mt-8">
            <p className="text-xs font-mono text-[#ECE8AF]/50">Belum ada hidangan pada kategori ini.</p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="group rounded-xl border border-[#2d2924] bg-[#16201D] overflow-hidden flex flex-col hover:border-[#D98327]/50 transition"
              >
                {item.imageUrl ? (
                  <div className="w-full h-44 bg-[#101614] overflow-hidden relative">
                    <img
                      src={
                        item.imageUrl.startsWith('http')
                          ? item.imageUrl
                          : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${item.imageUrl}`
                      }
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur border border-white/10 text-[10px] font-mono text-[#ECE8AF]">
                      Tersedia
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-36 bg-[#101614] flex items-center justify-center border-b border-[#2d2924] text-xs font-mono text-[#ECE8AF]/40">
                    Sajian Tradisional Minang
                  </div>
                )}

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-[#ECE8AF] text-base group-hover:text-[#D98327] transition">
                        {item.name}
                      </h4>
                      <span className="font-mono text-xs font-bold text-[#D98327] whitespace-nowrap">
                        Rp {Number(item.priceIdr).toLocaleString('id-ID')}
                      </span>
                    </div>
                    {item.description && (
                      <p className="mt-1 text-xs text-[#ECE8AF]/70 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#2d2924] flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#ECE8AF]/50">{item.category?.name || 'Menu Utama'}</span>
                    <span className="text-[#4A943E] font-semibold">Siap Hidang</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2d2924] bg-[#16201D] py-8 px-6 text-center text-xs text-[#ECE8AF]/50 font-mono">
        <p>© 2026 Rumah Makan Minang Asli. Hak Cipta Dilindungi Adat & Undang-Undang.</p>
        <p className="mt-1 text-[10px]">Didukung Sistem Reservasi Digital & Rancak AI</p>
      </footer>

      {/* Booking Modal (PRO-91) */}
      <ReservationBookingModal
        outlets={outlets}
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
      />

      {/* Manage/Cancel Modal (PRO-90) */}
      <ReservationManageModal
        isOpen={isManageOpen}
        onClose={() => setIsManageOpen(false)}
      />

      {/* Floating AI Chat Widget (PRO-89) */}
      <ChatWidget tenantId={tenantId} />
    </div>
  );
}
