import { IsIn, IsOptional, IsString } from 'class-validator';

const reservationStatuses = [
  'pending',
  'confirmed',
  'rejected',
  'expired',
  'cancelled',
  'completed',
  'no_show',
] as const;

export class ListReservationsDto {
  @IsOptional()
  @IsIn(reservationStatuses)
  status?: (typeof reservationStatuses)[number];

  @IsOptional()
  @IsString()
  query?: string;
}
