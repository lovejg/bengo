import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RegionCode } from '../../common/enums/region-code.enum';
import { PolicyCollector } from '../interfaces/policy-collector.interface';
import { RawPolicyDocument } from '../interfaces/raw-policy.interface';
import { buildRawDocFromBokjiroItem, enrichWithDetail, fetchBokjiroItems } from './bokjiro-utils';

/**
 * 한국사회보장정보원 — 중앙부처복지서비스 (복지로 API)
 * 보건복지부·고용노동부·여성가족부 등 중앙부처가 운영하는 전국 단위 복지 정책.
 */
@Injectable()
export class BokjiroCentralCollector implements PolicyCollector {
  sourceName = 'bokjiro-central';
  description = '복지로 중앙부처복지서비스 API 수집기';
  private readonly logger = new Logger(BokjiroCentralCollector.name);

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.configService.get<string>('BOKJIRO_CENTRAL_API_URL') &&
        this.configService.get<string>('BOKJIRO_API_KEY'),
    );
  }

  async collect(): Promise<RawPolicyDocument[]> {
    const apiUrl = this.configService.get<string>('BOKJIRO_CENTRAL_API_URL') ?? '';
    const apiKey = this.configService.get<string>('BOKJIRO_API_KEY') ?? '';
    const pageSize = Number(this.configService.get<string>('BOKJIRO_PAGE_SIZE') ?? 100);
    const maxPages = Number(this.configService.get<string>('BOKJIRO_MAX_PAGES') ?? 30);

    if (!apiUrl || !apiKey) {
      this.logger.warn('BOKJIRO_CENTRAL_API_URL / BOKJIRO_API_KEY 미설정 — 빈 배열 반환');
      return [];
    }

    const items = await fetchBokjiroItems({
      apiUrl,
      apiKey,
      pageSize,
      maxPages,
      // 중앙부처 V001 API 필수 파라미터:
      // - callTp='L' : 목록 조회
      // - srchKeyCode='001' : 검색 기준 (전체 검색)
      // - orderBy='date' : 정렬 (최신순; 미리보기는 'popular'이지만 우리 용도엔 date가 적합)
      extraParams: { callTp: 'L', srchKeyCode: '001', orderBy: 'date' },
    });
    this.logger.log(`bokjiro-central: ${items.length} items fetched (list)`);

    // 상세조회로 enrichment — list만으론 description이 너무 짧아 LLM이 자격 조건 추출 불가
    const detailUrl = this.configService.get<string>('BOKJIRO_CENTRAL_DETAIL_API_URL');
    let enriched = items;
    if (detailUrl) {
      const enrichLimit = Number(this.configService.get<string>('BOKJIRO_ENRICH_LIMIT') ?? 0) || undefined;
      // 중앙부처 detail은 callTp='D' 필요
      enriched = await enrichWithDetail(items, detailUrl, apiKey, {
        extraParams: { callTp: 'D' },
        limit: enrichLimit,
      });
      this.logger.log(
        `bokjiro-central: enriched with detail (limit=${enrichLimit ?? 'none'}, total=${enriched.length})`,
      );
    } else {
      this.logger.warn('BOKJIRO_CENTRAL_DETAIL_API_URL 미설정 — list 데이터만 사용');
    }

    // 중앙부처 정책은 전국 적용 → 지역 미감지 시 SEOUL을 디폴트로
    // (기간은 raw에 단서 없으면 그대로 두기 — 임의로 '상시' 단정하면 사용자에게 잘못된 정보)
    return enriched.map((item) =>
      buildRawDocFromBokjiroItem(this.sourceName, item, [RegionCode.SEOUL]),
    );
  }
}
