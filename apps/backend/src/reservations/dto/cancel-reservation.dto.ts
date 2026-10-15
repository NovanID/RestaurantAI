import { Matches } from 'class-validator';

export class CancelReservationDto {
  @Matches(/^\d{4}$/)
  phoneLast4: string;
}
