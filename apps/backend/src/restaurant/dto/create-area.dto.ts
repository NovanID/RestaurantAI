import { IsString, IsInt, IsBoolean, IsOptional } from 'class-validator';

export class CreateAreaDto {
  @IsString()
  name: string;
}
