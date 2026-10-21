# PRD Handoff — Phase 5: Hardening, Staging, dan Production Readiness

## Tujuan dokumen

Dokumen ini adalah handoff untuk engineer yang akan memegang development staging/production RestaurantAI. Fokusnya menutup backlog Phase 5 tanpa mengulang fitur yang sudah bekerja, tanpa reset database, dan tanpa mengubah data yang ada.

Sumber backlog: Linear project **Phase 5: Joint Hardening & Staging**.

## Kondisi proyek saat handoff

### Environment lokal yang sudah terverifikasi

- PostgreSQL berjalan di Docker container `restaurant_ai_postgres` dan sehat.
- Port host database adalah `15432`; database `restaurant_ai`.
- Prisma migration `0_init` sudah diterapkan.
- Backend dan frontend production build pernah lulus.
- E2E backend lulus: `2` suite, `2` test.
- Unit test concurrency reservasi lulus.
- Tidak ada data fixture concurrency yang tertinggal di database.

### Implementasi yang sudah ada

- Constraint PostgreSQL mencegah reservasi aktif yang overlap pada meja yang sama.
- Reservasi memakai advisory transaction lock per outlet/tanggal, lalu mengecek ulang availability di transaksi.
- Test e2e mengirim 50 request paralel ke slot yang sama dan memverifikasi tepat 1 sukses dan 49 respons `409 SLOT_TAKEN`.
- CORS memakai `CORS_ORIGIN`; jangan mengembalikan `origin: '*'` bersama `credentials: true`.
- Password staff diverifikasi memakai bcrypt.
- JWT access token berumur 15 menit.
- DTO validation dan guard role admin sudah ada.
- AI tool call sudah menyimpan latency serta masking data sensitif pada tabel `ai_tool_calls`.
- Prompt AI memaksa tool-first untuk fakta operasional dan menolak prompt injection.
- Katalog `EVALUATION_SCENARIOS_V0` berisi 30 skenario.
- Modal customer booking/kelola reservasi mempunyai Escape dan semantik dialog; modal admin memakai native `<dialog>`.

## Batas operasional

1. Jangan menjalankan `docker compose down -v`, `prisma migrate reset`, atau perintah yang menghapus volume/data.
2. Jangan memakai database lokal sebagai staging atau production.
3. Semua secret hanya lewat environment variable/provider secret manager; tidak pernah di-commit.
4. Jalankan migration terkontrol sebelum deploy aplikasi yang bergantung pada perubahan schema.
5. Test beban hanya terhadap tenant fixture khusus, lalu cleanup tenant fixture tersebut.
6. Jangan menandai issue Linear selesai hanya karena kode ada; simpan bukti command, hasil test, URL staging, dan defect log.

## Backlog yang harus diselesaikan

| Linear | Status saat handoff | Deliverable yang masih diperlukan | Bukti selesai |
| --- | --- | --- | --- |
| PRO-77 Bug bash | Belum dilakukan | Checklist dan sesi test admin, customer web, dan AI; defect log dengan severity, owner, status | Tidak ada blocker/high defect terbuka untuk flow utama |
| PRO-78 Deploy staging | Belum ada staging | Pilih provider, konfigurasi backend/frontend/database staging, secret, migration, health check, rollback | URL staging, health check lulus, prosedur deploy/rollback terdokumentasi |
| PRO-79 Observability minimum | Sebagian: latency AI tool | `request_id`, log HTTP terstruktur/masked, latency Prisma, ringkasan error per route/status | Contoh log yang dapat ditelusuri tanpa password/token/telepon penuh |
| PRO-80 Review keamanan | Sebagian: CORS/bcrypt/DTO/JWT expiry/guard | Refresh-token rotation, test token expired/invalid/role salah, review input/prompt-injection | Security regression lulus dan tidak ada secret fallback di production |
| PRO-81 Aksesibilitas dan tes mobile | Sebagian: modal utama | Audit keyboard, fokus, Enter/Escape, kontras WCAG AA, viewport mobile alur utama | Checklist hasil browser/device dan defect penting selesai |
| PRO-82 Prompt AI dari evaluasi | Spesifikasi/prompt tersedia | Runner 30 skenario ke LLM staging dengan rekam tool call, expected behavior, fallback tool error | Hasil 30/30 atau daftar defect yang diselesaikan |
| PRO-83 Double booking/concurrency | Lokal selesai | Skrip load test k6/Artillery yang aman dan eksekusi terhadap staging | Ringkasan error rate/latency dan tepat 1 reservasi aktif untuk slot konflik |

