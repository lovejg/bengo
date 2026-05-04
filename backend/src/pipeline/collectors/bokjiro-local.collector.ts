import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PolicyCollector } from '../interfaces/policy-collector.interface';
import { RawPolicyDocument } from '../interfaces/raw-policy.interface';
import { buildRawDocFromBokjiroItem, enrichWithDetail, fetchBokjiroItems } from './bokjiro-utils';

/**
 * 한국사회보장정보원 — 지자체복지서비스 (복지로 API)
 * 시·도·구 단위 지자체가 운영하는 복지 정책.
 *
 * BOKJIRO_LOCAL_CTPV_NMS (예: "서울특별시,경기도") 환경변수로 시도 필터링.
 * (API 파라미터명은 ctpvNm — 한글 시도 이름)
 */
@Injectable()
export class BokjiroLocalCollector implements PolicyCollector {
  sourceName = 'bokjiro-local';
  description = '복지로 지자체복지서비스 API 수집기';
  private readonly logger = new Logger(BokjiroLocalCollector.name);

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.configService.get<string>('BOKJIRO_LOCAL_API_URL') &&
        this.configService.get<string>('BOKJIRO_API_KEY'),
    );
  }

  async collect(): Promise<RawPolicyDocument[]> {
    const apiUrl = this.configService.get<string>('BOKJIRO_LOCAL_API_URL') ?? '';
    const apiKey = this.configService.get<string>('BOKJIRO_API_KEY') ?? '';
    const pageSize = Number(this.configService.get<string>('BOKJIRO_PAGE_SIZE') ?? 100);
    const maxPages = Number(this.configService.get<string>('BOKJIRO_MAX_PAGES') ?? 30);

    if (!apiUrl || !apiKey) {
      this.logger.warn('BOKJIRO_LOCAL_API_URL / BOKJIRO_API_KEY 미설정 — 빈 배열 반환');
      return [];
    }

    const ctpvNmsRaw = this.configService.get<string>('BOKJIRO_LOCAL_CTPV_NMS') ?? '';
    const ctpvNms = ctpvNmsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const allItems: Record<string, unknown>[] = [];
    if (ctpvNms.length === 0) {
      // 시도 미지정: 전체 호출 (단, NO DATA 가능성 있음)
      const items = await fetchBokjiroItems({ apiUrl, apiKey, pageSize, maxPages });
      allItems.push(...items);
    } else {
      for (const ctpvNm of ctpvNms) {
        const items = await fetchBokjiroItems({
          apiUrl,
          apiKey,
          pageSize,
          maxPages,
          extraParams: { ctpvNm },
        });
        allItems.push(...items);
      }
    }

    this.logger.log(`bokjiro-local: ${allItems.length} items fetched (list)`);

    // 상세조회로 enrichment
    const detailUrl = this.configService.get<string>('BOKJIRO_LOCAL_DETAIL_API_URL');
    let enriched = allItems;
    if (detailUrl) {
      const enrichLimit = Number(this.configService.get<string>('BOKJIRO_ENRICH_LIMIT') ?? 0) || undefined;
      enriched = await enrichWithDetail(allItems, detailUrl, apiKey, { limit: enrichLimit });
      this.logger.log(
        `bokjiro-local: enriched with detail (limit=${enrichLimit ?? 'none'}, total=${enriched.length})`,
      );
    } else {
      this.logger.warn('BOKJIRO_LOCAL_DETAIL_API_URL 미설정 — list 데이터만 사용');
    }

    return enriched.map((item) => buildRawDocFromBokjiroItem(this.sourceName, item));
  }
}
