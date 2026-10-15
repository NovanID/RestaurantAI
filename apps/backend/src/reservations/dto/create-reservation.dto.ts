import { IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class CreateReservationDto {
  @IsString() outletId: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) date: string;
  @Matches(/^\d{2}:\d{2}$/) time: string;
  @IsInt() @Min(1) partySize: number;
  @IsString() @MaxLength(100) name: string;
  @IsString() @MaxLength(30) phone: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
