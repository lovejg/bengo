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

    const keyParam = this.configService.get<string>('DATA_GO_KR_API_KEY_PARAM') ?? 'serviceKey';
    const pageParam = this.configService.get<string>('DATA_GO_KR_PAGE_PARAM') ?? 'page';
    const sizeParam = this.configService.get<string>('DATA_GO_KR_PAGE_SIZE_PARAM') ?? 'perPage';
    const pageSize = Number(this.configService.get<string>('DATA_GO_KR_PAGE_SIZE') ?? 100);
    const maxPages = Number(this.configService.get<string>('DATA_GO_KR_MAX_PAGES') ?? 20);

    // 사전 필터: gov24 API의 cond 파라미터로 카테고리 관련 서비스만 수집해 API 호출을 줄인다.
    // DATA_GO_KR_FILTER_KEYWORDS=청년,육아,노인,장애인 처럼 콤마 구분으로 여러 키워드 호출.
    // (단일값 DATA_GO_KR_FILTER_KEYWORD도 하위호환 유지)
    const keywordsRaw =
      this.configService.get<string>('DATA_GO_KR_FILTER_KEYWORDS') ??
      this.configService.get<string>('DATA_GO_KR_FILTER_KEYWORD') ??
      '';
    const filterKeywords = keywordsRaw
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    const filterField = this.configService.get<string>('DATA_GO_KR_FILTER_FIELD') ?? '서비스명';

    const buildPageUrl = (page: number, keyword: string | null): string => {
      const params: Record<string, string | number | boolean | undefined> = {
        [keyParam]: apiKey,
        [pageParam]: page,
        [sizeParam]: pageSize,
        returnType: 'JSON',
      };
      let url = withQuery(apiUrl, params);
      if (keyword) {
        // 대괄호가 포함된 cond 파라미터는 URLSearchParams가 인코딩하므로 직접 append
        url += `&cond[${filterField}::LIKE]=${encodeURIComponent(`%${keyword}%`)}`;
      }
      return url;
    };

    const seenKeys = new Set<string>();
    const items: Record<string, unknown>[] = [];
    // 키워드 없으면 단일 호출(전체 조회), 있으면 키워드별로 페이지네이션
    const keywordIterations = filterKeywords.length > 0 ? filterKeywords : [null];

    for (const keyword of keywordIterations) {
      let expectedTotal = Number.POSITIVE_INFINITY;
      for (let page = 1; page <= maxPages; page += 1) {
        const url = buildPageUrl(page, keyword);
        const payload = await fetchJson(url);
        const pageItems = extractItems(payload);
        const totalCount = extractTotalCount(payload);
        if (totalCount !== null) {
          expectedTotal = Math.min(expectedTotal, totalCount);
        }

        if (pageItems.length === 0) break;

        // 동일 plcyNo/서비스ID 중복 제거 (키워드 간 겹침 방지)
        for (const item of pageItems) {
          const key =
            pickFirstString(item, ['plcyNo', '서비스ID', 'svcId']) ?? JSON.stringify(item);
          if (seenKeys.has(key)) continue;
          seenKeys.add(key);
          items.push(item);
        }

        if (pageItems.length < pageSize || items.length >= expectedTotal) break;
      }
    }
    const now = new Date().toISOString();

    // 상세 정보 enrichment — supportConditions API로 자격 조건 보강
    // (LLM이 자격 조건 추출하기 위해 description만으로는 부족)
    const detailUrl = this.configService.get<string>('DATA_GO_KR_DETAIL_API_URL');
    const conditionsUrl = this.configService.get<string>('DATA_GO_KR_CONDITIONS_API_URL');
    if (detailUrl || conditionsUrl) {
      await this.enrichItems(items, apiKey, keyParam, detailUrl, conditionsUrl);
      this.logger.log(`data-go-kr: enriched ${items.length} items with detail/conditions`);
    }

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
        '신청URL',
        '온라인신청사이트URL',
        'svcDtlLinkUrl',
      ]);
      const applicationMethod = pickFirstString(item, ['신청방법내용', '신청방법', 'aplyMthdNm']);
      const supportContent = pickFirstString(item, ['지원내용', '서비스내용', '서비스목적요약']);
      const selectionCriteria = pickFirstString(item, ['선정기준내용', '선정기준', '자격요건']);
      const supportType = pickFirstString(item, ['지원유형', 'svcTypNm']);
      const applicationDeadline = pickFirstString(item, ['신청기한내용', '신청기한', '접수기한']);
      const targetAgeInfo = pickFirstString(item, ['지원대상', '대상', '연령정보']);
      const minAgeRaw = pickFirstString(item, ['sprtTrgtMinAge', '지원대상최소연령']);
      const maxAgeRaw = pickFirstString(item, ['sprtTrgtMaxAge', '지원대상최대연령']);
      const applicationPeriod = pickFirstString(item, ['aplyYmd', '신청기간']);

      // detail/conditions enrichment로 추가된 필드들을 한 본문에 합쳐 LLM이 읽도록
      const richBodyParts = [
        pickFirstString(item, ['지원내용', '서비스내용', '서비스목적']),
        pickFirstString(item, ['지원대상', 'targetAgeInfo']),
        pickFirstString(item, ['선정기준']),
        pickFirstString(item, ['신청방법', '신청방법내용']),
        pickFirstString(item, ['신청기한']),
        pickFirstString(item, ['구비서류']),
        pickFirstString(item, ['법령']),
        item['supportContent'] && typeof item['supportContent'] === 'string'
          ? (item['supportContent'] as string)
          : null, // enrichItems에서 [지원조건] 누적된 부분
      ].filter((v): v is string => Boolean(v && v.trim()));
      const body = richBodyParts.length > 0 ? richBodyParts.join('\n\n') : stringifyBody(item);

      results.push({
        source: this.sourceName,
        sourceUrl: sourceUrl ?? undefined,
        title,
        body,
        fetchedAt: now,
        metadata: {
          providerName:
            pickFirstString(item, ['소관기관명', '기관명', 'provider', 'instNm']) ?? 'data.go.kr',
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

  /**
   * gov24 v3 API의 serviceDetail / supportConditions를 호출해 item에 병합.
   * 각 item을 직접 mutate (raw 객체는 list 결과 그대로 유지하면서 신규 키 추가).
   */
  private async enrichItems(
    items: Record<string, unknown>[],
    apiKey: string,
    keyParam: string,
    detailUrl: string | undefined,
    conditionsUrl: string | undefined,
  ): Promise<void> {
    const CONCURRENCY = 5;
    let detailSuccess = 0;
    let conditionsSuccess = 0;

    for (let i = 0; i < items.length; i += CONCURRENCY) {
      const chunk = items.slice(i, i + CONCURRENCY);
      await Promise.all(
        chunk.map(async (item) => {
          const serviceId = pickFirstString(item, ['서비스ID', 'svcId', 'plcyNo']);
          if (!serviceId) return;

          const params: Record<string, string | number | boolean | undefined> = {
            [keyParam]: apiKey,
            page: 1,
            perPage: 10,
            returnType: 'JSON',
          };
          const filterSuffix = `&cond[서비스ID::EQ]=${encodeURIComponent(serviceId)}`;

          if (detailUrl) {
            try {
              const detail = await fetchJson(withQuery(detailUrl, params) + filterSuffix);
              const detailItems = extractItems(detail);
              if (detailItems[0]) {
                Object.assign(item, detailItems[0]);
                detailSuccess += 1;
              }
            } catch {
              // 무시
            }
          }
          if (conditionsUrl) {
            try {
              const conditions = await fetchJson(withQuery(conditionsUrl, params) + filterSuffix);
              const conditionItems = extractItems(conditions);
              if (conditionItems[0]) {
                const condText = JSON.stringify(conditionItems[0]);
                const existing = (item['supportContent'] as string | undefined) ?? '';
                item['supportContent'] = `${existing}\n[지원조건]\n${condText}`.trim();
                conditionsSuccess += 1;
              }
            } catch {
              // 무시
            }
          }
        }),
      );
    }
    this.logger.log(
      `data-go-kr enrichment 완료: detail 성공=${detailSuccess}/${items.length}, conditions 성공=${conditionsSuccess}/${items.length}`,
    );
  }
}
