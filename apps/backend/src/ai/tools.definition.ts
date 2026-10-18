export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export const RESTAURANT_TOOLS: ToolDefinition[] = [
  {
    name: 'get_restaurant_info',
    description: 'Dapatkan profil restoran Padang, alamat seluruh cabang (Kemang, Tebet), jam operasional, kontak telepon, WhatsApp, dan fasilitas.',
    parameters: {
      type: 'object',
      properties: {
        outletSlug: {
          type: 'string',
          description: 'Slug cabang opsional (mis. kemang, tebet). Kosongkan untuk info semua cabang.',
        },
      },
    },
  },
  {
    name: 'search_menu',
    description: 'Cari daftar hidangan Minang di etalase berdasarkan nama, kategori (Lauk Utama, Minuman, dll), atau tag rasa (pedas, gurih, halal, favorit). Mengembalikan nama, harga, dan ketersediaan.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Kata kunci pencarian menu, misal rendang, tunjang, ayam pop' },
        category: { type: 'string', description: 'Nama kategori hidangan' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter tag rasa seperti pedas, halal, gurih',
        },
      },
    },
  },
  {
    name: 'check_availability',
    description: 'Cek ketersediaan meja makan untuk tanggal, jam, dan jumlah tamu di cabang tertentu sebelum mengajukan booking.',
    parameters: {
      type: 'object',
      required: ['outletSlug', 'date', 'time', 'partySize'],
      properties: {
        outletSlug: { type: 'string', description: 'Slug cabang (kemang atau tebet)' },
        date: { type: 'string', description: 'Tanggal makan format YYYY-MM-DD' },
        time: { type: 'string', description: 'Waktu kedatangan format HH:mm WIB' },
        partySize: { type: 'integer', description: 'Jumlah orang/tamu (1-12)' },
      },
    },
  },
  {
    name: 'verify_reservation',
    description: 'Verifikasi tiket reservasi customer menggunakan kode booking dan 4 digit terakhir nomor telepon untuk mengecek detail status atau persiapan ubah/batal.',
    parameters: {
      type: 'object',
      required: ['code', 'phoneLast4'],
      properties: {
        code: { type: 'string', description: 'Kode reservasi, mis. RSV-A1B2C3' },
        phoneLast4: { type: 'string', description: '4 digit terakhir nomor telepon customer' },
      },
    },
  },
  {
    name: 'create_reservation',
    description: 'Buat reservasi meja baru. PERINGATAN: Tool ini hanya boleh dipanggil SETELAH customer secara eksplisit menyetujui ringkasan booking (outlet, tanggal, jam, jumlah tamu, nama, telepon).',
    parameters: {
      type: 'object',
      required: ['outletSlug', 'date', 'time', 'partySize', 'customerName', 'customerPhone', 'idempotencyKey'],
      properties: {
        outletSlug: { type: 'string', description: 'Slug outlet restoran' },
        date: { type: 'string', description: 'Format YYYY-MM-DD' },
        time: { type: 'string', description: 'Format HH:mm WIB' },
        partySize: { type: 'integer', description: 'Jumlah tamu (1-12)' },
        customerName: { type: 'string', description: 'Nama lengkap pemesan' },
        customerPhone: { type: 'string', description: 'Nomor telepon aktif / WhatsApp' },
        notes: { type: 'string', description: 'Catatan tambahan tamu' },
        idempotencyKey: { type: 'string', description: 'Kunci unik idempotensi UUID v4 per submission' },
      },
    },
  },
  {
    name: 'update_reservation',
    description: 'Ubah jadwal, jam, atau jumlah tamu reservasi yang sudah terverifikasi sebelum batas cutoff waktu. Wajib konfirmasi eksplisit dari customer.',
    parameters: {
      type: 'object',
      required: ['code', 'phoneLast4'],
      properties: {
        code: { type: 'string', description: 'Kode reservasi (mis. RSV-123)' },
        phoneLast4: { type: 'string', description: '4 digit nomor telepon' },
        date: { type: 'string', description: 'Tanggal baru format YYYY-MM-DD' },
        time: { type: 'string', description: 'Waktu baru format HH:mm' },
        partySize: { type: 'integer', description: 'Jumlah tamu baru' },
        notes: { type: 'string', description: 'Catatan tambahan baru' },
      },
    },
  },
  {
    name: 'cancel_reservation',
    description: 'Batalkan reservasi customer yang sudah terverifikasi. Wajib konfirmasi eksplisit dari customer.',
    parameters: {
      type: 'object',
      required: ['code', 'phoneLast4'],
      properties: {
        code: { type: 'string', description: 'Kode booking' },
        phoneLast4: { type: 'string', description: '4 digit nomor telepon' },
      },
    },
  },
];
