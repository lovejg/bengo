import { BadGatewayException } from '@nestjs/common';
import { RegionCode } from '../../common/enums/region-code.enum';

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

export function pickFirstString(
  item: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function extractItems(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) {
    return [];
  }

  const candidates = [
    payload.data,
    payload.items,
    payload.list,
    payload.youthPolicyList,
    payload.youthCenterList,
    payload.dataList,
    payload.result,
    payload.results,
    payload.row,
    payload.rows,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }

    if (isRecord(candidate)) {
      const nested = extractItems(candidate);
      if (nested.length > 0) {
        return nested;
      }
    }
  }

  // 서울 열린데이터광장처럼 서비스명이 동적으로 키가 되는 응답 구조를 재귀 탐색한다.
  for (const value of Object.values(payload)) {
    if (Array.isArray(value)) {
      const rows = value.filter(isRecord);
      if (rows.length > 0) {
        return rows;
      }
    }

    if (isRecord(value)) {
      const nested = extractItems(value);
      if (nested.length > 0) {
        return nested;
      }
    }
  }

  return [];
}

export function extractTotalCount(payload: unknown): number | null {
  const keys = new Set([
    'totalCount',
    'total_count',
    'totalCnt',
    'list_total_count',
    'listTotalCount',
    'matchCount',
  ]);

  const visited = new Set<unknown>();

  const walk = (input: unknown, depth: number): number | null => {
    if (depth > 6) {
      return null;
    }

    if (!isRecord(input)) {
      return null;
    }

    if (visited.has(input)) {
      return null;
    }
    visited.add(input);

    for (const [key, value] of Object.entries(input)) {
      if (keys.has(key)) {
        const count = toFiniteNumber(value);
        if (count !== null) {
          return count;
        }
      }
    }

    for (const value of Object.values(input)) {
      const nested = walk(value, depth + 1);
      if (nested !== null) {
        return nested;
      }
    }

    return null;
  };

  return walk(payload, 0);
}

export function stringifyBody(item: Record<string, unknown>): string {
  const textFields = [
    'description',
    'summary',
    'content',
    'details',
    'benefit',
    'benefitInfo',
    '지원내용',
    '서비스내용',
    '서비스목적요약',
    'plcyExplnCn',
    'plcySprtCn',
    'plcyAplyMthdCn',
    'etcMttrCn',
  ];

  for (const key of textFields) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return JSON.stringify(item);
}

export async function fetchJson(
  url: string,
  options: RequestInit = {},
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new BadGatewayException(
        `수집 API 호출 실패: ${response.status} ${response.statusText}`,
      );
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        throw new BadGatewayException('JSON 응답이 아니어서 파싱에 실패했습니다.');
      }
    }

    return response.json();
  } catch (error) {
    if (error instanceof BadGatewayException) {
      throw error;
    }

    throw new BadGatewayException('수집 API 요청 중 오류가 발생했습니다.');
  } finally {
    clearTimeout(timeout);
  }
}

export function withQuery(
  baseUrl: string,
  params: Record<string, string | number | boolean | undefined>,
): string {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/**
 * 문자열 배열에서 서울 지역 코드를 추출한다.
 * 첫 번째 값(소관기관명)을 우선 판별하고, 나머지는 보조 근거로만 사용한다.
 * - 소관기관명에 '서울'이 포함되면 → SEOUL (확정)
 * - 타 광역시/도 이름이 포함되면 → 비서울 (확정)
 * - 소관기관명으로 판별 불가 시, 나머지 값에서 '서울특별시'/'서울시'만 확인
 */
export function mapMvpRegionCodesFromStrings(values: string[]): RegionCode[] {
  const [provider, ...rest] = values.map((v) => v.trim());

  // 소관기관명 기준 판별 (가장 신뢰도 높음)
  if (provider) {
    if (
      provider.includes('서울특별시') ||
      provider.includes('서울시') ||
      provider.includes('서울')
    ) {
      return [RegionCode.SEOUL];
    }

    // 타 지역 소관기관이면 서울 아님
    const nonSeoulRegions = [
      '부산', '대구', '인천', '광주', '대전', '울산', '세종',
      '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
    ];
    if (nonSeoulRegions.some((r) => provider.includes(r))) {
      return [];
    }
  }

  // 소관기관명으로 판별 불가 시 (예: '보건복지부' 등 중앙부처),
  // 접수기관/제목 등에서 '서울특별시'/'서울시'만 확인 (느슨한 '서울' 제외)
  for (const value of rest) {
    if (
      value &&
      (value.includes('서울특별시') || value.includes('서울시'))
    ) {
      return [RegionCode.SEOUL];
    }
  }

  return [];
}

/**
 * zipCd 문자열(5자리 법정동 코드)에서 서울 지역 코드를 추출한다.
 * 서울(11xxx) 코드이면 SEOUL을 반환한다.
 */
export function mapMvpRegionCodesFromZipCdStrict(zipCd: string | null): RegionCode[] {
  if (!zipCd) {
    return [];
  }

  const rawTokens = zipCd
    .split(/[,/|]/)
    .map((token) => token.trim())
    .filter(Boolean);

  const fiveDigitCodes = rawTokens
    .map((token) => token.replace(/[^0-9]/g, ''))
    .filter((token) => token.length === 5);

  if (fiveDigitCodes.length === 0) {
    return [];
  }

  const isSeoulScope = fiveDigitCodes.every((code) => code.startsWith('11'));
  if (!isSeoulScope) {
    return [];
  }

  return [RegionCode.SEOUL];
}
