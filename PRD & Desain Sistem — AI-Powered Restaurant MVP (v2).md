# PRD & Desain Sistem — AI-Powered Restaurant MVP (v2)

**Status:** Revisi dari draft 19 Agustus 2026\
**Owner:** Vanny (NovanID)\
**Stack:** Next.js (frontend) · NestJS (backend API) · PostgreSQL\
**Cakupan dokumen:** PRD, aturan bisnis, state machine, ERD, arsitektur, desain AI assistant, kontrak API, rencana delivery, risiko

## 0. Hasil Review Draft Sebelumnya

Draft PRD awal sudah kuat di sisi scope dan guardrail AI. Berikut celah yang saya temukan dan sudah diperbaiki di dokumen ini.

| # | Temuan | Dampak | Perbaikan di v2 |
| --- | --- | --- | --- |
| 1 | Reservasi tidak punya durasi/waktu selesai (hanya *start time*) | Pengecekan tabrakan tidak bisa dihitung | Tambah `end_at` dan `default_duration_minutes` |
| 2 | Tidak jelas apakah reservasi `pending` memblokir meja | Dua customer bisa mengambil slot yang sama | `pending` ikut memblokir meja, dengan masa kedaluwarsa (`expires_at`) |
| 3 | Kode reservasi "dummy" saja | Orang lain bisa menebak kode dan membatalkan reservasi | Kode acak + verifikasi 4 digit terakhir nomor telepon, lalu token sesi pendek |
| 4 | Tujuan Anda: AI bisa *booking otomatis*, tapi PRD mengunci status `pending` | Pengalaman "otomatis" tidak tercapai | Setting per restoran `auto_confirm` (default `false`), jadi bisa pindah ke otomatis tanpa ubah kode |
| 5 | Tidak ada model data untuk chat/tool-call | Persyaratan *traceability* AI tidak bisa dipenuhi | Tambah `chat_sessions`, `chat_messages`, `ai_tool_calls` |
| 6 | Zona waktu tidak disebut | Salah jam saat server berjalan di UTC | Simpan `timestamptz`, tampilkan `Asia/Jakarta` (WIB), zona waktu per restoran |
| 7 | Double booking hanya disebut "atomic" | Race condition masih mungkin | Exclusion constraint PostgreSQL sebagai pertahanan terakhir |
| 8 | Tool AI tidak punya idempotency | Retry LLM bisa membuat reservasi ganda | `idempotency_key` pada `create_reservation` |
| 9 | Tidak ada mitigasi prompt injection / abuse | Pesan jahat dapat memanipulasi tool | Aturan keamanan AI + rate limit (bagian 7.5) |
| 10 | Tidak ada acceptance criteria terukur per fitur | Sulit memutuskan "selesai" | Ditambahkan di bagian 5 dan 11 |

## 1. Ringkasan Produk

Aplikasi web untuk satu restoran Padang yang memungkinkan customer melihat menu, mengecek ketersediaan meja, dan mengelola reservasi, baik lewat UI web biasa maupun lewat **AI assistant berbasis chat** yang dapat menjawab pertanyaan menu dan membuat reservasi langsung dalam percakapan. Staff memakai dashboard untuk mengelola menu, meja, customer, dan reservasi.

**Prinsip utama:** AI hanyalah antarmuka bahasa natural. Semua fakta operasional (harga, stok menu, availability, status reservasi) hanya boleh berasal dari Restaurant API melalui tools terkontrol. AI tidak boleh menebak dan tidak punya akses database langsung.

## 2. Masalah yang Diselesaikan

- Customer harus bertanya atau reservasi lewat chat manual, telepon, atau form statis.
- Staff menghabiskan waktu menjawab pertanyaan berulang dan mencatat reservasi.
- Informasi operasional tidak konsisten jika tidak bersumber dari satu data.
- Chatbot biasa mengarang harga, stok, atau availability.

## 3. Tujuan dan Non-Tujuan

### Tujuan MVP

1. Customer dapat mencari menu dan membuat, melihat, mengubah, serta membatalkan reservasi lewat web.
2. Staff dapat mengelola data inti restoran dari satu dashboard.
3. AI assistant dapat menjawab FAQ/menu dan menyelesaikan lifecycle reservasi memakai tools yang sama dengan web.
4. Seluruh fakta operasional berasal dari database melalui business logic/API.
5. Dibangun bertahap sebagai vertical slice satu restoran Padang dalam enam bulan.

### Bukan Tujuan MVP

Onboarding multi-restoran, billing SaaS, multi-agent/A2A, pembayaran/deposit, prediksi demand, long-term AI memory, Kubernetes/microservices, channel Telegram/Discord/WhatsApp produksi.

## 4. Pengguna

| Peran | Kebutuhan | Hak akses |
| --- | --- | --- |
| **Customer (guest)** | Lihat info, menu, cek meja, kelola reservasi tanpa harus membuat akun | Endpoint publik + sesi reservasi sementara |
| **Staff (`staff`)** | Kelola reservasi, menu, meja harian | Dashboard admin |
| **Owner/Admin (`admin`)** | Semua hak staff + kelola profil, kebijakan, akun staff | Dashboard admin penuh |
| **AI Assistant** | Bukan pengguna; bertindak atas nama customer lewat tools | Hanya tools publik yang di-whitelist |

## 5. Kebutuhan Fungsional dan Acceptance Criteria

