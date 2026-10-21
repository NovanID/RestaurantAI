# Setup Staging Compose — Phase 5

## Tujuan

File ini menjelaskan artefak staging yang ditambahkan untuk PRO-78. Setup ini menjalankan frontend, backend, dan PostgreSQL sebagai tiga service terpisah. Tidak ada container, volume, atau database lokal yang diubah oleh dokumen ini.

Compose staging memakai nama project `restaurantai-staging`, berbeda dari Compose lokal `restaurantai`. Isolasi nama ini wajib agar container/volume staging tidak pernah mengambil alih service lokal.

## Catatan smoke test lokal (19 Oktober 2026)

- Docker image backend berhasil membangun Prisma Client dan NestJS.
- Docker image frontend berhasil membangun Next.js production.
- Percobaan awal sebelum `name: restaurantai-staging` memakai nama project yang sama dengan Compose lokal. Docker me-recreate container PostgreSQL lokal, tetapi **volume `restaurantai_postgres_data` tidak dihapus**.
- Tindakan koreksi: container staging/orphan dihentikan tanpa `-v`, Compose lokal dijalankan kembali, dan PostgreSQL lokal kembali sehat pada host port `15432`.
- Setelah itu nama project staging diisolasi. Jangan menjalankan staging dengan nama project `restaurantai`.
- Smoke test container lengkap masih harus dilanjutkan setelah build/start Compose staging yang terisolasi selesai; jangan menandai deployment staging selesai sebelum health check dijalankan.
- Backend Alpine memasang `openssl` karena Prisma memerlukan library tersebut untuk schema engine. `.dockerignore` mengecualikan `.env` di root maupun subfolder agar konfigurasi lokal tidak pernah tersalin ke image.
- Smoke test menemukan script production backend menunjuk `dist/main`, sedangkan Nest build mengeluarkan `dist/src/main.js`. Script `start:prod` sudah dikoreksi ke `node dist/src/main`; Docker dan start production lokal sekarang memakai entry point yang sama.

## File yang ditambahkan

| File | Fungsi |
| --- | --- |
| `apps/backend/Dockerfile` | Build NestJS, generate Prisma client, lalu saat container mulai menjalankan migration `prisma migrate deploy` dan backend. |
| `apps/frontend/Dockerfile` | Build dan menjalankan Next.js production. `NEXT_PUBLIC_API_URL` dipasang pada build time karena dikonsumsi browser. |
| `docker-compose.staging.yml` | Mendefinisikan PostgreSQL, backend, frontend, health check database, dan volume khusus staging. |
| `.env.staging.example` | Daftar variabel wajib tanpa secret nyata. |
| `.dockerignore` | Mencegah dependency, build output, Git metadata, env file, dan upload lokal masuk ke Docker build context. |

## Prasyarat

1. Docker Engine harus aktif.
2. Salin `.env.staging.example` menjadi file lokal `.env.staging`; file ini sudah diabaikan Git oleh pola `*.env`.
3. Ganti semua nilai `replace-with-...` dengan secret unik dari secret manager/provider.
4. Tentukan URL frontend dan API staging yang benar sebelum build frontend.

## Menjalankan staging lokal/VM

```powershell
docker compose --env-file .env.staging -f docker-compose.staging.yml up --build -d
docker compose --env-file .env.staging -f docker-compose.staging.yml ps
```

Docker build harus dijalankan dari root repository karena Dockerfile memakai workspace monorepo. `.dockerignore` menjaga context build tetap kecil dan memastikan `.env.staging` tidak pernah masuk image.

Dockerfile memasang dependency dengan `npm ci --include=dev --workspaces`. Pada Docker/npm saat ini, dev dependency workspace backend tidak ter-link sebagai executable root; karena itu Dockerfile juga memasang Prisma `5.22.0` dan Nest CLI `11.0.0` hanya di image build. Versi tersebut sama dengan manifest backend dan tidak mengubah lockfile/repository. Image saat ini mengutamakan baseline staging yang dapat dibuktikan, bukan optimasi ukuran image final.

Jangan memakai `docker compose down -v`; opsi `-v` akan menghapus volume staging.

## Verifikasi

```powershell
docker compose --env-file .env.staging -f docker-compose.staging.yml exec postgres pg_isready -U restaurant_ai -d restaurant_ai_staging
Invoke-WebRequest http://localhost:4000/api/v1
Invoke-WebRequest http://localhost:3000
```

Untuk environment dengan domain, ganti URL localhost dengan URL staging. Verifikasi login admin dan booking hanya dengan tenant fixture, bukan data operasional.

## Migration

Backend menjalankan `npx prisma migrate deploy` sebelum start. Gunakan hanya migration yang sudah direview. Ambil snapshot/backup database sebelum deployment yang membawa migration baru.

## Rollback

1. Hentikan rollout aplikasi, bukan database.
2. Deploy image/build sebelumnya.
3. Bila migration sudah diterapkan, jangan menjalankan reset. Ikuti migration rollback manual atau pulihkan snapshot sesuai kebijakan provider.
4. Ulangi health check backend, frontend, dan login.

## Batasan

Compose ini adalah baseline yang dapat dipindahkan ke VM/container provider. Ia tidak memilih provider, membuat domain, mengatur TLS, atau memasukkan secret. Itu harus dilakukan pemegang environment staging/production.
