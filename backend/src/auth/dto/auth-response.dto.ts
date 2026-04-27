import { ApiProperty } from '@nestjs/swagger';
import { Gender } from '../../common/enums/gender.enum';
import { InterestCategory } from '../../common/enums/interest-category.enum';
import { RegionCode } from '../../common/enums/region-code.enum';

class UserProfileSummaryDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ description: '이메일 인증 완료 여부 (OAuth는 자동 true)' })
  emailVerified!: boolean;

  @ApiProperty({ description: '프로필 미완성 OAuth 사용자는 false' })
  profileCompleted!: boolean;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ nullable: true })
  age!: number | null;

  @ApiProperty({ enum: Gender, nullable: true })
  gender!: Gender | null;

  @ApiProperty({ enum: RegionCode, nullable: true })
  regionCode!: RegionCode | null;

  @ApiProperty({ enum: InterestCategory, isArray: true })
  interests!: InterestCategory[];
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ type: UserProfileSummaryDto })
  user!: UserProfileSummaryDto;
}
