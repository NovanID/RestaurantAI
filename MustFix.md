What this change does:

Agent menambahkan modul NestJS untuk reservasi, availability, audit, menu, outlet/meja, serta halaman admin Next.js. Namun README_PHASE_2_COMPLETE.md tidak mencerminkan kode atau daftar task Linear Phase 2 yang sebenarnya.

Must fix

1. Dokumen completion sepenuhnya salah terhadap project ini (README_PHASE_2_COMPLETE.md (/C:/Users/VannID/MyProject/RestaurantAi/RestaurantAI/Documentation/README_PHASE_2_COMPLETE.md:3))
   - What this is: Dokumen mengklaim FastAPI/Python, React/Vite, OTP WhatsApp, serta issue PRO-95–PRO-104.
   - Problem: Repo ini adalah NestJS/Prisma dan Next.js; task Linear Phase 2 yang sebelumnya dibaca juga berbeda. Klaim “10/10 complete” dan “production ready” tidak dapat dipakai untuk handover atau QC.
   - Fix: Tulis ulang dari task Linear aktual dan file yang benar, atau hapus dokumen ini sampai ada bukti build/test.
   - If we skip it: Tim akan menganggap fitur yang tidak ada sebagai selesai dan menguji sistem yang salah.
2. Login admin rusak saat kredensial valid (login page (/C:/Users/VannID/MyProject/RestaurantAi/RestaurantAI/apps/frontend/src/app/admin/login/page.tsx:78))
   - What this is: Respons backend berbentuk data.data.user.
   - Problem: Frontend memakai data.user.tenantSlug dan data.user; nilainya undefined. Login sukses akan gagal sebelum redirect dashboard.
   - Fix: Ganti keduanya menjadi data.data.user.
   - If we skip it: Admin tidak bisa masuk melalui UI.
3. Role staff/manager/owner belum ditegakkan pada endpoint admin (menu controller (/C:/Users/VannID/MyProject/RestaurantAi/RestaurantAI/apps/backend/src/menu/menu.controller.ts:22), restaurant controller (/C:/Users/VannID/MyProject/RestaurantAi/RestaurantAI/apps/backend/src/restaurant/restaurant.controller.ts:22))
   - What this is: Semua endpoint hanya memeriksa JWT dan tenantId; role dari JWT tidak pernah digunakan.
   - Problem: Staff biasa dapat membuat, mengubah, atau menghapus menu/outlet/meja seperti owner.
   - Fix: Tambahkan guard role kecil pada endpoint yang memang khusus owner/manager.
   - If we skip it: Akses admin tidak sesuai model peran di schema dan PRD.
4. Pembatalan reservasi tidak membuat history maupun audit event (reservations service (/C:/Users/VannID/MyProject/RestaurantAi/RestaurantAI/apps/backend/src/reservations/reservations.service.ts:61))
   - What this is: cancel() langsung mengubah status menjadi cancelled.
   - Problem: Approve/reject dicatat ke reservationStatusHistory dan auditEvent, tetapi cancel tidak. Ini membuat jejak status tidak lengkap.
   - Fix: Gunakan transaksi yang sama dengan approve/reject untuk update, history, dan audit.
   - If we skip it: Audit trail tidak dapat dipercaya saat reservasi dibatalkan.

Should fix

5. Proteksi frontend memberi akses admin palsu di development (admin layout (/C:/Users/VannID/MyProject/RestaurantAi/RestaurantAI/apps/frontend/src/app/admin/layout.tsx:68))
   - What this is: Saat development tanpa token, layout membuat sesi owner dev-user.
   - Problem: Halaman admin terlihat dapat diakses tanpa login. Layout juga hanya mendecode JWT, bukan memverifikasi signature.
   - Fix: Redirect ke login jika token tidak ada/invalid; gunakan backend untuk verifikasi sesi bila dibutuhkan.
   - If we skip it: QA lokal bisa salah menyimpulkan autentikasi sudah aman/berfungsi.
6. Nonaktifkan kategori tidak menyembunyikan menu terkait dari katalog publik (menu service (/C:/Users/VannID/MyProject/RestaurantAi/RestaurantAI/apps/backend/src/menu/menu.service.ts:8), delete category (/C:/Users/VannID/MyProject/RestaurantAi/RestaurantAI/apps/backend/src/menu/menu.service.ts:20))
   - What this is: Saat kategori berisi menu, delete hanya membuat kategori inactive.
   - Problem: Query katalog publik memfilter menuItem.isActive/isAvailable, tetapi tidak memfilter category.isActive, sehingga menu dalam kategori nonaktif tetap terlihat bila tidak memakai filter kategori.
   - Fix: Tambahkan category: { is: { isActive: true } } pada query publik, atau nonaktifkan item terkait.
   - If we skip it: Admin mengira kategori/menu sudah disembunyikan, tetapi pelanggan masih melihat menu tersebut.
7. Klaim build dan production-ready belum terbukti
   - What this is: npm run build gagal.
   - Problem: Backend tidak menemukan nest/tsc; frontend kehilangan @swc/helpers. Checklist dokumen juga masih seluruhnya belum dicentang.
   - Fix: Pulihkan instalasi dependency, lalu jalankan build, lint, unit test, dan minimal E2E login/reservasi.
   - If we skip it: Tidak ada bukti code ini dapat dikompilasi atau dijalankan.

Verdict: fix 1–4 first.

Lean: hapus atau ganti dokumen completion yang berasal dari stack/project lain; itu mengurangi informasi menyesatkan jauh lebih banyak daripada menambah dokumentasi.

Not checked: build, lint, test, dan koneksi database tidak dapat diverifikasi karena dependency workspace masih parsial/rusak.
  