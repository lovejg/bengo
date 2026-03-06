import { BadRequestException, Injectable } from '@nestjs/common';
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
export class SeoulOpenApiCollector implements PolicyCollector {
  sourceName = 'seoul-open-api';
  description = '서울 열린데이터광장 Open API 수집기';

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.configService.get<string>('SEOUL_OPEN_API_KEY'));
  }

  async collect(): Promise<RawPolicyDocument[]> {
    const apiUrl = this.configService.get<string>('SEOUL_OPEN_API_URL');
    const apiKey = this.configService.get<string>('SEOUL_OPEN_API_KEY');

    if (!apiKey) {
      throw new BadRequestException('SEOUL_OPEN_API_KEY 환경 변수가 필요합니다.');
    }

    const keyParam =
      this.configService.get<string>('SEOUL_OPEN_API_KEY_PARAM') ?? 'KEY';
    const pageSize = Number(this.configService.get<string>('SEOUL_OPEN_API_PAGE_SIZE') ?? 100);
    const maxPages = Number(this.configService.get<string>('SEOUL_OPEN_API_MAX_PAGES') ?? 30);
    const apiHost =
      this.configService.get<string>('SEOUL_OPEN_API_HOST') ??
      'http://openapi.seoul.go.kr:8088';
    const format =
      this.configService.get<string>('SEOUL_OPEN_API_FORMAT') ?? 'json';
    const serviceName =
      this.configService.get<string>('SEOUL_OPEN_API_SERVICE_NAME');
    const serviceNames = this.parseServiceNames(
      this.configService.get<string>('SEOUL_OPEN_API_SERVICE_NAMES'),
      serviceName,
    );
    const startIndex = Number(
      this.configService.get<string>('SEOUL_OPEN_API_START_INDEX') ?? 1,
    );
    const endIndex = Number(
      this.configService.get<string>('SEOUL_OPEN_API_END_INDEX') ?? pageSize,
    );

    if (serviceNames.length === 0 && !apiUrl) {
      throw new BadRequestException(
        'SEOUL_OPEN_API_URL 또는 SEOUL_OPEN_API_SERVICE_NAME(또는 SERVICE_NAMES) 환경 변수가 필요합니다.',
      );
    }

    const items: Record<string, unknown>[] = [];
    if (serviceNames.length > 0) {
      for (const currentServiceName of serviceNames) {
        let expectedTotal = Number.POSITIVE_INFINITY;
        for (let page = 0; page < maxPages; page += 1) {
          const currentStart = startIndex + page * pageSize;
          const currentEnd = currentStart + pageSize - 1;

          const url = `${apiHost}/${encodeURIComponent(apiKey)}/${encodeURIComponent(format)}/${encodeURIComponent(currentServiceName)}/${currentStart}/${currentEnd}`;
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

          if (pageItems.length < pageSize || currentEnd >= expectedTotal) {
            break;
          }
        }
      }
    } else if (apiUrl) {
      const url = this.resolveApiUrl({
        apiUrl,
        apiKey,
        keyParam,
        serviceName: '',
        startIndex,
        endIndex,
      });
      const payload = await fetchJson(url);
      const pageItems = extractItems(payload);
      items.push(...pageItems);
    }

    const now = new Date().toISOString();

    return items
      .map((item) => {
        const title =
          pickFirstString(item, ['TITLE', 'title', '서비스명', 'plcyNm']) ?? '서울 공공데이터';
        const sourceUrl = pickFirstString(item, ['URL', 'url', 'HOMEPAGE', '상세조회URL']);
        const regionCodes = mapMvpRegionCodesFromStrings([
          pickFirstString(item, ['ORG_NM']) ?? '',
          pickFirstString(item, ['UP_ORG_NM']) ?? '',
          pickFirstString(item, ['BIZ_NM']) ?? '',
          title,
          sourceUrl ?? '',
        ]);

        const applicationUrl = pickFirstString(item, [
          'APLY_URL', 'APPLICATION_URL', 'HOMEPAGE',
        ]);
        const applicationMethod = pickFirstString(item, [
          'APLY_MTH', 'APPLICATION_METHOD', 'REG_METHOD',
        ]);
        const supportContent = pickFirstString(item, [
          'SPRT_CN', 'SUPPORT_CONTENT', 'BIZ_CN', 'CONTENT',
        ]);
        const targetInfo = pickFirstString(item, [
          'TRGT_CN', 'TARGET_CN', 'ELIGIBLE_CN',
        ]);

        return {
          source: this.sourceName,
          sourceUrl: sourceUrl ?? undefined,
          title,
          body: stringifyBody(item),
          fetchedAt: now,
          metadata: {
            providerName: pickFirstString(item, ['ORG_NM', 'UP_ORG_NM']) ?? '서울 열린데이터광장',
            regionCodes,
            applicationUrl: applicationUrl ?? sourceUrl,
            applicationMethod,
            supportContent,
            targetInfo,
            raw: item,
          },
        } satisfies RawPolicyDocument;
      });
  }

  private parseServiceNames(
    serviceNamesRaw: string | undefined,
    fallbackServiceName: string | undefined,
  ): string[] {
    const serviceNames = (serviceNamesRaw ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (serviceNames.length > 0) {
      return Array.from(new Set(serviceNames));
    }

    if (fallbackServiceName?.trim()) {
      return [fallbackServiceName.trim()];
    }

    return [];
  }

  private resolveApiUrl(input: {
    apiUrl: string;
    apiKey: string;
    keyParam: string;
    serviceName: string;
    startIndex: number;
    endIndex: number;
  }): string {
    const { apiUrl, apiKey, keyParam, serviceName, startIndex, endIndex } = input;

    if (apiUrl.includes('{API_KEY}')) {
      return apiUrl
        .replace('{API_KEY}', encodeURIComponent(apiKey))
        .replace('{SERVICE_NAME}', encodeURIComponent(serviceName))
        .replace('{START_INDEX}', String(startIndex))
        .replace('{END_INDEX}', String(endIndex));
    }

    return withQuery(apiUrl, {
      [keyParam]: apiKey,
    });
  }
}
