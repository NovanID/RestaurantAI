import { IsString } from 'class-validator';

export class UpdateAreaDto {
  @IsString()
  name: string;
}
