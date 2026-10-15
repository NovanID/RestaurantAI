import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#11100f] text-[#ede6db] flex flex-col font-sans selection:bg-[#c89b3c]/30 selection:text-[#ede6db]">
      {/* Top Header Navigation */}
      <header className="border-b border-[#2d2924] bg-[#181614]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded border border-[#c89b3c]/40 bg-[#c89b3c]/10 flex items-center justify-center text-[#c89b3c] font-semibold text-sm tracking-widest font-mono">
              RM
            </div>
            <div>
              <span className="font-semibold text-sm tracking-wide uppercase text-[#ede6db]">
                Rumah Makan Minang
              </span>
              <span className="block text-[10px] text-[#7d7365] font-mono tracking-wider">
                MASAKAN PADANG OTENTIK SEJAK 1982
              </span>
            </div>
          </div>

          <nav className="flex items-center space-x-6">
            <Link
              href="/admin/login"
              className="text-xs font-medium text-[#b8ad9e] hover:text-[#c89b3c] transition-colors"
            >
              Portal Petugas
            </Link>
            <Link
              href="/admin/login"
              className="px-4 py-2 text-xs font-semibold rounded bg-[#c89b3c] text-[#11100f] hover:bg-[#e0b457] transition-all tracking-wide"
            >
              Masuk Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-16 sm:py-24 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#c89b3c]/30 bg-[#c89b3c]/10 text-[#c89b3c] text-xs font-mono tracking-wide mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#52b788] animate-pulse" />
          SISTEM OPERASIONAL MEJA & ETALASE
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#ede6db] max-w-3xl leading-tight">
          Cita Rasa Minang Asli,
          <span className="block text-[#c89b3c] mt-2">Dikelola dengan Presisi Modern.</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-[#b8ad9e] max-w-2xl leading-relaxed">
          Platform manajemen pemesanan meja, ketersediaan hidangan etalase, dan buku reservasi tamu untuk seluruh cabang Rumah Makan Padang.
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            href="/admin/login"
            className="px-6 py-3.5 text-sm font-semibold rounded bg-[#c89b3c] text-[#11100f] hover:bg-[#e0b457] transition-all shadow-lg tracking-wide text-center"
          >
            Buka Panel Operasional
          </Link>
          <a
            href="#tentang"
            className="px-6 py-3.5 text-sm font-medium rounded border border-[#2d2924] bg-[#181614] text-[#ede6db] hover:border-[#c89b3c]/40 hover:bg-[#201e1a] transition-all text-center"
          >
            Pelajari Sistem
          </a>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full text-left">
          <div className="p-6 rounded-lg border border-[#2d2924] bg-[#181614]">
            <div className="w-8 h-8 rounded border border-[#c89b3c]/30 bg-[#c89b3c]/10 flex items-center justify-center text-[#c89b3c] font-mono text-sm mb-4">
              01
            </div>
            <h3 className="text-sm font-semibold text-[#ede6db] mb-2">Buku Meja & Reservasi</h3>
            <p className="text-xs text-[#b8ad9e] leading-relaxed">
              Pencegahan bentrok meja tamu (*anti double-booking*) dengan validasi slot otomatis dan konfirmasi cepat.
            </p>
          </div>

          <div className="p-6 rounded-lg border border-[#2d2924] bg-[#181614]">
            <div className="w-8 h-8 rounded border-[#52b788]/30 bg-[#52b788]/10 flex items-center justify-center text-[#52b788] font-mono text-sm mb-4">
              02
            </div>
            <h3 className="text-sm font-semibold text-[#ede6db] mb-2">Etalase Hidangan Dinamis</h3>
            <p className="text-xs text-[#b8ad9e] leading-relaxed">
              Pembaruan stok rendang, ayam pop, dan lauk utama langsung dari kasir untuk mencegah salah pesan.
            </p>
          </div>

          <div className="p-6 rounded-lg border border-[#2d2924] bg-[#181614]">
            <div className="w-8 h-8 rounded border-[#e05747]/30 bg-[#e05747]/10 flex items-center justify-center text-[#e05747] font-mono text-sm mb-4">
              03
            </div>
            <h3 className="text-sm font-semibold text-[#ede6db] mb-2">Multi-Cabang & Jejak Audit</h3>
            <p className="text-xs text-[#b8ad9e] leading-relaxed">
              Setiap mutasi harga, meja, dan persetujuan pesanan tercatat transaksional dengan jejak audit akuntabel.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2d2924] py-8 text-center text-xs text-[#7d7365] font-mono">
        <p>© 2026 Rumah Makan Minang Asli. Seluruh hak cipta dilindungi.</p>
      </footer>
    </div>
  );
}
