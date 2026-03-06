import { ApiProperty } from '@nestjs/swagger';
import { Gender } from '../../common/enums/gender.enum';
import { InterestCategory } from '../../common/enums/interest-category.enum';
import { RegionCode } from '../../common/enums/region-code.enum';

class UserProfileSummaryDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  age!: number;

  @ApiProperty({ enum: Gender })
  gender!: Gender;

  @ApiProperty({ enum: RegionCode })
  regionCode!: RegionCode;

  @ApiProperty({ enum: InterestCategory, isArray: true })
  interests!: InterestCategory[];
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ type: UserProfileSummaryDto })
  user!: UserProfileSummaryDto;
}
