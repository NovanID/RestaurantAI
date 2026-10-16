import { Suspense } from 'react';

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  priceIdr: number;
  imageUrl: string | null;
  category?: { name: string } | null;
};

async function getMenu(): Promise<MenuItem[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  try {
    const tenantId = process.env.PUBLIC_MENU_TENANT_ID;
    if (!tenantId) return [];

    const response = await fetch(`${apiUrl}/menu?tenant_id=${encodeURIComponent(tenantId)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload) ? payload : payload.data ?? [];
  } catch {
    return [];
  }
}

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

        {/* Public Menu */}
        <section className="mt-24 w-full text-left" aria-labelledby="menu-title">
          <div className="flex items-end justify-between gap-4 border-b border-[#2d2924] pb-4">
            <div>
              <p className="text-xs font-mono tracking-widest text-[#c89b3c] uppercase">Dari dapur kami</p>
              <h2 id="menu-title" className="mt-2 text-2xl sm:text-3xl font-bold text-[#ede6db]">Menu Andalan</h2>
            </div>
            <span className="text-xs text-[#7d7365] font-mono">ETALASE HARIAN</span>
          </div>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Suspense fallback={<p role="status">Memuat menu…</p>}>
              <PublicMenu />
            </Suspense>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#2d2924] py-8 text-center text-xs text-[#7d7365] font-mono">
        <p>© 2026 Rumah Makan Minang Asli. Seluruh hak cipta dilindungi.</p>
      </footer>
    </div>
  );
}

async function PublicMenu() {
  const menu = await getMenu();
  const backendBase = new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1').origin;

  return menu.length > 0 ? (
    menu.map((item) => {
      const fullImageUrl = item.imageUrl
        ? item.imageUrl.startsWith('http')
          ? item.imageUrl
          : `${backendBase}/${item.imageUrl.replace(/^\//, '')}`
        : null;

      return (
        <article
          key={item.id}
          className="rounded-lg border border-[#2d2924] bg-[#181614] overflow-hidden hover:border-[#c89b3c]/50 transition-colors flex flex-col"
        >
          {fullImageUrl ? (
            <div className="w-full h-40 bg-[#16201d] overflow-hidden border-b border-[#2d2924] relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fullImageUrl}
                alt={item.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="w-full h-24 bg-[#16201d]/60 border-b border-[#2d2924] flex items-center justify-center text-[#7d7365] font-mono text-xs tracking-wider">
              <span>MINANG HERITAGE</span>
            </div>
          )}

          <div className="p-5 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[#7d7365]">
                    {item.category?.name || 'Hidangan'}
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-[#ede6db]">{item.name}</h3>
                </div>
                <span className="shrink-0 text-xs font-mono text-[#c89b3c]">
                  Rp {item.priceIdr.toLocaleString('id-ID')}
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#b8ad9e]">
                {item.description || 'Masakan Minang dengan racikan bumbu rempah otentik.'}
              </p>
            </div>
          </div>
        </article>
      );
    })
  ) : (
    <p className="col-span-full rounded-lg border border-dashed border-[#2d2924] p-8 text-center text-sm text-[#7d7365]">
      Menu sedang disiapkan. Silakan datang dan nikmati hidangan hari ini.
    </p>
  );
}
