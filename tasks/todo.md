# Phase 4: Full AI Integration & Tenant Hardening

## Overview
Status Linear Project: **In Progress**
Active Branch: `feat/phase-4-ai-integration-tenant-hardening`

## Issues
- [ ] PRO-87: Guard tenant + tes isolasi dua tenant
  - Inject tenant_id / outlet_id dari session / server context, cegah parameter spoofing dari LLM
  - Automated tests: pastikan tenant B tidak bisa akses data tenant A
- [ ] PRO-86: Rate limit chat dan endpoint publik
  - Throttler limit 20 pesan/menit per session/IP
  - Batas ukuran pesan dan limit max 5 tool call per LLM turn
  - Proteksi brute force verification (endpoint verify reservation)
- [ ] PRO-85: Alur chat penuh: outlet → availability → konfirmasi → booking
  - Multi-turn conversation flow end-to-end
  - Customer tanya ketersediaan → opsi riil meja → tanya data customer → ringkasan & konfirmasi eksplisit → booking tersimpan di DB
- [ ] PRO-84: Evaluasi AI 30 skenario
  - Automated evaluation runner untuk 30 test cases
  - Skenario: happy path, tanggal tutup, meja penuh, prompt injection, pembatalan, validasi nama/telepon
  - Target kelulusan 100%
