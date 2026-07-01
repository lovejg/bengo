import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Gender } from '../../common/enums/gender.enum';
import { InterestCategory } from '../../common/enums/interest-category.enum';
import { RegionCode } from '../../common/enums/region-code.enum';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 26 })
  @IsOptional()
  @IsInt()
  @Min(14)
  @Max(120)
  age?: number;

  @ApiPropertyOptional({ enum: Gender, example: Gender.UNSPECIFIED })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ enum: RegionCode, example: RegionCode.SEOUL })
  @IsOptional()
  @IsEnum(RegionCode)
  regionCode?: RegionCode;

  @ApiPropertyOptional({ enum: InterestCategory, isArray: true, example: [InterestCategory.YOUTH] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsEnum(InterestCategory, { each: true })
  interests?: InterestCategory[];

  @ApiPropertyOptional({ example: '홍길동' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName?: string;
}
