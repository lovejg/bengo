import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PolicyCollector } from '../interfaces/policy-collector.interface';
import { RawPolicyDocument } from '../interfaces/raw-policy.interface';
import {
  extractItems,
  fetchJson,
  mapMvpRegionCodesFromStrings,
  pickFirstString,
  stringifyBody,
  withQuery,
} from './collector.utils';

@Injectable()
export class YouthcenterCenterCollector implements PolicyCollector {
  sourceName = 'youthcenter-center';
  description = '온통청년 청년센터 API 수집기';

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.configService.get<string>('YOUTHCENTER_CENTER_API_URL') &&
        this.configService.get<string>('YOUTHCENTER_CENTER_API_KEY'),
    );
  }

  async collect(): Promise<RawPolicyDocument[]> {
    const apiUrl = this.configService.get<string>('YOUTHCENTER_CENTER_API_URL');
    const apiKey = this.configService.get<string>('YOUTHCENTER_CENTER_API_KEY');

    if (!apiUrl || !apiKey) {
      throw new BadRequestException(
        'YOUTHCENTER_CENTER_API_URL, YOUTHCENTER_CENTER_API_KEY 환경 변수가 필요합니다.',
      );
    }

    const keyParam =
      this.configService.get<string>('YOUTHCENTER_CENTER_API_KEY_PARAM') ?? 'apiKeyNm';
    const pageParam =
      this.configService.get<string>('YOUTHCENTER_CENTER_PAGE_PARAM') ?? 'pageNum';
    const sizeParam =
      this.configService.get<string>('YOUTHCENTER_CENTER_PAGE_SIZE_PARAM') ?? 'pageSize';
    const pageTypeParam =
      this.configService.get<string>('YOUTHCENTER_CENTER_PAGE_TYPE_PARAM') ?? 'pageType';
    const pageTypeValue =
      this.configService.get<string>('YOUTHCENTER_CENTER_PAGE_TYPE') ?? '1';
    const returnTypeParam =
      this.configService.get<string>('YOUTHCENTER_CENTER_RETURN_TYPE_PARAM') ?? 'rtnType';
    const returnTypeValue =
      this.configService.get<string>('YOUTHCENTER_CENTER_RETURN_TYPE') ?? 'json';
    const pageSize = Number(
      this.configService.get<string>('YOUTHCENTER_CENTER_PAGE_SIZE') ?? 100,
    );

    const url = withQuery(apiUrl, {
      [keyParam]: apiKey,
      [pageParam]: 1,
      [sizeParam]: pageSize,
      [pageTypeParam]: pageTypeValue,
      [returnTypeParam]: returnTypeValue,
    });

    const payload = await fetchJson(url);
    const items = extractItems(payload);
    const now = new Date().toISOString();

    return items
      .map((item) => {
        const title =
          pickFirstString(item, ['cntrNm', 'centerNm', 'title', '센터명', 'name']) ??
          '청년센터 정보';
        const sourceUrl = pickFirstString(item, [
          'cntrUrlAddr',
          'homepageUrl',
          'url',
          '상세조회URL',
        ]);
        const centerAddress = pickFirstString(item, ['cntrAddr', 'cntrDaddr']);
        const regionCodes = mapMvpRegionCodesFromStrings([
          centerAddress ?? '',
          pickFirstString(item, ['stdgSggCd']) ?? '',
          pickFirstString(item, ['stdgSggCdNm']) ?? '',
          pickFirstString(item, ['stdgCtpvCd']) ?? '',
          pickFirstString(item, ['stdgCtpvCdNm']) ?? '',
        ]);

        return {
          source: this.sourceName,
          sourceUrl: sourceUrl ?? undefined,
          title,
          body: stringifyBody(item),
          fetchedAt: now,
          metadata: {
            providerName:
              pickFirstString(item, ['stdgCtpvCdNm', 'stdgSggCdNm']) ?? '온통청년',
            applicationUrl: sourceUrl,
            centerAddress,
            regionCodes,
            raw: item,
          },
        } satisfies RawPolicyDocument;
      })
      .slice(0, pageSize);
  }
}
