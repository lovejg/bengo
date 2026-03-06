import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserPolicyState } from '../../common/enums/user-policy-state.enum';

export class UpdateUserPolicyStateDto {
  @ApiProperty({ enum: UserPolicyState })
  @IsEnum(UserPolicyState)
  state!: UserPolicyState;

  @ApiPropertyOptional({ example: '서류 제출 완료, 결과 대기 중' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
