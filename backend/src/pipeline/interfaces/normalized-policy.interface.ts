import { InterestCategory } from '../../common/enums/interest-category.enum';
import { RegionCode } from '../../common/enums/region-code.enum';

export interface NormalizedPolicyDocument {
  code: string;
  title: string;
  shortDescription: string;
  description: string;
  providerName: string;
  sourceUrl: string | null;
  applicationUrl: string | null;
  applicationMethod: string | null;
  categories: InterestCategory[];
  regionCodes: RegionCode[];
  minAge: number | null;
  maxAge: number | null;
  startsAt: string | null;
  endsAt: string | null;
  extraMeta: Record<string, unknown>;
}