### 5.1 Customer Web

| ID | Fitur | Acceptance criteria |
| --- | --- | --- |
| C-01 | Profil restoran, jam buka, kontak, kebijakan | Data tampil sesuai database; hari libur menampilkan "Tutup" |
| C-02 | Cari menu (nama/kategori) | Hasil hanya menu aktif; harga dalam Rupiah; menu habis diberi label "Habis" |
| C-03 | Cek ketersediaan meja (tanggal, jam, jumlah tamu) | Hanya mengembalikan slot yang lolos aturan bisnis; respons < 1 detik pada seed data |
| C-04 | Buat reservasi | Menghasilkan kode reservasi dan status `pending`; slot yang direbut orang lain ditolak dengan pesan jelas |
| C-05 | Lihat reservasi | Input kode + 4 digit terakhir telepon; salah 5 kali → dikunci sementara |
| C-06 | Ubah waktu/jumlah tamu | Hanya bila status `pending`/`confirmed`, belum lewat batas ubah, dan meja tersedia; kalau tidak, data lama tetap utuh |
| C-07 | Batalkan reservasi | Hanya sebelum batas pembatalan; status menjadi `cancelled` dan slot terbuka kembali |

### 5.2 Admin Dashboard

| ID | Fitur | Acceptance criteria |
| --- | --- | --- |
| A-01 | Login staff | Email + password (hash argon2/bcrypt), access token pendek + refresh token |
| A-02 | Kelola profil, jam buka, kebijakan | Perubahan langsung memengaruhi availability |
| A-03 | CRUD menu + kategori + nonaktifkan | Menu nonaktif tidak muncul ke customer maupun AI |
| A-04 | CRUD meja (nomor, kapasitas, area, status) | Meja `inactive` tidak pernah ditawarkan |
| A-05 | Daftar reservasi + filter status/tanggal | Staff dapat approve, reject, ubah, batalkan, tandai `completed` atau `no_show` |
| A-06 | Data customer + riwayat reservasi | Hanya terlihat oleh staff yang login |
| A-07 | Audit trail | Setiap aksi admin dan perubahan status mencatat pelaku dan waktu |

### 5.3 AI Assistant

| ID | Kemampuan | Acceptance criteria |
| --- | --- | --- |
| AI-01 | Jawab FAQ restoran | Jawaban selaras dengan `get_restaurant_info` |
| AI-02 | Cari dan jelaskan menu | Harga/stok persis sama dengan hasil tool |
| AI-03 | Cek availability | Selalu memanggil tool; tidak pernah menjawab dari ingatan |
| AI-04 | Buat reservasi | Hanya setelah ringkasan detail dan jawaban "ya" eksplisit dari customer |
| AI-05 | Lihat/ubah/batalkan reservasi | Setelah verifikasi kode + 4 digit telepon; ubah dan batal butuh konfirmasi eksplisit |
| AI-06 | Menolak/klarifikasi | Bila tool gagal atau data kurang, AI berkata tidak tahu dan menawarkan flow web atau kontak staff |
| AI-07 | Batas topik | Pertanyaan di luar restoran dijawab singkat lalu diarahkan kembali |

## 6. Aturan Bisnis

1. **Tidak ada tabrakan:** satu meja tidak boleh punya dua reservasi aktif (`pending`/`confirmed`) dengan rentang waktu yang beririsan.
2. **Kelayakan meja:** meja berstatus `active` dan `capacity >= party_size`. Opsional MVP: tolak bila kapasitas jauh lebih besar dari tamu (mis. 2 tamu di meja 10).
3. **Jam operasional:** `start_at` dan `end_at` harus berada dalam jam buka pada hari itu (termasuk pengecualian hari libur).
4. **Batas pemesanan** (disimpan di pengaturan restoran, bisa diubah staff):
   - minimal pesan: 60 menit sebelum waktu mulai
   - maksimal pesan: 30 hari ke depan
   - durasi default: 90 menit
   - batas ubah/batal: 2 jam sebelum waktu mulai
   - kapasitas maksimal per reservasi: 12 tamu (di atas itu, hubungi restoran)
5. **Status awal:** `pending`. Bila `auto_confirm = true`, langsung `confirmed`.
6. **Kedaluwarsa:** reservasi `pending` yang tidak diproses staff hingga `expires_at` (default 30 menit sebelum waktu mulai atau 24 jam setelah dibuat, mana yang lebih dulu) menjadi `expired` dan slot dibuka kembali.
7. **Sumber kebenaran:** harga, stok menu, meja, dan status reservasi selalu dibaca dari database.
8. **Konfirmasi AI:** create/update/cancel via AI wajib konfirmasi eksplisit customer dalam percakapan.
9. **Audit:** aksi admin dan perubahan status reservasi mencatat aktor, waktu, nilai lama dan baru.
10. **Tenant:** semua tabel bisnis punya `tenant_id`; MVP hanya mengoperasikan satu tenant.

### State Machine Reservasi

| Dari | Ke | Dipicu oleh | Syarat |
| --- | --- | --- | --- |
| (baru) | `pending` | customer / AI / staff | Lolos aturan 1–4 |
| `pending` | `confirmed` | staff (atau `auto_confirm`) | Meja masih bebas |
| `pending` | `rejected` | staff | Wajib alasan |
| `pending` | `expired` | sistem (job terjadwal) | Lewat `expires_at` |
| `pending` / `confirmed` | `cancelled` | customer / AI / staff | Sebelum batas batal (staff boleh kapan saja) |
| `confirmed` | `completed` | staff | Setelah waktu mulai |
| `confirmed` | `no_show` | staff | Setelah waktu mulai + toleransi |

