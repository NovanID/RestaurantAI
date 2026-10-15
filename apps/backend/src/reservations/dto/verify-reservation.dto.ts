import { IsString, Matches } from 'class-validator';

export class VerifyReservationDto {
  @IsString() code: string;
  @Matches(/^\d{4}$/) phoneLast4: string;
}
