import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ChatHistoryItemDto {
  @IsIn(['user', 'assistant'], {
    message: 'Role riwayat chat hanya boleh bernilai user atau assistant.',
  })
  role: 'user' | 'assistant';

  @IsString()
  @IsNotEmpty({ message: 'Konten riwayat tidak boleh kosong.' })
  @MaxLength(2000, { message: 'Konten riwayat maksimal 2000 karakter.' })
  content: string;
}

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'Pesan chat wajib diisi.' })
  @MaxLength(1000, { message: 'Pesan terlalu panjang (maksimal 1000 karakter).' })
  message: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20, { message: 'Riwayat pesan maksimal 20 percakapan.' })
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryItemDto)
  history?: ChatHistoryItemDto[];
}
