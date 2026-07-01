import { Gender } from '../../common/enums/gender.enum';
import { InterestCategory } from '../../common/enums/interest-category.enum';
import { RegionCode } from '../../common/enums/region-code.enum';

export interface CreateUserInput {
  email: string;
  password: string;
  age: number;
  gender: Gender;
  regionCode: RegionCode;
  interests: InterestCategory[];
}
