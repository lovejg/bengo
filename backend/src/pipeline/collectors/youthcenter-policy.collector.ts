import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PolicyCollector } from '../interfaces/policy-collector.interface';
import { RawPolicyDocument } from '../interfaces/raw-policy.interface';
import {
  extractTotalCount,
  extractItems,
  fetchJson,
  mapMvpRegionCodesFromZipCdStrict,
  mapMvpRegionCodesFromStrings,
  pickFirstString,
  stringifyBody,
  withQuery,
} from './collector.utils';

@Injectable()
export class YouthcenterPolicyCollector implements PolicyCollector {
  sourceName = 'youthcenter-policy';
  description = '온통청년 청년정책 API 수집기';

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.configService.get<string>('YOUTHCENTER_POLICY_API_URL') &&
        this.configService.get<string>('YOUTHCENTER_POLICY_API_KEY'),
    );
  }

  async collect(): Promise<RawPolicyDocument[]> {
    const apiUrl = this.configService.get<string>('YOUTHCENTER_POLICY_API_URL');
    const apiKey = this.configService.get<string>('YOUTHCENTER_POLICY_API_KEY');

    if (!apiUrl || !apiKey) {
      throw new BadRequestException(
        'YOUTHCENTER_POLICY_API_URL, YOUTHCENTER_POLICY_API_KEY 환경 변수가 필요합니다.',
      );
    }

    const keyParam =
      this.configService.get<string>('YOUTHCENTER_POLICY_API_KEY_PARAM') ??
      'apiKeyNm';
    const pageParam =
      this.configService.get<string>('YOUTHCENTER_POLICY_PAGE_PARAM') ?? 'pageNum';
    const sizeParam =
      this.configService.get<string>('YOUTHCENTER_POLICY_PAGE_SIZE_PARAM') ?? 'pageSize';
    const pageTypeParam =
      this.configService.get<string>('YOUTHCENTER_POLICY_PAGE_TYPE_PARAM') ?? 'pageType';
    const pageTypeValue =
      this.configService.get<string>('YOUTHCENTER_POLICY_PAGE_TYPE') ?? '1';
    const returnTypeParam =
      this.configService.get<string>('YOUTHCENTER_POLICY_RETURN_TYPE_PARAM') ?? 'rtnType';
    const returnTypeValue =
      this.configService.get<string>('YOUTHCENTER_POLICY_RETURN_TYPE') ?? 'json';
    const pageSize = Number(
      this.configService.get<string>('YOUTHCENTER_POLICY_PAGE_SIZE') ?? 100,
    );
    const maxPages = Number(
      this.configService.get<string>('YOUTHCENTER_POLICY_MAX_PAGES') ?? 30,
    );
    const regionParam =
      this.configService.get<string>('YOUTHCENTER_POLICY_REGION_PARAM') ?? 'zipCd';
    const regionValue =
      this.configService.get<string>('YOUTHCENTER_POLICY_REGION_VALUE') ?? '11000';

    const items: Record<string, unknown>[] = [];
    let expectedTotal = Number.POSITIVE_INFINITY;
    for (let page = 1; page <= maxPages; page += 1) {
      const query: Record<string, string | number | boolean | undefined> = {
        [keyParam]: apiKey,
        [pageParam]: page,
        [sizeParam]: pageSize,
        [pageTypeParam]: pageTypeValue,
        [returnTypeParam]: returnTypeValue,
      };
      if (regionValue) {
        query[regionParam] = regionValue;
      }

      const url = withQuery(apiUrl, query);
      const payload = await fetchJson(url);
      const pageItems = extractItems(payload);
      const totalCount = extractTotalCount(payload);
      if (totalCount !== null) {
        expectedTotal = Math.min(expectedTotal, totalCount);
      }

      if (pageItems.length === 0) {
        break;
      }

      items.push(...pageItems);

      if (pageItems.length < pageSize || items.length >= expectedTotal) {
        break;
      }
    }
    const now = new Date().toISOString();

    return items
      .map((item) => {
        const title =
          pickFirstString(item, ['plcyNm', 'title', '정책명', '서비스명']) ?? '제목 없음';
        const sourceUrl = pickFirstString(item, [
          'aplyUrlAddr',
          'refUrlAddr1',
          'refUrlAddr2',
          'plcyUrl',
          'url',
          '상세조회URL',
        ]);
        const applicationMethod = pickFirstString(item, [
          'plcyAplyMthdCn',
          '신청방법',
          '신청방법내용',
        ]);
        const supportContent = pickFirstString(item, [
          'plcySprtCn',
          'plcyExplnCn',
          '지원내용',
        ]);
        const strictZipRegionCodes = mapMvpRegionCodesFromZipCdStrict(
          pickFirstString(item, ['zipCd']),
        );
        const nameBasedRegionCodes = mapMvpRegionCodesFromStrings([
          pickFirstString(item, ['zipCdNm']) ?? '',
          pickFirstString(item, ['operInstCdNm']) ?? '',
          pickFirstString(item, ['sprvsnInstCdNm']) ?? '',
          title,
        ]);
        const regionCodes =
          strictZipRegionCodes.length > 0
            ? strictZipRegionCodes
            : nameBasedRegionCodes;

        const ageInfo = pickFirstString(item, ['ageInfo', '연령정보']);
        const employmentStatus = pickFirstString(item, [
          'empmSttsCn', '취업상태내용', '취업상태',
        ]);
        const educationReq = pickFirstString(item, [
          'accrRqisCn', '학력요건', '학력',
        ]);
        const specializedReq = pickFirstString(item, [
          'splzRlmRqisCn', '특화분야', '전공요건',
        ]);
        const selectionCriteria = pickFirstString(item, [
          'plcySlcnCn', '선정기준',
        ]);
        const additionalQualification = pickFirstString(item, [
          'addAplyQlfcCndCn', '추가신청자격조건',
        ]);
        const screeningMethod = pickFirstString(item, [
          'srngMthdCn', '심사방법',
        ]);
        const requiredDocuments = pickFirstString(item, [
          'sbmsnDcmntCn', '제출서류',
        ]);
        const participationTarget = pickFirstString(item, [
          'ptcpPrpTrgtCn', '참여목적대상',
        ]);
        const applicationPeriod = pickFirstString(item, [
          'aplyYmd', 'rceptBgngYmd',
        ]);
        const minAgeRaw = pickFirstString(item, [
          'sprtTrgtMinAge', 'minAge', 'ageMinLmt',
        ]);
        const maxAgeRaw = pickFirstString(item, [
          'sprtTrgtMaxAge', 'maxAge', 'ageMaxLmt',
        ]);

        return {
          source: this.sourceName,
          sourceUrl: sourceUrl ?? undefined,
          title,
          body: stringifyBody(item),
          fetchedAt: now,
          metadata: {
            providerName:
              pickFirstString(item, [
                'operInstCdNm',
                'sprvsnInstCdNm',
                'cnsgNmor',
                '운영기관명',
                '기관명',
              ]) ?? '온통청년',
            applicationUrl: sourceUrl,
            applicationMethod,
            supportContent,
            selectionCriteria,
            additionalQualification,
            screeningMethod,
            requiredDocuments,
            participationTarget,
            ageInfo,
            employmentStatus,
            educationReq,
            specializedReq,
            minAge: minAgeRaw ? Number(minAgeRaw) : null,
            maxAge: maxAgeRaw ? Number(maxAgeRaw) : null,
            applicationPeriod,
            regionCodes,
            raw: item,
          },
        } satisfies RawPolicyDocument;
      });
  }
}
