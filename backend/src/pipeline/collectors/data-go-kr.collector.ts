import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PolicyCollector } from '../interfaces/policy-collector.interface';
import { RawPolicyDocument } from '../interfaces/raw-policy.interface';
import {
  extractTotalCount,
  extractItems,
  fetchJson,
  mapMvpRegionCodesFromStrings,
  pickFirstString,
  stringifyBody,
  withQuery,
} from './collector.utils';

@Injectable()
export class DataGoKrCollector implements PolicyCollector {
  sourceName = 'data-go-kr';
  description = 'data.go.kr 공공서비스 혜택 API 수집기';
  private readonly logger = new Logger(DataGoKrCollector.name);

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.configService.get<string>('DATA_GO_KR_API_URL') &&
        this.configService.get<string>('DATA_GO_KR_API_KEY'),
    );
  }

  async collect(): Promise<RawPolicyDocument[]> {
    const apiUrl = this.configService.get<string>('DATA_GO_KR_API_URL');
    const apiKey = this.configService.get<string>('DATA_GO_KR_API_KEY');

    if (!apiUrl || !apiKey) {
      throw new BadRequestException(
        'DATA_GO_KR_API_URL, DATA_GO_KR_API_KEY 환경 변수가 필요합니다.',
      );
    }

    const keyParam =
      this.configService.get<string>('DATA_GO_KR_API_KEY_PARAM') ?? 'serviceKey';
    const pageParam = this.configService.get<string>('DATA_GO_KR_PAGE_PARAM') ?? 'page';
    const sizeParam =
      this.configService.get<string>('DATA_GO_KR_PAGE_SIZE_PARAM') ?? 'perPage';
    const pageSize = Number(this.configService.get<string>('DATA_GO_KR_PAGE_SIZE') ?? 100);
    const maxPages = Number(this.configService.get<string>('DATA_GO_KR_MAX_PAGES') ?? 20);

    // 사전 필터: gov24 API의 cond 파라미터로 청년 관련 서비스만 수집해 API 호출을 줄인다.
    // DATA_GO_KR_FILTER_KEYWORD=청년 이면 cond[서비스명::LIKE]=%청년% 파라미터가 추가된다.
    const filterKeyword = this.configService.get<string>('DATA_GO_KR_FILTER_KEYWORD');
    const filterField =
      this.configService.get<string>('DATA_GO_KR_FILTER_FIELD') ?? '서비스명';

    const items: Record<string, unknown>[] = [];
    let expectedTotal = Number.POSITIVE_INFINITY;
    for (let page = 1; page <= maxPages; page += 1) {
      const params: Record<string, string | number | boolean | undefined> = {
        [keyParam]: apiKey,
        [pageParam]: page,
        [sizeParam]: pageSize,
        returnType: 'JSON',
      };

      let url = withQuery(apiUrl, params);
      if (filterKeyword) {
        // 대괄호가 포함된 cond 파라미터는 URLSearchParams가 인코딩하므로 직접 append
        url += `&cond[${filterField}::LIKE]=${encodeURIComponent(`%${filterKeyword}%`)}`;
      }

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

    // gov.kr 상세 크롤링은 수집 단계에서 하지 않음
    // — 3000개 전체 크롤링 시 서버 OOM 발생 위험
    // — 적재 후 MVP 범위 내 정책(~50개)에 대해서만 enrich-policies로 별도 실행
    const results: RawPolicyDocument[] = [];
    for (const item of items) {
        const title =
          pickFirstString(item, ['서비스명', '서비스명칭', 'title', 'svcNm', 'plcyNm']) ??
          '제목 없음';
        const sourceUrl = pickFirstString(item, [
          '상세조회URL',
          '서비스URL',
          'url',
          'svcDtlLinkUrl',
          'plcyUrl',
        ]);
        const regionCodes = mapMvpRegionCodesFromStrings([
          pickFirstString(item, ['소관기관명']) ?? '',
          pickFirstString(item, ['접수기관']) ?? '',
          title,
          sourceUrl ?? '',
        ]);

        const applicationUrl = pickFirstString(item, [
          '신청URL', '온라인신청사이트URL', 'svcDtlLinkUrl',
        ]);
        const applicationMethod = pickFirstString(item, [
          '신청방법내용', '신청방법', 'aplyMthdNm',
        ]);
        const supportContent = pickFirstString(item, [
          '지원내용', '서비스내용', '서비스목적요약',
        ]);
        const selectionCriteria = pickFirstString(item, [
          '선정기준내용', '선정기준', '자격요건',
        ]);
        const supportType = pickFirstString(item, ['지원유형', 'svcTypNm']);
        const applicationDeadline = pickFirstString(item, [
          '신청기한내용', '신청기한', '접수기한',
        ]);
        const targetAgeInfo = pickFirstString(item, ['지원대상', '대상', '연령정보']);
        const minAgeRaw = pickFirstString(item, [
          'sprtTrgtMinAge', '지원대상최소연령',
        ]);
        const maxAgeRaw = pickFirstString(item, [
          'sprtTrgtMaxAge', '지원대상최대연령',
        ]);
        const applicationPeriod = pickFirstString(item, [
          'aplyYmd', '신청기간',
        ]);

        results.push({
          source: this.sourceName,
          sourceUrl: sourceUrl ?? undefined,
          title,
          body: stringifyBody(item),
          fetchedAt: now,
          metadata: {
            providerName:
              pickFirstString(item, ['소관기관명', '기관명', 'provider', 'instNm']) ??
              'data.go.kr',
            regionCodes,
            applicationUrl: applicationUrl ?? sourceUrl,
            applicationMethod,
            supportContent,
            selectionCriteria,
            supportType,
            applicationDeadline,
            targetAgeInfo,
            minAge: minAgeRaw ? Number(minAgeRaw) : null,
            maxAge: maxAgeRaw ? Number(maxAgeRaw) : null,
            applicationPeriod,
            warnBox: null,
            requiredDocuments: null,
            receptionInfo: null,
            raw: item,
          },
        } satisfies RawPolicyDocument);
    }

    return results;
  }

}