Status akhir (`rejected`, `expired`, `cancelled`, `completed`, `no_show`) tidak dapat diubah lagi. Hanya `pending` dan `confirmed` yang memblokir meja.

## 7. Desain Sistem

### 7.1 Arsitektur

Satu repo (monorepo) dengan modular monolith. Tidak ada microservices.

| Lapisan | Teknologi | Tanggung jawab |
| --- | --- | --- |
| Frontend | Next.js (App Router), TypeScript, Tailwind | Customer web, admin dashboard, widget chat |
| Backend | NestJS, TypeScript | REST API, business logic, auth, job terjadwal |
| Database | PostgreSQL | Data inti, constraint anti double booking |
| AI Gateway | 9router → LLM; Hermes sebagai orchestrator (sesuai PRD awal) | Tool calling, streaming |
| ORM/Migrasi | Prisma atau Drizzle (pilih satu; migrasi SQL mentah untuk constraint khusus) | Skema dan migrasi |

Alur request: **Browser → Next.js → NestJS API → PostgreSQL.** Alur AI: **Widget chat → NestJS `/chat` → LLM (tool calling) → Tool executor → service NestJS yang sama dengan UI → PostgreSQL.**

### 7.2 Modul NestJS

`auth` · `tenants` · `restaurant` · `tables` · `menu` · `customers` · `availability` · `reservations` · `audit` · `chat` (orkestrasi + tool executor) · `jobs` (kedaluwarsa reservasi)

Aturan penting: modul `chat` **tidak boleh** mengimpor repository database. Ia hanya memanggil service `availability` dan `reservations`, sehingga web dan AI melewati validasi yang persis sama.

### 7.3 ERD — Entitas dan Atribut

Konvensi: primary key `uuid`; semua tabel bisnis punya `tenant_id`, `created_at`, `updated_at`; waktu memakai `timestamptz`; uang dalam Rupiah sebagai integer (`price_idr`).

**tenants** (satu tenant = satu brand, mis. satu jaringan restoran Padang) — `id`, `name`, `slug` (unik), `status`, `tagline`, `about_text`, `logo_url`, `policy_text`, `ai_persona` (gaya bicara AI), `settings` (jsonb: tema, fitur aktif)

**outlets** (pengganti `restaurants`; satu outlet = satu cabang) — `id`, `tenant_id`, `name` (mis. Tebet), `slug`, `address`, `city`, `phone`, `whatsapp`, `email`, `latitude`, `longitude`, `timezone` (default `Asia/Jakarta`), `default_duration_minutes`, `min_notice_minutes`, `max_advance_days`, `change_cutoff_minutes`, `max_party_size`, `auto_confirm` (bool), `is_active`; unik `(tenant_id, slug)`

**opening\_hours** — `id`, `tenant_id`, `outlet_id`, `weekday` (0–6), `open_time`, `close_time`, `is_closed`

**special\_days** — `id`, `tenant_id`, `outlet_id`, `date`, `is_closed`, `open_time`, `close_time`, `note` (hari libur / jam khusus)

**staff\_users** — `id`, `tenant_id`, `name`, `email` (unik per tenant), `password_hash`, `role` (`owner`/`manager`/`staff`), `is_active`, `last_login_at`. Akses outlet lewat **staff\_outlets** — `staff_id`, `outlet_id` (tidak ada baris = akses semua outlet milik tenant)

**dining\_areas** — `id`, `tenant_id`, `outlet_id`, `name` (mis. Indoor, Outdoor, Lesehan)

**restaurant\_tables** — `id`, `tenant_id`, `outlet_id`, `area_id`, `table_number` (unik per outlet), `capacity`, `status` (`active`/`inactive`)

**menu\_categories** — `id`, `tenant_id`, `name`, `sort_order`, `is_active`

**menu\_items** — `id`, `tenant_id`, `category_id`, `name`, `description`, `price_idr`, `is_available`, `is_active`, `image_url`, `tags` (array: pedas, halal, vegetarian)

**outlet\_menu\_items** — `id`, `tenant_id`, `outlet_id`, `menu_item_id`, `is_available`, `price_override_idr` (nullable); unik `(outlet_id, menu_item_id)`. Menu dan harga dasar milik brand; `menu_items.is_available` menjadi saklar tingkat brand, sedangkan stok harian per cabang dibaca dari tabel ini.

**customers** — `id`, `tenant_id`, `name`, `phone` (dinormalisasi E.164), `email` (opsional); unik `(tenant_id, phone)`

**reservations** — `id`, `tenant_id`, `outlet_id`, `code` (unik, acak, mis. `RSV-7K4M2Q`), `customer_id`, `table_id`, `start_at`, `end_at`, `party_size`, `status`, `source` (`web`/`ai`/`admin`), `notes`, `rejection_reason`, `expires_at`, `idempotency_key` (unik, nullable), `version` (optimistic lock)

**reservation\_status\_history** — `id`, `tenant_id`, `reservation_id`, `from_status`, `to_status`, `actor_type` (`customer`/`ai`/`staff`/`system`), `actor_id`, `reason`, `created_at`

