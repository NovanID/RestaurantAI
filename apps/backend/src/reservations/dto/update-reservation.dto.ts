import { IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class UpdateReservationDto {
  @Matches(/^\d{4}$/)
  phoneLast4: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  time?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  partySize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
