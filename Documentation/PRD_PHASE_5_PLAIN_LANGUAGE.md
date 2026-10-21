# PRD Phase 5 — Penguatan Sistem dan Persiapan Staging

## Ringkasan sederhana

Phase 5 bukan fase membuat fitur restoran baru. Phase ini adalah tahap **memastikan fitur yang sudah ada benar-benar aman, stabil, mudah dipakai, dan siap dites oleh banyak orang di staging** sebelum dibawa ke production.

Hasil akhir yang diharapkan adalah sebuah URL staging yang dapat dipakai tim untuk mencoba login admin, kelola restoran/menu, booking dari website, dan chat AI; bila ada error, tim bisa mengetahui penyebabnya tanpa membocorkan data pelanggan.

## Batasan penting

- Staging adalah environment terpisah untuk testing. Ini bukan database lokal dan bukan production.
- Data yang sudah ada tidak boleh dihapus, volume Docker tidak boleh di-reset, dan test memakai data fixture khusus.
- Phase ini tidak menambah fitur bisnis baru seperti pembayaran, notifikasi, atau desain ulang besar.

## Target Phase 5

| No. | Backlog | Yang akan dikerjakan | Harapan setelah selesai |
| --- | --- | --- | --- |
| 1 | Bug bash | Tim mencoba semua alur utama bersama-sama dan mencatat bug | Tidak ada bug blocker pada alur admin, booking web, atau AI |
| 2 | Deploy staging | Menjalankan frontend, backend, dan PostgreSQL di server/environment testing | Tim punya URL staging yang aman untuk dites bersama |
| 3 | Observability minimum | Menambahkan ID request dan log latency/error yang aman | Saat terjadi error, developer bisa menelusuri request yang bermasalah |
| 4 | Review keamanan | Memeriksa CORS, login/JWT, role admin, input, password, dan prompt AI | Akses tidak sah serta input berbahaya ditolak dengan aman |
| 5 | Aksesibilitas dan tes mobile | Menguji keyboard, modal, kontras, dan layar ponsel | User tetap bisa memakai alur utama tanpa mouse dan di layar kecil |
| 6 | Perbaikan prompt dari evaluasi AI | Menjalankan 30 skenario pertanyaan ke AI lalu memperbaiki instruksi/fallback | AI tidak mengarang informasi restoran atau menjalankan booking tanpa konfirmasi |
| 7 | Tes double booking dan concurrency | Mengirim banyak request booking yang sama secara bersamaan | Hanya satu reservasi yang boleh jadi untuk slot/meja yang sama |

---

## 1. Bug bash

### Yang akan dibuat/dikerjakan

Sesi testing internal dengan checklist untuk tiga kelompok alur:

1. Admin: login, dashboard, outlet, meja, menu, kategori, dan keputusan reservasi.
2. Customer website: lihat menu, cek ketersediaan, buat booking, cari/ubah/batalkan booking.
3. Customer AI: tanya informasi/menu, cek ketersediaan, dan booking lewat percakapan.

Setiap bug harus dicatat dengan langkah reproduksi, tingkat dampak, pemilik, dan statusnya.

### Harapan

Tidak ada bug yang membuat user tidak bisa login, tidak bisa booking, membuat data reservasi salah, atau membuat data customer terbuka.

### Selesai bila

- Semua alur utama sudah dicoba.
- Bug blocker dan severity tinggi sudah diperbaiki atau memiliki keputusan rilis yang jelas.
- Daftar bug tersisa memiliki owner dan prioritas.

---

## 2. Deploy staging

### Yang akan dibuat/dikerjakan

Menyiapkan environment testing terpisah berisi:

- Frontend Next.js.
- Backend NestJS.
- PostgreSQL.
- Environment variable/secret untuk database, JWT, CORS, dan LLM.
- Migration database yang dijalankan secara terkontrol.
- Health check dan prosedur rollback.

### Harapan

Tim dapat mengakses aplikasi dari URL staging tanpa menggunakan laptop/development database seseorang. Jika deploy gagal, versi sebelumnya dapat dipulihkan tanpa menghapus data.

### Selesai bila

- Ada URL frontend dan API staging yang aktif.
- Login, menu, availability, dan booking fixture berhasil diuji.
- Database staging berbeda dari lokal/production.
- Secret tidak ada di Git atau log.
- Dokumen deploy, migrate, health check, dan rollback tersedia.

### Yang membutuhkan pemegang staging/production

Pemilihan provider, akses akun, domain, secret manager, backup database, dan approval deploy. Ini tidak boleh diambil alih developer tanpa otorisasi.

---

## 3. Observability minimum

### Yang akan dibuat/dikerjakan

