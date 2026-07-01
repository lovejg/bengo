import { Gender } from '../../common/enums/gender.enum';
import { InterestCategory } from '../../common/enums/interest-category.enum';
import { RegionCode } from '../../common/enums/region-code.enum';

export interface CompleteProfileInput {
  age: number;
  gender: Gender;
  regionCode: RegionCode;
  interests: InterestCategory[];
}
