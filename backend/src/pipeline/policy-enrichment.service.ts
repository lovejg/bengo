import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as cheerio from 'cheerio';
import { PolicyStatus } from '../common/enums/policy-status.enum';
import { Policy } from '../database/entities';

export interface EnrichResult {
  total: number;
  enriched: number;
  skipped: number;
  failed: number;
  details: Array<{ code: string; fields: string[] }>;
}

interface ParsedGovDetail {
  applicationPeriod?: string;
  supportTarget?: string;
  supportContent?: string;
  applicationMethod?: string;
  requiredDocuments?: string;
  contactInfo?: string;
  homepageUrl?: string;
  warnBox?: string;
}

@Injectable()
export class PolicyEnrichmentService {
  private readonly logger = new Logger(PolicyEnrichmentService.name);
  private readonly REQUEST_DELAY_MS = 1500;

  constructor(
    @InjectRepository(Policy)
    private readonly policyRepository: Repository<Policy>,
  ) {}

  async enrichActivePolicies(): Promise<EnrichResult> {
    const policies = await this.policyRepository.find({
      where: { status: PolicyStatus.ACTIVE },
    });

    const result: EnrichResult = {
      total: policies.length,
      enriched: 0,
      skipped: 0,
      failed: 0,
      details: [],
    };

    for (const policy of policies) {
      const sourceUrl = policy.sourceUrl;
      if (!sourceUrl) {
        result.skipped += 1;
        continue;
      }

      // gov.kr 상세 페이지만 크롤링
      if (!sourceUrl.includes('gov.kr/portal/')) {
        result.skipped += 1;
        continue;
      }

      try {
        const updatedFields = await this.enrichFromGovKr(policy, sourceUrl);
        if (updatedFields.length > 0) {
          result.enriched += 1;
          result.details.push({ code: policy.code, fields: updatedFields });
        } else {
          result.skipped += 1;
        }
      } catch (error) {
        result.failed += 1;
        this.logger.warn(
          `Failed to enrich ${policy.code}: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }

      await this.delay(this.REQUEST_DELAY_MS);
    }

    this.logger.log(
      `Enrichment complete: ${result.enriched} enriched, ${result.skipped} skipped, ${result.failed} failed`,
    );

    return result;
  }

  private async enrichFromGovKr(
    policy: Policy,
    url: string,
  ): Promise<string[]> {
    const html = await this.fetchHtml(url);
    if (!html) return [];

    const parsed = this.parseGovKrDetail(html);
    const updatedFields: string[] = [];
    const extra = (policy.extraMeta ?? {}) as Record<string, unknown>;
    let changed = false;

    // applicationMethod — 빈 경우만 채움
    if (
      (!policy.applicationMethod || policy.applicationMethod.trim() === '') &&
      parsed.applicationMethod
    ) {
      policy.applicationMethod = parsed.applicationMethod.slice(0, 500);
      updatedFields.push('applicationMethod');
      changed = true;
    }

    // startsAt/endsAt — 빈 경우만 채움
    if (!policy.startsAt && parsed.applicationPeriod) {
      const dates = this.extractDatesFromText(parsed.applicationPeriod);
      if (dates.startsAt) {
        policy.startsAt = dates.startsAt;
        updatedFields.push('startsAt');
        changed = true;
      }
      if (!policy.endsAt && dates.endsAt) {
        policy.endsAt = dates.endsAt;
        updatedFields.push('endsAt');
        changed = true;
      }
    }

    if (!extra.supportContent && parsed.supportContent) {
      extra.supportContent = parsed.supportContent.slice(0, 2000);
      updatedFields.push('extraMeta.supportContent');
      changed = true;
    }
    if (!extra.supportTarget && parsed.supportTarget) {
      extra.supportTarget = parsed.supportTarget.slice(0, 1000);
      updatedFields.push('extraMeta.supportTarget');
      changed = true;
    }
    if (!extra.requiredDocuments && parsed.requiredDocuments) {
      extra.requiredDocuments = parsed.requiredDocuments.slice(0, 1000);
      updatedFields.push('extraMeta.requiredDocuments');
      changed = true;
    }
    if (!extra.contactInfo && parsed.contactInfo) {
      extra.contactInfo = parsed.contactInfo.slice(0, 500);
      updatedFields.push('extraMeta.contactInfo');
      changed = true;
    }
    if (!extra.applicationDeadline && parsed.applicationPeriod) {
      extra.applicationDeadline = parsed.applicationPeriod.slice(0, 200);
      updatedFields.push('extraMeta.applicationDeadline');
      changed = true;
    }
    if (!extra.warnBox && parsed.warnBox) {
      extra.warnBox = parsed.warnBox.slice(0, 500);
      updatedFields.push('extraMeta.warnBox');
      changed = true;
    }

    if (changed) {
      policy.extraMeta = extra;
      await this.policyRepository.save(policy);
    }

    return updatedFields;
  }

  private parseGovKrDetail(html: string): ParsedGovDetail {
    const $ = cheerio.load(html);
    const result: ParsedGovDetail = {};

    const fieldMap: Record<string, keyof ParsedGovDetail> = {
      '신청기간': 'applicationPeriod',
      '접수기간': 'applicationPeriod',
      '지원대상': 'supportTarget',
      '신청자격': 'supportTarget',
      '지원내용': 'supportContent',
      '서비스내용': 'supportContent',
      '신청방법': 'applicationMethod',
      '구비서류': 'requiredDocuments',
      '신  청  서': 'requiredDocuments',
      '문의처': 'contactInfo',
      '접수기관': 'contactInfo',
      '홈페이지 URL': 'homepageUrl',
    };

    $('.detail-wrap .detail-title').each((_, el) => {
      const title = $(el).text().trim();
      const desc = $(el).next('.detail-desc').text().trim();
      if (!desc) return;

      for (const [keyword, field] of Object.entries(fieldMap)) {
        if (title.includes(keyword) && !result[field]) {
          result[field] = desc;
        }
      }
    });

    // warn-box: 중복 혜택 불가 등 주의사항 노란 박스
    const warnParts: string[] = [];
    $('.warn-box').each((_, el) => {
      const title = $(el).find('.warn-title').text().trim();
      const desc = $(el).find('.warn-desc').text().trim();
      if (title || desc) warnParts.push([title, desc].filter(Boolean).join(': '));
    });
    if (warnParts.length > 0) result.warnBox = warnParts.join(' / ');

    return result;
  }

  private extractDatesFromText(text: string): {
    startsAt: string | null;
    endsAt: string | null;
  } {
    // "2025.01.01 ~ 2025.12.31" or "2025-01-01 ~ 2025-12-31"
    const rangeMatch = text.match(
      /(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})\s*[~～\-]\s*(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/,
    );
    if (rangeMatch) {
      const pad = (n: string) => n.padStart(2, '0');
      return {
        startsAt: `${rangeMatch[1]}-${pad(rangeMatch[2])}-${pad(rangeMatch[3])}`,
        endsAt: `${rangeMatch[4]}-${pad(rangeMatch[5])}-${pad(rangeMatch[6])}`,
      };
    }

    // "2025년 1월 1일 ~ 2025년 12월 31일"
    const korMatch = text.match(
      /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*[~～\-]\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/,
    );
    if (korMatch) {
      const pad = (n: string) => n.padStart(2, '0');
      return {
        startsAt: `${korMatch[1]}-${pad(korMatch[2])}-${pad(korMatch[3])}`,
        endsAt: `${korMatch[4]}-${pad(korMatch[5])}-${pad(korMatch[6])}`,
      };
    }

    return { startsAt: null, endsAt: null };
  }

  private async fetchHtml(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; BengoBot/1.0; +https://bengo.app)',
          Accept: 'text/html',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return null;
      return response.text();
    } catch {
      return null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
