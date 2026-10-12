export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export const RESTAURANT_TOOLS: ToolDefinition[] = [
  {
    name: 'get_restaurant_info',
    description: 'Dapatkan profil restoran, alamat cabang, jam buka, kontak, dan kebijakan.',
    parameters: {
      type: 'object',
      properties: {
        outletSlug: {
          type: 'string',
          description: 'Slug cabang restoran, misal kemang atau tebet.',
        },
      },
    },
  },
  {
    name: 'search_menu',
    description: 'Cari menu berdasarkan nama, kategori, atau tag (seperti pedas, halal).',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Kata kunci pencarian menu' },
        category: { type: 'string', description: 'Nama kategori menu' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tag menu (pedas, halal, gurih)',
        },
      },
    },
  },
  {
    name: 'check_availability',
    description: 'Cek ketersediaan meja untuk tanggal, jam, dan jumlah tamu di cabang tertentu.',
    parameters: {
      type: 'object',
      required: ['outletSlug', 'date', 'time', 'partySize'],
      properties: {
        outletSlug: { type: 'string', description: 'Slug outlet restoran' },
        date: { type: 'string', description: 'Format YYYY-MM-DD' },
        time: { type: 'string', description: 'Format HH:mm (WIB)' },
        partySize: { type: 'integer', description: 'Jumlah tamu (1-12)' },
      },
    },
  },
  {
    name: 'create_reservation',
    description: 'Buat reservasi meja baru setelah konfirmasi eksplisit dari customer.',
    parameters: {
      type: 'object',
      required: ['outletSlug', 'date', 'time', 'partySize', 'customerName', 'customerPhone', 'idempotencyKey'],
      properties: {
        outletSlug: { type: 'string' },
        date: { type: 'string' },
        time: { type: 'string' },
        partySize: { type: 'integer' },
        customerName: { type: 'string' },
        customerPhone: { type: 'string' },
        notes: { type: 'string' },
        idempotencyKey: { type: 'string' },
      },
    },
  },
];
