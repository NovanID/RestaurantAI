import { IsString, IsOptional, IsInt, Min, IsArray, ValidateNested } from 'class-validator';

export class CreateMenuItemDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(0)
  priceIdr: number;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];
}
