export function getReservationStatusMeta(status: string): {
  label: string;
  badgeClass: string;
} {
  switch (status?.toLowerCase()) {
    case 'pending':
      return {
        label: 'Menunggu Konfirmasi',
        badgeClass: 'pending',
      };
    case 'confirmed':
      return {
        label: 'Terkonfirmasi',
        badgeClass: 'confirmed',
      };
    case 'rejected':
      return {
        label: 'Dibatalkan',
        badgeClass: 'rejected',
      };
    case 'cancelled':
      return {
        label: 'Dibatalkan Tamu',
        badgeClass: 'cancelled',
      };
    case 'completed':
      return {
        label: 'Selesai',
        badgeClass: 'active',
      };
    case 'active':
      return {
        label: 'Aktif',
        badgeClass: 'active',
      };
    case 'inactive':
      return {
        label: 'Nonaktif',
        badgeClass: 'inactive',
      };
    default:
      return {
        label: status || '-',
        badgeClass: 'neutral',
      };
  }
}
