import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InterestCategory } from '../../common/enums/interest-category.enum';
import { RegionCode } from '../../common/enums/region-code.enum';
import { PolicySortBy, SortOrder } from './list-policies-query.dto';

export class PublicListPoliciesQueryDto {
  @ApiPropertyOptional({ example: '청년' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: InterestCategory })
  @IsOptional()
  @IsEnum(InterestCategory)
  interest?: InterestCategory;

  @ApiPropertyOptional({ enum: RegionCode })
  @IsOptional()
  @IsEnum(RegionCode)
  regionCode?: RegionCode;

  @ApiPropertyOptional({ enum: PolicySortBy, default: PolicySortBy.LATEST })
  @IsOptional()
  @IsEnum(PolicySortBy)
  sortBy: PolicySortBy = PolicySortBy.LATEST;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  order: SortOrder = SortOrder.DESC;
}