Backend akan menghasilkan log yang mudah dicari tanpa menyimpan data sensitif:

- Setiap request punya `request_id`.
- Log mencatat route, status HTTP, dan waktu respons.
- Log mencatat durasi operasi database dan tool AI.
- Password, JWT, dan nomor telepon lengkap tidak dicetak.

### Harapan

Saat tester melapor “booking gagal”, tim dapat mengirimkan request ID dan developer bisa menemukan jejak masalahnya dengan cepat.

### Selesai bila

- Response API mengandung `x-request-id`.
- Ada contoh log request, error, database, dan AI tool yang termasking.
- Error HTTP dapat dihitung berdasarkan route dan status.

---

## 4. Review keamanan

### Yang akan dibuat/dikerjakan

- Membatasi CORS hanya ke frontend yang diizinkan.
- Memastikan token login punya expiry dan refresh-token rotation yang benar.
- Menguji token invalid, expired, dan role admin yang salah.
- Memastikan password memakai bcrypt.
- Memastikan input API tervalidasi dan query database tidak dibangun dari string user.
- Memastikan AI tidak dapat dipaksa mengabaikan aturan, membocorkan secret, atau membuat booking tanpa konfirmasi.

### Harapan

Orang yang tidak berhak tidak dapat mengakses endpoint admin, dan input berbahaya tidak mengubah data atau membocorkan informasi.

### Selesai bila

- Security regression test lulus.
- CORS staging hanya menerima origin yang diizinkan.
- Refresh-token flow dan revocation/rotation terdokumentasi serta diuji.
- Tidak ada fallback secret development saat `NODE_ENV=production`.

---

## 5. Aksesibilitas dan tes mobile

### Yang akan dibuat/dikerjakan

Memeriksa alur utama pada layar mobile dan keyboard:

- `Tab` berpindah fokus secara masuk akal.
- `Enter` menjalankan aksi form yang terlihat.
- `Escape` menutup modal/drawer.
- Fokus kembali ke tombol pembuka saat modal ditutup.
- Label input dan tombol dapat dibaca screen reader.
- Teks dan tombol mempunyai kontras warna yang cukup.

### Harapan

Customer dan admin tetap dapat memakai aplikasi di ponsel dan tanpa mouse.

### Selesai bila

- Checklist keyboard selesai untuk login, menu, reservation, dan modal.
- Layout alur utama layak di viewport mobile.
- Temuan kontras WCAG AA penting sudah diperbaiki.

---

## 6. Perbaikan prompt dari evaluasi AI

### Yang akan dibuat/dikerjakan

Menjalankan 30 skenario evaluasi, misalnya tanya harga/menu, cabang, jam buka, availability, booking tanpa persetujuan, pembatalan tanpa verifikasi, dan prompt injection.

Setiap hasil mencatat:

- Pesan user.
- Tool yang seharusnya dipanggil atau tidak dipanggil.
- Respons AI.
- Status lulus/gagal.
- Perbaikan prompt/tool bila gagal.

### Harapan

AI menjawab fakta restoran dari tool/database, tidak mengarang harga atau ketersediaan, dan selalu menampilkan ringkasan sebelum booking dibuat.

### Selesai bila

- Semua 30 skenario dijalankan terhadap LLM yang dipakai staging.
- Tidak ada halusinasi fakta operasional.
- Tool error menghasilkan respons aman, bukan jawaban yang dibuat-buat.

---

## 7. Tes double booking dan concurrency

### Yang akan dibuat/dikerjakan

Menjalankan test beban dengan banyak request booking menuju meja dan waktu yang sama secara serentak. Test memakai tenant fixture staging khusus lalu membersihkannya.

### Harapan

Sistem tidak membuat dua booking aktif untuk slot yang sama, bahkan ketika banyak customer menekan tombol booking bersamaan.

### Selesai bila

- Request paralel menghasilkan tepat satu reservasi `pending` atau `confirmed` pada slot konflik.
- Request lain menerima konflik yang jelas, bukan error server 500.
- Error rate dan latency test dicatat.
- Data fixture dibersihkan tanpa menyentuh data operasional.

---

## Urutan kerja

1. Siapkan staging dan secret.
2. Tambahkan observability minimum.
3. Tutup security gap dan jalankan regression auth.
4. Jalankan test concurrency di staging.
5. Jalankan 30 evaluasi AI.
6. Audit mobile/accessibility.
7. Bug bash dan sign-off.

## Kriteria Phase 5 benar-benar selesai

Phase 5 hanya selesai jika tujuh backlog di atas memiliki bukti test, staging tersedia, tidak ada blocker/high severity dari bug bash, dan pemegang staging/production menyetujui hasil deploy.
