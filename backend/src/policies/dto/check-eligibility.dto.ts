import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class CheckEligibilityDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: {
      monthlyIncome: 280,
      employmentStatus: '취준',
    },
  })
  @IsObject()
  answers!: Record<string, unknown>;
}
