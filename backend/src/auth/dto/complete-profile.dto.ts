import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsInt, Max, Min } from 'class-validator';
import { Gender } from '../../common/enums/gender.enum';
import { InterestCategory } from '../../common/enums/interest-category.enum';
import { RegionCode } from '../../common/enums/region-code.enum';

export class CompleteProfileDto {
  @ApiProperty({ example: 26 })
  @IsInt()
  @Min(14)
  @Max(120)
  age!: number;

  @ApiProperty({ enum: Gender, example: Gender.UNSPECIFIED })
  @IsEnum(Gender)
  gender!: Gender;

  @ApiProperty({ enum: RegionCode, example: RegionCode.SEOUL })
  @IsEnum(RegionCode)
  regionCode!: RegionCode;

  @ApiProperty({ enum: InterestCategory, isArray: true, example: [InterestCategory.YOUTH] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsEnum(InterestCategory, { each: true })
  interests!: InterestCategory[];
}
