import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { InterestCategory } from '../../common/enums/interest-category.enum';
import { RegionCode } from '../../common/enums/region-code.enum';

export enum PolicySortBy {
  RELEVANCE = 'relevance',
  DEADLINE = 'deadline',
  LATEST = 'latest',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListPoliciesQueryDto {
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

  @ApiPropertyOptional({ enum: PolicySortBy, default: PolicySortBy.RELEVANCE })
  @IsOptional()
  @IsEnum(PolicySortBy)
  sortBy: PolicySortBy = PolicySortBy.RELEVANCE;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  order: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  onlyAvailable: boolean = true;
}