**audit\_events** — `id`, `tenant_id`, `actor_type`, `actor_id`, `action`, `entity_type`, `entity_id`, `before` (jsonb), `after` (jsonb), `created_at`

**chat\_sessions** — `id`, `tenant_id`, `outlet_id` (nullable sampai customer memilih cabang), `customer_id` (nullable), `verified_reservation_id` (nullable), `started_at`, `last_active_at`

**chat\_messages** — `id`, `tenant_id`, `session_id`, `role` (`user`/`assistant`/`tool`), `content`, `created_at`

**ai\_tool\_calls** — `id`, `tenant_id`, `session_id`, `message_id`, `tool_name`, `input` (jsonb, sudah disamarkan), `output` (jsonb), `status` (`ok`/`error`), `latency_ms`, `created_at`

### 7.4 Relasi

| Dari | Relasi | Ke | Keterangan |
| --- | --- | --- | --- |
| tenants | 1 — N | semua tabel bisnis | Isolasi data |
| restaurants | 1 — N | opening\_hours, special\_days | Jam buka dan pengecualian |
| dining\_areas | 1 — N | restaurant\_tables | Area meja |
| menu\_categories | 1 — N | menu\_items | Pengelompokan menu |
| customers | 1 — N | reservations | Riwayat reservasi |
| restaurant\_tables | 1 — N | reservations | Satu meja bisa punya banyak reservasi, tidak boleh beririsan |
| reservations | 1 — N | reservation\_status\_history | Jejak perubahan status |
| chat\_sessions | 1 — N | chat\_messages | Percakapan |
| chat\_messages | 1 — N | ai\_tool\_calls | Tool yang dipanggil pada satu giliran |
| staff\_users | 1 — N | audit\_events (via `actor_id`) | Pelaku aksi |

**Catatan desain:** MVP memakai satu meja per reservasi. Jika nanti perlu menggabungkan meja untuk rombongan, ubah menjadi tabel penghubung `reservation_tables` (N:M); ini sengaja ditunda sesuai prinsip "tunda fitur yang belum dibutuhkan".

**Perubahan v2.1 (multi-outlet):** kedua situs referensi (bagian 16) adalah jaringan dengan 9–11 cabang, jadi `restaurants` diganti `outlets` di bawah `tenants`. Menu dan identitas brand ada di tingkat tenant; meja, jam buka, aturan pemesanan, dan reservasi ada di tingkat outlet. Hubungan baru: tenants 1—N outlets, outlets 1—N (restaurant\_tables, dining\_areas, opening\_hours, special\_days, reservations), outlets N—N menu\_items lewat `outlet_menu_items`, staff\_users N—N outlets lewat `staff_outlets`. MVP Desember cukup menyeed 2–3 outlet per brand; constraint anti double booking tidak berubah karena tetap per `table_id`.

### 7.5 Constraint Database Penting

**Anti double booking** (pertahanan terakhir di PostgreSQL):

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE reservations
  ADD CONSTRAINT no_overlapping_reservations
  EXCLUDE USING gist (
    tenant_id WITH =,
    table_id  WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  ) WHERE (status IN ('pending', 'confirmed'));
