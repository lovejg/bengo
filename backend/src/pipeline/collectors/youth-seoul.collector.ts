import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cheerio from 'cheerio';
import { RegionCode } from '../../common/enums/region-code.enum';
import { PolicyCollector } from '../interfaces/policy-collector.interface';
import { RawPolicyDocument } from '../interfaces/raw-policy.interface';

const BASE_URL = 'https://youth.seoul.go.kr';
const LIST_KEY = '2309150002';

/** 상시(001), 모집중(002), 모집예정(003) — 마감 제외 */
const RECRUIT_STATUS_FILTER = ['001', '002', '003'];

const REQUEST_DELAY_MS = 300;

interface PolicyListItem {
  id: string;
  title: string;
  category: string;
  description: string;
  /** 'ct' = 서울시, 'gu' = 자치구 */
  type: 'ct' | 'gu';
}

interface PolicyDetail {
  overview: Record<string, string>;
  eligibility: Record<string, string>;
  applicationMethod: Record<string, string>;
  etc: Record<string, string>;
}

@Injectable()
export class YouthSeoulCollector implements PolicyCollector {
  sourceName = 'youth-seoul';
  description = '청년몽땅정보통 (youth.seoul.go.kr) 크롤러';

  private readonly logger = new Logger(YouthSeoulCollector.name);
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled =
      this.configService.get<string>('YOUTH_SEOUL_ENABLED') !== 'false';
  }

  isConfigured(): boolean {
    return this.enabled;
  }

  async collect(): Promise<RawPolicyDocument[]> {
    if (!this.enabled) {
      this.logger.warn('Youth Seoul collector is disabled');
      return [];
    }

    const allItems: PolicyListItem[] = [];

    // 서울시 정책 목록
    const ctItems = await this.fetchAllListPages('ct');
    allItems.push(...ctItems);
    this.logger.log(`서울시 정책 ${ctItems.length}건 목록 수집 완료`);

    // 자치구 정책 목록
    const guItems = await this.fetchAllListPages('gu');
    allItems.push(...guItems);
    this.logger.log(`자치구 정책 ${guItems.length}건 목록 수집 완료`);

    // 상세 페이지 크롤링
    const results: RawPolicyDocument[] = [];
    for (const item of allItems) {
      try {
        const detail = await this.fetchDetail(item.id);
        results.push(this.toRawDocument(item, detail));
      } catch (error) {
        this.logger.warn(
          `상세 수집 실패 (${item.id}): ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      await this.delay(REQUEST_DELAY_MS);
    }

    this.logger.log(`총 ${results.length}건 상세 수집 완료`);
    return results;
  }

  private async fetchAllListPages(type: 'ct' | 'gu'): Promise<PolicyListItem[]> {
    const action = type === 'ct' ? 'ctList.do' : 'guList.do';
    const items: PolicyListItem[] = [];
    let page = 1;

    while (true) {
      const params = new URLSearchParams();
      params.set('key', LIST_KEY);
      params.set('pageIndex', String(page));
      for (const status of RECRUIT_STATUS_FILTER) {
        params.append('sc_rcritCurentSitu', status);
      }

      const url = `${BASE_URL}/infoData/plcyInfo/${action}?${params.toString()}`;
      const html = await this.fetchHtml(url);
      const pageItems = this.parseListPage(html, type);

      if (pageItems.length === 0) break;
      items.push(...pageItems);
      page++;

      await this.delay(REQUEST_DELAY_MS);
    }

    return items;
  }

  private parseListPage(html: string, type: 'ct' | 'gu'): PolicyListItem[] {
    const $ = cheerio.load(html);
    const items: PolicyListItem[] = [];

    // 각 정책 항목은 <li> 안에 goView('ID') onclick이 있는 <a> 태그
    $('a[onclick*="goView"]').each((_, el) => {
      const onclick = $(el).attr('onclick') ?? '';
      const idMatch = onclick.match(/goView\('([^']+)'\)/);
      if (!idMatch) return;

      const id = idMatch[1];
      const title = $(el).text().trim();
      const parent = $(el).closest('li');
      const category = parent.find('span').first().text().trim();
      const description = parent.find('em').text().trim();

      items.push({ id, title, category, description, type });
    });

    return items;
  }

  private async fetchDetail(policyId: string): Promise<PolicyDetail> {
    const url = `${BASE_URL}/infoData/plcyInfo/view.do?key=${LIST_KEY}&plcyBizId=${policyId}`;
    const html = await this.fetchHtml(url);
    const $ = cheerio.load(html);

    const sections: PolicyDetail = {
      overview: {},
      eligibility: {},
      applicationMethod: {},
      etc: {},
    };

    const sectionMap: Record<string, keyof PolicyDetail> = {
      사업개요: 'overview',
      신청자격: 'eligibility',
      신청방법: 'applicationMethod',
      기타: 'etc',
    };

    $('strong.tit').each((_, titleEl) => {
      const sectionTitle = $(titleEl).text().trim();
      const sectionKey = sectionMap[sectionTitle];
      if (!sectionKey) return;

      const table = $(titleEl).next('table');
      if (!table.length) return;

      table.find('tr').each((_, row) => {
        const ths = $(row).find('th');
        const tds = $(row).find('td');

        ths.each((i, th) => {
          const key = $(th).text().trim();
          const td = tds.eq(i);
          if (!td.length || !key) return;

          // 링크가 있으면 href 추출
          const link = td.find('a[href]').first();
          const href = link.length ? link.attr('href') : null;
          const text = td.text().trim().replace(/\s+/g, ' ');

          if (text || href) {
            sections[sectionKey][key] =
              href && href !== '#none' ? `${text} (${href})` : text;
          }
        });
      });
    });

    return sections;
  }

  private toRawDocument(item: PolicyListItem, detail: PolicyDetail): RawPolicyDocument {
    const overview = detail.overview;
    const eligibility = detail.eligibility;
    const appMethod = detail.applicationMethod;
    const etc = detail.etc;

    const providerName = overview['주관 기관'] ?? (item.type === 'ct' ? '서울특별시' : '서울시 자치구');
    const sourceUrl = this.extractUrl(appMethod['신청 사이트'])
      ?? this.extractUrl(etc['참고 사이트1'])
      ?? this.extractUrl(overview['관련 사이트']);

    const bodyParts = [
      overview['정책 소개'],
      overview['지원 내용'],
      overview['지원규모'] ? `지원규모: ${overview['지원규모']}` : null,
      eligibility['취업상태'] ? `취업상태 조건: ${eligibility['취업상태']}` : null,
      eligibility['학력'] ? `학력 조건: ${eligibility['학력']}` : null,
      eligibility['추가단서 사항'] ? `추가단서 사항: ${eligibility['추가단서 사항']}` : null,
      eligibility['참여제한 대상'] ? `참여제한 대상: ${eligibility['참여제한 대상']}` : null,
    ].filter(Boolean);

    return {
      source: this.sourceName,
      sourceUrl: sourceUrl ?? undefined,
      title: item.title,
      body: bodyParts.join('\n\n'),
      fetchedAt: new Date().toISOString(),
      metadata: {
        policyBizId: item.id,
        policyType: item.type,
        providerName,
        category: item.category,
        applicationUrl: sourceUrl,
        applicationMethod: appMethod['신청절차'] ?? null,
        supportContent: overview['지원 내용'] ?? null,
        selectionCriteria: eligibility['추가단서 사항'] ?? null,
        ageInfo: eligibility['연령'] ?? null,
        employmentStatus: eligibility['취업상태'] ?? null,
        educationReq: eligibility['학력'] ?? null,
        specializedReq: eligibility['특화분야 요건'] ?? null,
        participationTarget: eligibility['참여제한 대상'] ?? null,
        requiredDocuments: appMethod['제출서류'] ?? null,
        screeningMethod: appMethod['심사 및 발표'] ?? null,
        operatingPeriod: overview['사업운영기간'] ?? null,
        applicationPeriod: overview['사업신청기간'] ?? null,
        regionCodes: [RegionCode.SEOUL],
        raw: { overview, eligibility, applicationMethod: appMethod, etc },
      },
    };
  }

  private extractUrl(text: string | undefined): string | null {
    if (!text) return null;
    const match = text.match(/https?:\/\/[^\s)]+/);
    return match ? match[0] : null;
  }

  private async fetchHtml(url: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BengoBot/1.0)',
          'Accept': 'text/html',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      return response.text();
    } finally {
      clearTimeout(timeout);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
