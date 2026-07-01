import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class PreviewPipelineDto {
  @ApiProperty({ example: 'seoul-youth-api' })
  @IsString()
  source!: string;

  @ApiProperty({ example: 'https://example.go.kr/policy/123' })
  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @ApiProperty({ example: '2026 청년 취업 준비 지원 사업 공고' })
  @IsString()
  title!: string;

  @ApiProperty({
    example:
      '서울 거주 만 19세~34세 청년 대상, 월소득 300만원 이하에 한해 지원. 신청기간 2026-01-01 ~ 2026-12-31',
  })
  @IsString()
  body!: string;

  @ApiProperty({ example: '2026-02-25T00:00:00.000Z' })
  @IsString()
  fetchedAt!: string;

  @ApiProperty({ type: 'object', additionalProperties: true, required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