```

Constraint lain: `CHECK (end_at > start_at)`, `CHECK (party_size > 0)`, `CHECK (capacity > 0)`, `CHECK (price_idr >= 0)`, enum/CHECK untuk `status`, unik `(tenant_id, code)`, dan indeks `(tenant_id, start_at)` serta `(tenant_id, table_id, start_at)`.

Catatan: Prisma belum mendukung exclusion constraint secara native, jadi tambahkan lewat file migrasi SQL manual. Jika constraint terlanggar, tangkap error `23P01` dan terjemahkan menjadi respons `409 SLOT_TAKEN`.

**Row-level security (opsional, bila memungkinkan):** aktifkan RLS dengan `tenant_id = current_setting('app.tenant_id')::uuid` dan set nilai tersebut per transaksi.

### 7.6 Algoritma Availability

1. Validasi input: tanggal, jam, `party_size`, lalu cek jam buka, batas minimal dan maksimal pemesanan.
2. Hitung `end_at = start_at + default_duration`.
3. Ambil meja `active` dengan `capacity >= party_size`, urutkan dari kapasitas terkecil (best-fit).
4. Buang meja yang punya reservasi `pending`/`confirmed` beririsan dengan rentang tersebut.
5. Kembalikan daftar meja yang bebas, atau saran waktu terdekat (±30/60 menit) bila kosong.

Pada pembuatan reservasi, jalankan ulang langkah 1–4 **di dalam transaksi** dan `INSERT`. Bila constraint menolak, kembalikan `409` dan jangan pernah mengandalkan hasil cek availability sebelumnya.

## 8. Desain AI Assistant

### 8.1 Tools

| Tool | Input | Mengubah data? | Konfirmasi? |
| --- | --- | --- | --- |
| `get_restaurant_info` | — | Tidak | Tidak |
| `search_menu` | `query?`, `category?`, `tags?` | Tidak | Tidak |
| `check_availability` | `date`, `time`, `party_size` | Tidak | Tidak |
| `create_reservation` | `name`, `phone`, `date`, `time`, `party_size`, `notes?`, `idempotency_key` | **Ya** | **Ya** |
| `verify_reservation` | `code`, `phone_last4` | Tidak (membuka sesi terverifikasi) | Tidak |
| `get_reservation` | `code` (setelah terverifikasi) | Tidak | Tidak |
| `update_reservation` | `code`, `date?`, `time?`, `party_size?` | **Ya** | **Ya** |
| `cancel_reservation` | `code` | **Ya** | **Ya** |

### 8.2 Alur Percakapan Reservasi

1. Customer menyampaikan kebutuhan dalam bahasa natural.
2. AI mengekstrak tanggal, jam, jumlah tamu; bila ada yang kurang, AI bertanya **satu hal sekali** dan berhenti di situ.
3. AI memanggil `check_availability` dan menawarkan opsi nyata.
4. AI meminta nama dan nomor telepon.
5. AI membacakan ringkasan lengkap dan bertanya "Apakah data ini sudah benar? Balas *ya* untuk memesan."
6. Hanya setelah "ya", AI memanggil `create_reservation`.
7. AI menyampaikan kode reservasi dan status (`pending` atau `confirmed` sesuai `auto_confirm`), tanpa mengklaim lebih dari hasil tool.

### 8.3 Contoh Dialog

> **Customer:** Mau booking meja buat 4 orang besok jam 7 malam.\
**AI:** Saya cek dulu ya. *(memanggil `check_availability`)* Besok pukul 19.00 untuk 4 orang tersedia meja di area Indoor dan Lesehan. Mau yang mana?\
**Customer:** Indoor.\
**AI:** Baik. Atas nama siapa dan nomor telepon yang bisa dihubungi?\
**Customer:** Budi, 0812xxxx7788.\
**AI:** Ringkasan: Budi, 4 orang, besok 19.00–20.30, area Indoor. Balas *ya* untuk memesan.\
**Customer:** Ya.\
**AI:** *(memanggil `create_reservation`)* Reservasi dibuat dengan kode **RSV-7K4M2Q**, status menunggu persetujuan restoran. Simpan kode ini untuk melihat atau mengubah reservasi.

### 8.4 Guardrails Wajib

- **Tool wajib:** harga, stok, availability, dan status reservasi hanya boleh disebut dari hasil tool pada giliran itu. Bila tool gagal: "Maaf, saya belum bisa memastikan saat ini. Silakan coba lagi atau gunakan form reservasi."
- **Konfirmasi dipaksa di kode, bukan hanya di prompt:** tool yang mengubah data hanya dijalankan bila sesi memiliki flag konfirmasi untuk ringkasan yang identik. Prompt saja tidak cukup.
- **Verifikasi:** `get/update/cancel` ditolak tanpa `verify_reservation` yang sukses pada sesi tersebut.
- **Validasi ulang di server:** argumen dari LLM diperlakukan sebagai input tidak tepercaya dan divalidasi dengan skema (mis. Zod/class-validator).
- **Whitelist tool:** executor hanya menjalankan tool yang terdaftar, dengan `tenant_id` diambil dari sesi, **bukan** dari argumen LLM.
- **Anti prompt injection:** teks customer, nama menu, dan catatan tidak pernah dianggap instruksi sistem; hasil tool dikirim sebagai data.
- **Rate limit:** mis. 20 pesan/menit per sesi dan batas per IP; batas panjang pesan; batas jumlah tool call per giliran (mis. maksimal 5).
- **Privasi log:** nomor telepon dimasking di `ai_tool_calls.input` (mis. `0812****7788`); tidak menyimpan API key atau token.
- **Degradasi mulus:** bila LLM/9router mati, widget menampilkan pesan ramah dan tombol ke flow reservasi web.
- **Bahasa:** Bahasa Indonesia; gaya sopan, singkat, tidak berlebihan.

## 9. Kontrak API (Ringkas)

Prefiks `/api/v1`. Respons error seragam: `{ "error": { "code", "message", "details" } }`.

| Area | Endpoint | Akses |
| --- | --- | --- |
| Publik | `GET /restaurant` | Publik |
| Publik | `GET /menu?query=&category=` | Publik |
| Publik | `GET /availability?date=&time=&party_size=` | Publik |
| Publik | `POST /reservations` | Publik + rate limit |
| Publik | `POST /reservations/verify` (`code`, `phone_last4`) → token sesi pendek | Publik + rate limit |
| Publik | `GET/PATCH /reservations/:code`, `POST /reservations/:code/cancel` | Token sesi reservasi |
| Chat | `POST /chat/sessions`, `POST /chat/sessions/:id/messages` (streaming) | Publik + rate limit |
| Admin | `POST /admin/auth/login`, `/refresh`, `/logout` | Staff |
| Admin | `CRUD /admin/menu-items`, `/menu-categories`, `/tables`, `/areas` | Staff/Admin |
| Admin | `GET /admin/reservations`, `PATCH /admin/reservations/:id`, `POST .../approve`, `.../reject`, `.../cancel` | Staff/Admin |
| Admin | `GET /admin/customers`, `GET /admin/customers/:id/reservations` | Staff/Admin |
| Admin | `PUT /admin/restaurant`, `/opening-hours`, `/special-days`; `CRUD /admin/staff` | Admin |

Kode error utama: `SLOT_TAKEN` (409), `OUTSIDE_HOURS` (422), `CAPACITY_EXCEEDED` (422), `TOO_LATE_TO_MODIFY` (422), `VERIFICATION_FAILED` (403), `RATE_LIMITED` (429).

## 10. Persyaratan Non-Fungsional

- **Keamanan:** RBAC di semua endpoint admin; validasi server-side; CORS dibatasi; password di-hash; secret hanya lewat environment variable; HTTPS di produksi.
- **Privasi:** data customer (nama, telepon) tidak masuk log aplikasi secara berlebihan; kebijakan retensi chat (mis. hapus setelah 90 hari).
- **Keandalan:** operasi reservasi atomic dalam satu transaksi; kegagalan AI tidak boleh memblokir flow web.
- **Performa:** availability < 1 detik; respons pertama chat (streaming) < 3 detik pada kondisi normal.
- **Aksesibilitas:** navigasi keyboard, label form, kontras memadai; responsif mobile dan desktop.
- **Observability minimum:** log terstruktur dengan `request_id`, metrik error rate dan latensi tool, jejak tool call per sesi chat.
- **Pengujian:** unit test business logic, integration test dengan PostgreSQL nyata, test konkurensi double booking, evaluasi AI dengan set skenario tetap.

## 11. Definition of Done

- Admin dapat mengisi profil, jam buka, meja, menu, dan kebijakan.
- Customer menyelesaikan lifecycle reservasi lewat web **dan** lewat AI.
- Percobaan double booking (termasuk 50 request paralel ke slot yang sama) selalu menghasilkan tepat satu reservasi.
- AI tidak mengarang harga, stok, availability, atau status ketika tool gagal.
- Endpoint admin menolak request tanpa token/peran yang sesuai; customer tidak bisa mengakses reservasi orang lain.
- Skenario utama berjalan di mobile dan desktop.
- Tersedia seed data satu restoran Padang dan demo end-to-end.

## 12. Indikator Keberhasilan

| Metrik | Target |
| --- | --- |
| Skenario reservasi uji selesai tanpa bantuan staff | ≥ 90% |
| Double booking pada pengujian ditolak | 100% |
| Fakta operasional AI cocok dengan tool/database pada set evaluasi | 100% |
| Percobaan aksi tanpa konfirmasi eksplisit yang tereksekusi | 0 |
| Median waktu reservasi web | ≤ 3 menit |
| Median waktu reservasi lewat AI | ≤ 2 menit / ≤ 8 giliran chat |
| Staff menambah menu dan meja tanpa developer | Ya |

## 13. Timeline Pengerjaan sampai Desember 2026

Dengan tim 2 orang, waktu efektif 11 minggu (12 Oktober–31 Desember 2026), jauh lebih pendek dari rencana enam bulan di draft awal, sehingga lingkup dipangkas menjadi satu vertical slice tipis. Pembagian peran: **A** memegang backend (NestJS, PostgreSQL, tools AI dan guardrail), **B** memegang frontend (Next.js) dan chat AI (LLM client, prompt, widget, evaluasi). Jadwal ini mengasumsikan mulai dari nol; bila sebagian sudah jadi, geser tanggalnya.

&#91;embedded content: timeline 12 Okt–31 Des 2026 · 2 jalur kerja, 4 milestone\]

Ketergantungan utama: B baru bisa menyambungkan chat ke fitur booking setelah tools AI milik A selesai 6 Desember, jadi A mengirim tool read-only (info restoran, menu) lebih dulu pada 23–29 November agar B bisa mulai menguji chat.

| Tahap | A: backend dan tools AI | B: frontend dan chat AI | Syarat lulus |
| --- | --- | --- | --- |
| 1 · 12–25 Okt | Monorepo dan CI; skema PostgreSQL v1 (tenant, outlet, exclusion constraint); auth staff; seed 1 brand dengan 2 outlet | Next.js dan UI kit; `LlmClient`; uji tool calling lewat 9router; set evaluasi v0 (15 skenario) | Migrasi jalan dari nol; staff bisa login; satu tool AI berhasil memanggil API |
| 2 · 26 Okt–15 Nov | API CRUD outlet, menu, meja, jam buka; endpoint availability; mulai reservasi | Admin dashboard: menu, meja, outlet, daftar reservasi | Staff mengisi menu dan meja lewat dashboard tanpa developer |
| 3 · 16 Nov–6 Des | Reservasi rampung 22 Nov (ubah, approve/reject, expiry job); lalu tools AI: read-only dulu, kemudian create/verify/update/cancel dengan gerbang konfirmasi dan idempotency | Customer web rampung 29 Nov (menu, cek meja, reservasi, lihat status); mulai 30 Nov: widget chat dan orkestrasi LLM | Lifecycle reservasi lewat web lengkap; 50 request paralel ke satu slot menghasilkan tepat 1 reservasi |
| 4 · 7–13 Des | Guard tenant, tes isolasi dua tenant, rate limit | Chat AI rampung; evaluasi 30 skenario | Feature freeze 13 Des: lifecycle reservasi lewat AI jalan |
| 5 · 14–24 Des | Hardening berdua: tes konkurensi, evaluasi AI, aksesibilitas, review keamanan, logging, deploy staging, perbaikan bug | (sama) | Metrik bagian 12 tercapai |
| 6 · 25–31 Des | Dokumentasi, skrip demo, rilis v0.1; sisa waktu jadi buffer libur Natal dan akhir tahun | (sama) | Demo end-to-end |

**Dipangkas dari rencana enam bulan agar muat:** brand kedua di demo (isolasi cukup diuji otomatis dengan dua tenant di database tes), `outlet_menu_items` (stok per cabang; MVP memakai stok tingkat brand), `staff_outlets`, UI `special_days`, UI `auto_confirm`, tema per tenant, RLS, notifikasi, WhatsApp, katering dan event, analitik, rekomendasi menu berbasis anggaran. Evaluasi AI 30 skenario, bukan 60.

**Bila jadwal meleset, potong berurutan:** (1) rekomendasi menu oleh AI, (2) ubah reservasi lewat web dan AI, sehingga tersisa buat, lihat, dan batalkan. **Tidak dipotong:** tes double booking, gerbang konfirmasi AI, evaluasi AI inti, tes isolasi tenant.

**Risiko terbesar:** chat AI baru dikerjakan penuh mulai 30 November padahal AI adalah pembeda utama. Mitigasinya: `LlmClient` dan uji tool calling sudah dibuat di tahap 1, dan tool read-only dikirim lebih awal.

## 14. Risiko dan Mitigasi

| Risiko | Mitigasi |
| --- | --- |
| LLM mengarang fakta | Tool wajib, validasi, set evaluasi, fallback ke web |
| Double booking karena race condition | Exclusion constraint + transaksi + tes paralel |
| Kode reservasi ditebak | Kode acak panjang, verifikasi telepon, rate limit, lockout |
| Biaya/latensi LLM | Batasi token dan jumlah tool call, cache FAQ, model kecil untuk intent sederhana |
| Slot tertahan oleh reservasi `pending` yang tak diproses | `expires_at` + notifikasi staff + opsi `auto_confirm` |
| Scope creep | Aturan "tunda bila tidak dibutuhkan flow aktif" |
| Ketergantungan 9router/Hermes | Abstraksi `LlmClient` agar penyedia mudah diganti |

## 15. Pertanyaan Terbuka (Perlu Keputusan Anda)

1. **Auto-confirm:** apakah untuk demo AI sebaiknya langsung `confirmed` (sesuai keinginan "booking otomatis") atau tetap `pending`? Rekomendasi: bangun `pending` dulu, nyalakan `auto_confirm` setelah flow stabil.
2. **Notifikasi:** apakah staff dan customer perlu email/WhatsApp saat status berubah? Rekomendasi: tunda setelah MVP; cukup dashboard dan halaman status.
3. **ORM:** Prisma (produktif, tapi constraint khusus lewat SQL manual) atau Drizzle (lebih dekat ke SQL)? Rekomendasi: Prisma bila Anda ingin cepat, Drizzle bila ingin kontrol penuh atas constraint.
4. **Hosting:** target deploy (VPS, Railway, Vercel + managed Postgres) memengaruhi pilihan RLS dan job scheduler.
5. **Ukuran restoran:** jumlah meja dan jam sibuk menentukan apakah durasi tetap 90 menit cukup atau perlu per jumlah tamu.

## 16. Referensi: Dua Website Restoran Padang

Kedua referensi adalah jaringan multi-outlet dengan website katalog statis; di halaman utama yang saya baca tidak terlihat reservasi online, sehingga celah produknya ada di reservasi dan chat AI, dan model data harus mengenal outlet.

| Aspek | [Payakumbuah](https://www.payakumbuah.co.id/) | [Pagi Sore](https://www.pagisore.id/) | Implikasi untuk produk |
| --- | --- | --- | --- |
| Skala | 11 outlet (Kemang, Veteran, Tebet, Cibubur, Bandung, Depok, Menteng, Semarang, Bogor, Gading Serpong, Bekasi) | 9 alamat: 5 di Palembang, 4 di Jakarta | Wajib ada entitas `outlets`; customer memilih cabang lebih dulu |
| Kanal layanan | Chat WhatsApp, GoFood, halaman pesan antar | Telepon per outlet, formulir kontak, delivery lewat telepon | Semua kanal manual, jadi AI chat langsung mengurangi beban staff |
| Menu | Galeri menu pilihan, nasi box, katering dan event | Galeri foto makanan dan minuman, paket dan katering | Harga tidak tampak di halaman utama; menu terstruktur (harga, tag, stok per cabang) adalah nilai tambah |
| Jam buka | Tidak tercantum | 10.00–22.00 | Jam buka disimpan per outlet |
| Identitas brand | Tagline #YoSabanaLamak, beras Solok, cerita pendiri | Berdiri sejak 1973, fokus pada rendang | Cerita brand menjadi bahan FAQ dan `ai_persona` per tenant |
| Teknologi | Google Sites | Drupal 7 | Tidak perlu ditiru; bersaing di data terstruktur dan AI |

Tiga keputusan dari referensi ini: (1) model data brand → outlet, sudah diterapkan di ERD v2.1; (2) AI selalu menanyakan atau menentukan outlet sebelum mengecek availability; (3) permintaan katering dan event, yang tampil di kedua situs, ditunda dari MVP, tetapi AI cukup mencatat permintaan dan mengarahkannya ke kontak staff.

Sumber (dibuka 11 Oktober 2026): [payakumbuah.co.id](https://www.payakumbuah.co.id/), [pagisore.id](https://www.pagisore.id/).

## 17. Strategi SaaS: Bagian Mana yang Jadi SaaS

SaaS di proyek ini ada di lapisan tenant, bukan di fitur reservasi atau AI-nya: satu kode dan satu database melayani banyak brand dengan data yang terisolasi. Target Desember adalah **SaaS-ready**: satu brand beroperasi penuh, isolasi data dibuktikan lewat tes otomatis dengan dua tenant (brand kedua di demo hanya bila waktu tersisa), sedangkan billing dan pendaftaran mandiri ditunda.

Hierarki data: **Platform → Tenant (brand) → Outlet (cabang) → Meja dan Reservasi**. Menu milik tenant, stok harian milik outlet.

| Lapisan SaaS | Isi | Status Desember |
| --- | --- | --- |
| Model tenant dan outlet | `tenant_id` di semua tabel, `outlet_id` untuk data per cabang | Bangun |
| Isolasi data | Semua query di-scope `tenant_id` lewat guard NestJS; tes lintas tenant wajib lulus; RLS PostgreSQL bila waktu cukup | Scope query: bangun. RLS: opsional |
| Resolusi tenant | Tenant ditentukan dari host atau path (mis. `/t/payakumbuah`), tidak pernah dari input pengguna atau LLM | Bangun versi path; subdomain menyusul |
| Konfigurasi per tenant | Nama, logo, kebijakan, aturan reservasi per outlet, persona AI, FAQ | Data dan API: bangun. UI tema lengkap: tunda |
| AI per tenant | Tool, persona, FAQ, dan daftar outlet diambil dari tenant sesi | Bangun |
| Peran | `owner`, `manager`, `staff` di tingkat tenant; super-admin platform lewat seed atau CLI | Bangun tanpa UI super-admin |
| Metering penggunaan | Catat jumlah percakapan dan token per tenant (`ai_tool_calls`, `chat_messages`) | Catat saja, tanpa tagihan |
| Pendaftaran mandiri | Brand baru mendaftar dan menyiapkan datanya sendiri | Tunda |
| Billing dan paket | Langganan per outlet atau per volume percakapan AI | Tunda |
| Custom domain dan white label | Domain milik brand | Tunda |

**Rekomendasi arsitektur:** pakai *shared database, shared schema* (kolom `tenant_id`). Ini yang paling sederhana untuk tim kecil. Schema atau database per tenant baru dipertimbangkan bila ada klien yang mensyaratkan isolasi fisik.

**Bukti SaaS:** tes otomatis membuat dua tenant di database tes dan memastikan staff, query, dan tool AI milik tenant A tidak pernah mengembalikan data tenant B. Untuk demo cukup satu brand dengan 2 outlet; seed brand kedua (mis. 2 outlet bergaya Pagi Sore) dikerjakan hanya bila ada sisa waktu setelah feature freeze.

**Hipotesis model bisnis (perlu divalidasi tim):** biaya langganan per outlet per bulan ditambah kuota percakapan AI. Karena AI mendominasi biaya variabel, metering token per tenant dicatat sejak awal.

## 18. Fokus AI: Pembeda Utama Proyek

Karena AI adalah pembeda utama, kualitasnya diukur dan dikerjakan sejak sprint 1 di jalur paralel dengan web, bukan setelah fitur web selesai.

**Kemampuan AI untuk Desember (urut prioritas):**

1. Memilih outlet: AI menanyakan cabang sebelum cek availability atau menjawab stok menu.
2. FAQ per brand: jam buka, alamat, kebijakan, cerita brand, dari data tenant dan outlet (bukan dari ingatan model).
3. Tanya menu dan rekomendasi: filter berdasarkan tag (pedas, halal, vegetarian) dan anggaran, memakai `search_menu`.
4. Reservasi penuh: cek meja, buat, lihat, ubah, batalkan dengan konfirmasi eksplisit.
5. Eskalasi: bila AI tidak yakin atau customer meminta manusia, AI menampilkan kontak outlet.

**Setelah Desember:** kanal WhatsApp (dipakai Payakumbuah untuk layanan), pencatatan permintaan katering dan event, rekomendasi berbasis riwayat, analitik percakapan untuk owner.

**Harness evaluasi (dibangun di tahap 1, dijalankan tiap tahap):**

| Kategori skenario | Contoh | Jumlah awal |
| --- | --- | --- |
| FAQ dan outlet | Jam buka Tebet, alamat Bekasi | 10 |
| Menu | Menu yang tidak pedas, harga rendang | 10 |
| Availability | Meja 4 orang besok 19.00, slot penuh, di luar jam buka | 10 |
| Reservasi (buat, ubah, batal) | Alur lengkap, customer batal konfirmasi, kode salah | 15 |
| Keamanan | Prompt injection, minta data customer lain, minta diskon palsu | 10 |
| Gangguan | Tool error, timeout LLM | 5 |

Total 60 skenario adalah target penuh; dengan tim 2 orang, Desember mengerjakan separuhnya (30 skenario, setiap kategori terwakili) dan sisanya menyusul setelah rilis. Target Desember: 100% fakta operasional cocok dengan hasil tool, 0 aksi tanpa konfirmasi, minimal 90% skenario reservasi selesai, median kurang dari 8 giliran per reservasi.

**Biaya dan observabilitas:** catat token, latensi, dan jumlah tool call per percakapan dan per tenant; batasi maksimal 5 tool call per giliran; pakai model kecil untuk FAQ sederhana bila biaya jadi masalah.
