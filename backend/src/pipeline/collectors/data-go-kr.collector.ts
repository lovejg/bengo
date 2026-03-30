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

interface GovKrDetail {
  supportTarget: string | null;
  supportContent: string | null;
  applicationMethod: string | null;
  requiredDocuments: string | null;
  receptionInfo: string | null;
  warnBox: string | null;
}

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

      if (filterKeyword) {
        params[`cond[${filterField}::LIKE]`] = `%${filterKeyword}%`;
      }

      const url = withQuery(apiUrl, params);

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

    // gov.kr 상세 페이지 크롤링 (지원대상, 지원내용, 신청방법, warn-box 등)
    const detailCache = new Map<string, GovKrDetail | null>();

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

        const govDetail = await this.fetchGovKrDetail(sourceUrl ?? null, detailCache);

        // API body + 크롤링 데이터를 합쳐서 LLM이 더 풍부한 정보로 분석할 수 있도록
        let body = stringifyBody(item);
        if (govDetail) {
          const extra: string[] = [];
          if (govDetail.supportTarget) extra.push(`[지원대상]\n${govDetail.supportTarget}`);
          if (govDetail.supportContent) extra.push(`[지원내용]\n${govDetail.supportContent}`);
          if (govDetail.applicationMethod) extra.push(`[신청방법]\n${govDetail.applicationMethod}`);
          if (govDetail.requiredDocuments) extra.push(`[구비서류]\n${govDetail.requiredDocuments}`);
          if (govDetail.warnBox) extra.push(`[주의사항]\n${govDetail.warnBox}`);
          if (extra.length > 0) body += '\n\n--- gov.kr 상세 ---\n' + extra.join('\n\n');
        }

        results.push({
          source: this.sourceName,
          sourceUrl: sourceUrl ?? undefined,
          title,
          body,
          fetchedAt: now,
          metadata: {
            providerName:
              pickFirstString(item, ['소관기관명', '기관명', 'provider', 'instNm']) ??
              'data.go.kr',
            regionCodes,
            applicationUrl: applicationUrl ?? sourceUrl,
            applicationMethod: govDetail?.applicationMethod ?? applicationMethod,
            supportContent: govDetail?.supportContent ?? supportContent,
            selectionCriteria: govDetail?.supportTarget ?? selectionCriteria,
            supportType,
            applicationDeadline,
            targetAgeInfo,
            minAge: minAgeRaw ? Number(minAgeRaw) : null,
            maxAge: maxAgeRaw ? Number(maxAgeRaw) : null,
            applicationPeriod,
            warnBox: govDetail?.warnBox ?? null,
            requiredDocuments: govDetail?.requiredDocuments ?? null,
            receptionInfo: govDetail?.receptionInfo ?? null,
            raw: item,
          },
        } satisfies RawPolicyDocument);
    }

    return results;
  }

  /**
   * gov.kr 상세 페이지를 크롤링하여 API에 없는 상세 정보를 추출한다.
   * - 지원대상 (panel2), 지원내용 (panel3), 신청방법 (panel4), 접수/문의 (panel5)
   * - warn-box (중복혜택 제한 등)
   */
  private async fetchGovKrDetail(
    url: string | null,
    cache: Map<string, GovKrDetail | null>,
  ): Promise<GovKrDetail | null> {
    if (!url || !url.includes('gov.kr')) return null;
    if (cache.has(url)) return cache.get(url)!;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BengoBot/1.0)',
          'Accept': 'text/html',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        },
      });
      clearTimeout(timeout);
      if (!res.ok) {
        cache.set(url, null);
        return null;
      }

      const html = await res.text();
      const detail = this.parseGovKrHtml(html);
      cache.set(url, detail);
      return detail;
    } catch {
      this.logger.warn(`gov.kr 크롤링 실패: ${url}`);
      cache.set(url, null);
      return null;
    }
  }

  private parseGovKrHtml(html: string): GovKrDetail {
    const stripTags = (s: string) => s.replace(/<[^>]+>/g, '').trim();

    // 패널별 콘텐츠 추출 헬퍼
    const extractPanel = (panelId: string): string => {
      const panelRegex = new RegExp(
        `id="${panelId}"[^>]*>([\\s\\S]*?)(?=<div[^>]*id="panel|$)`,
      );
      const match = html.match(panelRegex);
      return match ? match[1] : '';
    };

    // pre.detail-desc 내용 추출
    const extractPreDesc = (panelHtml: string): string | null => {
      const matches: string[] = [];
      const preRegex = /<pre[^>]*class="detail-desc"[^>]*>([\s\S]*?)<\/pre>/g;
      let m: RegExpExecArray | null;
      while ((m = preRegex.exec(panelHtml)) !== null) {
        const text = stripTags(m[1]).trim();
        if (text && text !== '-') matches.push(text);
      }
      return matches.length > 0 ? matches.join('\n\n') : null;
    };

    // warn-box
    const warnings: string[] = [];
    const warnRegex = /<strong[^>]*class="warn-title"[^>]*>([\s\S]*?)<\/strong>\s*<p[^>]*class="warn-desc"[^>]*>([\s\S]*?)<\/p>/g;
    let wm: RegExpExecArray | null;
    while ((wm = warnRegex.exec(html)) !== null) {
      const title = stripTags(wm[1]);
      const desc = stripTags(wm[2]);
      if (title || desc) warnings.push(`${title}: ${desc}`);
    }

    const panel2 = extractPanel('panel2');
    const panel3 = extractPanel('panel3');
    const panel4 = extractPanel('panel4');
    const panel5 = extractPanel('panel5');

    return {
      supportTarget: extractPreDesc(panel2),
      supportContent: extractPreDesc(panel3),
      applicationMethod: extractPreDesc(panel4),
      requiredDocuments: this.extractRequiredDocuments(panel4),
      receptionInfo: extractPreDesc(panel5),
      warnBox: warnings.length > 0 ? warnings.join(' / ') : null,
    };
  }

  private extractRequiredDocuments(panel4Html: string): string | null {
    // 구비서류 섹션만 추출
    const docMatch = panel4Html.match(
      /class="detail-title[^"]*document[^"]*"[\s\S]*?<\/strong>([\s\S]*?)(?=<strong|$)/,
    );
    if (!docMatch) return null;
    const text = docMatch[1].replace(/<[^>]+>/g, '').trim();
    return text && text !== '-' ? text : null;
  }
}
