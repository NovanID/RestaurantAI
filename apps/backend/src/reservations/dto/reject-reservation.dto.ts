import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectReservationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
