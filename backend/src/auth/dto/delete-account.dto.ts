import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DeleteAccountDto {
  /** 일반 가입자(passwordHash 보유)는 필수, OAuth 전용 가입자는 생략 가능. */
  @ApiPropertyOptional({ example: 'CurrentP@ss123' })
  @IsOptional()
  @IsString()
  password?: string;
}