## Urutan kerja yang disarankan

1. **PRO-78 baseline staging:** pilih provider dan deploy database/backend/frontend terpisah dengan secret non-lokal.
2. **PRO-79 observability:** pasang request correlation/log masked sebelum test lain, agar semua error staging bisa ditelusuri.
3. **PRO-80 security:** selesaikan refresh rotation dan regression auth/role sebelum staging dibuka untuk tester.
4. **PRO-83:** jalankan load test pada tenant fixture staging; jangan sentuh tenant/data operasional.
5. **PRO-82:** jalankan evaluasi AI ke LLM yang benar-benar dipakai staging.
6. **PRO-81:** audit alur stabil di mobile dan keyboard.
7. **PRO-77:** bug bash terakhir, perbaiki blocker/high severity, lalu sign-off.

## Konfigurasi staging/production minimum

### Backend

- `DATABASE_URL`: URL database environment target, bukan localhost.
- `JWT_SECRET`: secret unik, panjang, dan tidak memakai fallback development.
- `JWT_EXPIRES_IN`: access-token expiry eksplisit.
- `REFRESH_TOKEN_SECRET` dan `REFRESH_TOKEN_EXPIRES_IN`: diperlukan saat refresh rotation diimplementasikan.
- `CORS_ORIGIN`: origin frontend staging/production yang eksplisit, dipisahkan koma bila lebih dari satu.
- `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`: hanya lewat secret provider.
- `PORT` dan `NODE_ENV=production`.

### Frontend

- `NEXT_PUBLIC_API_URL`: URL API environment yang benar, termasuk `/api/v1`.
- Jangan memasukkan secret backend/LLM dalam variabel `NEXT_PUBLIC_*`.

### Database

- Backup/snapshot sebelum migration yang mengubah schema.
- Akun aplikasi memakai kredensial khusus environment dan least privilege.
- Pastikan extension `btree_gist` tersedia karena diperlukan exclusion constraint reservasi.

## Prosedur deployment

1. Review perubahan dan jalankan build/test yang relevan di CI.
2. Backup/snapshot database staging bila migration akan berjalan.
3. Set atau verifikasi environment variable melalui provider secret manager.
4. Jalankan `npx prisma migrate deploy` dari artefak/backend release.
5. Deploy backend; verifikasi endpoint health/base API dan koneksi database.
6. Deploy frontend dengan `NEXT_PUBLIC_API_URL` yang menunjuk backend target.
7. Verifikasi login admin, baca menu, availability, buat reservation fixture, dan AI read-only tool call.
8. Jalankan PRO-83 dan catat hasilnya.

## Health check minimum

- Database: `pg_isready` dan query Prisma sederhana.
- Backend: HTTP `GET /api/v1` menghasilkan respons sukses.
- Frontend: halaman root dan `/admin/login` dapat dimuat.
- Auth: token valid dapat mengakses `/api/v1/admin/auth/me`; token invalid/expired ditolak.
- Reservation: satu fixture booking dapat dibuat dan dibatalkan tanpa menyentuh data operasional.

## Rollback

1. Jika deploy aplikasi gagal tanpa migration destruktif, rollback ke image/build sebelumnya.
2. Jika migration gagal, hentikan rollout; jangan mencoba reset database. Pulihkan snapshot hanya sesuai prosedur provider.
3. Catat versi aplikasi, migration terakhir, waktu kejadian, dan request ID terkait.
4. Pastikan health check dan flow login/reservasi kembali lulus sebelum membuka akses tester.

## Definition of Done Phase 5

Phase 5 hanya boleh ditandai selesai bila:

- PRO-77 sampai PRO-83 memiliki bukti acceptance criteria masing-masing.
- Ada URL staging yang menggunakan database/environment terpisah.
- Secret tidak ada di repository atau output log.
- Concurrency staging menghasilkan tepat satu reservasi aktif pada konflik yang sama.
- 30 evaluasi AI memiliki hasil tercatat.
- Checklist security, accessibility/mobile, dan bug bash tidak menyisakan blocker/high severity.
- Dokumen deployment, migration, health check, dan rollback sudah diuji oleh pemegang staging/production.

## Command lokal yang aman untuk baseline

```powershell
npm run build --workspace=apps/backend
npm run build --workspace=apps/frontend
npm run test:e2e --workspace=apps/backend -- --runInBand
docker compose ps
```

`npm run test:e2e` memakai fixture tenant unik dan membersihkannya setelah test. Tetap jangan menjalankannya terhadap production.
