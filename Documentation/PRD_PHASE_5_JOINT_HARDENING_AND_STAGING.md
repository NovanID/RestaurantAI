# PRD — Phase 5: Joint Hardening & Staging

## Ringkasan

Phase 5 mempersiapkan RestaurantAI untuk diuji bersama di staging. Fokusnya bukan fitur baru, melainkan membuktikan alur yang sudah ada aman, tahan konkurensi, dapat diakses, dapat diamati, dan dapat dioperasikan di environment staging.

Sumber utama: [Linear project P-PRO-10](https://linear.app/wisss/project/phase-5-joint-hardening-and-staging-1db7b0b850b1). Project berstatus **Planned**, dengan target 14–24 Desember 2026. Semua issue saat PRD ini dibuat berstatus **Backlog**.

## Tujuan

1. Mencegah double booking secara andal dalam beban paralel.
2. Membuat respons AI selalu berbasis tool/database dan konsisten pada skenario evaluasi.
3. Memastikan alur admin, reservasi web, dan chat AI dapat digunakan pada mobile serta keyboard.
4. Menutup kelemahan keamanan paling penting sebelum staging.
5. Menyediakan log dan metrik minimum untuk mendiagnosis kegagalan.
6. Menjalankan frontend, backend, dan PostgreSQL di staging dengan secret yang aman.
7. Menyelesaikan defect prioritas dari bug bash internal.

## Ruang lingkup dan issue Linear

| Issue | Deliverable | Kriteria penerimaan |
| --- | --- | --- |
| [PRO-83](https://linear.app/wisss/issue/PRO-83/tes-double-booking-dan-konkurensi-final) | Skrip beban k6 atau Artillery untuk membuat reservasi ke slot/meja yang sama di staging. | Beban paralel memvalidasi exclusion constraint dan lock; tepat satu reservasi aktif (`pending`/`confirmed`) dapat dibuat untuk slot yang sama. Hasil test disimpan bersama ringkasan error rate/latensi. |
| [PRO-82](https://linear.app/wisss/issue/PRO-82/perbaikan-prompt-dari-hasil-evaluasi-ai) | Perbaikan prompt berdasarkan kegagalan pada 30 skenario evaluasi AI. | Semua skenario lulus: AI tidak mengarang harga, stok, availability, atau status; ringkasan respons konsisten; kegagalan tool menghasilkan fallback yang aman. |
| [PRO-81](https://linear.app/wisss/issue/PRO-81/aksesibilitas-dan-tes-mobile) | Audit keyboard, modal/drawer, kontras, dan layout mobile. | Tab order dapat dipakai, Enter menjalankan aksi yang terlihat, Escape menutup modal/drawer, kontras teks/aksi memenuhi WCAG AA, dan alur utama usable pada viewport mobile. |
| [PRO-80](https://linear.app/wisss/issue/PRO-80/review-keamanan) | Audit dan perbaikan CORS, JWT, refresh/rotation, validasi/sanitasi input, prompt injection, dan hash password staff. | Origin CORS dibatasi untuk staging; JWT expiry dan refresh-token flow tervalidasi; endpoint admin tetap menolak token/peran salah; input tidak diteruskan sebagai SQL/HTML tak tervalidasi; instruksi user tidak dapat mengambil alih batas tool AI; password memakai bcrypt hash. |
| [PRO-79](https://linear.app/wisss/issue/PRO-79/observability-minimum) | Structured log backend dengan `request_id`, latensi database/tool AI, dan metrik error HTTP. | Setiap request menghasilkan `request_id`; log tidak memuat password, token, atau nomor telepon penuh; latensi database dan tool AI dapat dicari; error HTTP dapat dihitung per route/status. |
| [PRO-78](https://linear.app/wisss/issue/PRO-78/deploy-staging) | Deployment frontend Next.js, backend NestJS, dan PostgreSQL staging. | Environment terpisah dari lokal; `DATABASE_URL`, JWT secret, dan API key hanya dari environment variable; migrasi dijalankan terkontrol; health check frontend/backend/database berhasil; rollback deployment terdokumentasi. |
| [PRO-77](https://linear.app/wisss/issue/PRO-77/bug-bash) | Sesi uji bersama dan daftar defect terprioritas. | Alur admin dashboard, booking web, dan booking via chat AI dijalankan end-to-end; tiap defect memiliki reproduksi, severity, owner, dan status; blocker selesai sebelum sign-off. |

## Pengguna dan alur yang harus dilindungi

- **Staff admin:** login, mengelola outlet/meja/menu, serta meninjau dan memutuskan reservasi.
- **Customer web:** memilih outlet, melihat menu/availability, membuat, melihat, mengubah, atau membatalkan reservasi.
- **Customer chat AI:** mendapat informasi restoran/menu dan menjalankan reservasi hanya lewat tool serta gerbang konfirmasi yang ada.
- **Operator staging:** dapat mengidentifikasi request gagal dan melakukan rollback tanpa melihat secret atau data sensitif.

## Batasan dan non-goals

- Tidak membuat fitur produk baru, notifikasi, billing, atau UI tema baru.
- Tidak menambah provider observability, platform deploy, atau dependency baru sebelum kebutuhan minimal tidak bisa dipenuhi dengan stack saat ini.
- Tidak melakukan load test terhadap production atau menggunakan data pelanggan nyata.
- Tidak mengubah kontrak API tanpa regression test pada caller frontend/AI terkait.

## Baseline teknis saat perencanaan

- PostgreSQL/Prisma sudah memiliki exclusion constraint reservasi dan migration awal.
- Tes konkurensi sudah ada di `apps/backend/test/reservation-concurrency.e2e-spec.ts` dan `apps/backend/src/reservations/reservations-concurrency.spec.ts`.
- Skenario evaluasi AI ada di `packages/shared/src/evaluations/scenarios.ts`.
- Chat, reservasi, auth, dan UI modal sudah ada; Phase 5 harus memperkuat, bukan mengganti, jalur tersebut.
- Repository belum memiliki konfigurasi deploy staging atau observability khusus; keduanya menjadi deliverable eksplisit Phase 5.

## Urutan pengerjaan

1. Tetapkan environment staging dan secret, lalu deploy baseline yang dapat di-health-check (PRO-78).
2. Jalankan test reservasi paralel terhadap staging dan perbaiki kegagalan integritas data (PRO-83).
3. Jalankan 30 evaluasi AI; perbaiki prompt/fallback berdasarkan hasilnya (PRO-82).
4. Audit keamanan sebelum membuka staging untuk bug bash (PRO-80).
5. Tambahkan observability minimum agar seluruh langkah berikutnya dapat ditelusuri (PRO-79).
6. Lakukan audit aksesibilitas/mobile terhadap alur yang sudah stabil (PRO-81).
7. Jalankan bug bash, prioritaskan blocker dan regresi, lalu lakukan sign-off (PRO-77).

## Definition of Done Phase 5

Phase 5 selesai bila seluruh issue di atas memenuhi acceptance criteria, deploy staging memakai secret non-lokal, dan bukti berikut tersedia:

- hasil load test dengan tepat satu reservasi aktif pada slot konflik;
- hasil 30 skenario evaluasi AI tanpa halusinasi fakta operasional;
- hasil checklist keyboard, modal, kontras, dan viewport mobile;
- hasil audit keamanan dan regression test auth/role;
- contoh log terstruktur yang dimasking serta ringkasan error/latensi;
- URL staging dan prosedur deploy, migrate, health-check, serta rollback;
- daftar bug bash tanpa blocker terbuka.

## Risiko dan keputusan terbuka

| Risiko | Mitigasi / keputusan yang diperlukan |
| --- | --- |
| Provider staging belum dipilih | Pilih satu platform sebelum PRO-78; PRD ini tidak mengunci Vercel/Railway/VPS. |
| Beban test mengotori staging | Gunakan tenant/data test khusus dan cleanup terkontrol setelah run. |
| Log membocorkan PII atau secret | Terapkan masking pada boundary logging dan review sampel log sebelum staging dibuka. |
| Perbaikan prompt menutupi bug tool | Pisahkan kegagalan prompt, tool, dan database pada hasil evaluasi. |
| Bug bash melebar | Hanya defect severity blocker/tinggi yang wajib selesai sebelum sign-off; sisanya masuk backlog dengan reproduksi. |
