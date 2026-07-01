import { BadGatewayException, Logger } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { RegionCode } from '../../common/enums/region-code.enum';
import { RawPolicyDocument } from '../interfaces/raw-policy.interface';
import {
  mapMvpRegionCodesFromStrings,
  pickFirstString,
  stringifyBody,
  withQuery,
} from './collector.utils';

const logger = new Logger('BokjiroUtils');

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  trimValues: true,
});

/**
 * 한국사회보장정보원 복지로 API 공통 호출 + XML 파싱.
 * 응답 루트 노드 이름이 정확히 알려지지 않아 재귀로 servList 배열을 찾는다.
 */
export interface BokjiroFetchOptions {
  apiUrl: string;
  apiKey: string;
  pageSize: number;
  maxPages: number;
  /** 추가 쿼리 파라미터 (예: 시도코드, 검색 키워드 등) */
  extraParams?: Record<string, string | number | undefined>;
}

export async function fetchBokjiroItems(
  options: BokjiroFetchOptions,
): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  const seenIds = new Set<string>();

  for (let page = 1; page <= options.maxPages; page += 1) {
    const url = withQuery(options.apiUrl, {
      serviceKey: options.apiKey,
      pageNo: page,
      numOfRows: options.pageSize,
      ...options.extraParams,
    });

    // 호출 URL 로그 (key는 일부만 노출)
    const safeUrl = url.replace(
      /(serviceKey=)([^&]+)/,
      (_, p, k) => `${p}${String(k).slice(0, 8)}***`,
    );
    logger.log(`복지로 API 호출: ${safeUrl}`);

    const xml = await fetchText(url);
    const parsed = xmlParser.parse(xml);
    const pageItems = extractServList(parsed);

    if (pageItems.length === 0) {
      // 첫 페이지에서 0건이면 응답 구조를 확인할 수 있게 로그
      if (page === 1) {
        const rootKeys = Object.keys(parsed as Record<string, unknown>);
        const snippet = JSON.stringify(parsed).slice(0, 800);
        logger.warn(`복지로 응답 0건. root keys=${rootKeys.join(',')} / preview=${snippet}`);
      }
      break;
    }

    for (const item of pageItems) {
      const id = pickFirstString(item, ['servId', 'wlfareInfoId', 'svcId']) ?? JSON.stringify(item);
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      items.push(item);
    }

    if (pageItems.length < options.pageSize) break;
  }

  return items;
}

/**
 * 복지로 상세조회 API 호출 — servId로 해당 서비스의 상세 정보 가져오기.
 * 실패 시 null 반환 (호출자가 fallback 처리).
 */
export async function fetchBokjiroDetail(
  detailUrl: string,
  apiKey: string,
  servId: string,
  extraParams: Record<string, string | number | undefined> = {},
): Promise<Record<string, unknown> | null> {
  try {
    const url = withQuery(detailUrl, {
      serviceKey: apiKey,
      servId,
      ...extraParams,
    });
    const xml = await fetchText(url);
    const parsed = xmlParser.parse(xml);
    return extractDetailObject(parsed);
  } catch (error) {
    logger.warn(
      `복지로 detail 호출 실패 (servId=${servId}): ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

/**
 * detail 응답을 평탄화해서 모든 텍스트 필드를 단일 객체로 모음.
 * V001 응답은 신청기관/홈페이지/본문/서류 등 여러 섹션이 분리되어 있어서
 * 첫 servList만 잡으면 본문을 놓침. 모든 섹션을 재귀로 훑어 텍스트 키-값을 누적.
 * 같은 키가 여러 섹션에 있으면 줄바꿈으로 연결.
 */
function extractDetailObject(payload: unknown): Record<string, unknown> | null {
  const flat: Record<string, unknown> = {};

  const traverse = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(traverse);
      return;
    }
    if (typeof node !== 'object' || node === null) return;

    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k.startsWith('@_')) continue; // XML 속성은 스킵
      if (typeof v === 'string' || typeof v === 'number') {
        const str = String(v).trim();
        if (!str) continue;
        const existing = flat[k];
        if (typeof existing === 'string' && existing && !existing.includes(str)) {
          flat[k] = `${existing}\n${str}`;
        } else if (existing === undefined) {
          flat[k] = str;
        }
      } else if (typeof v === 'object' && v !== null) {
        traverse(v);
      }
    }
  };

  traverse(payload);
  return Object.keys(flat).length > 0 ? flat : null;
}

/** 동시 호출 수 제한 — API 부담 줄이기 위해 작게 유지 */
const ENRICH_CONCURRENCY = 5;

/**
 * list로 받은 items 각각에 대해 detail을 호출하여 병합.
 * 병렬 처리 (chunk 단위)로 시간 절약 + 너무 빠른 호출은 피함.
 * limit 옵션으로 한 번에 enrich할 최대 개수 제한 (API quota 보호용).
 */
export async function enrichWithDetail(
  items: Record<string, unknown>[],
  detailUrl: string,
  apiKey: string,
  options: {
    extraParams?: Record<string, string | number | undefined>;
    limit?: number;
  } = {},
): Promise<Record<string, unknown>[]> {
  const limit = options.limit ?? items.length;
  const target = items.slice(0, limit);
  const remainder = items.slice(limit);

  const enriched: Record<string, unknown>[] = [];
  for (let i = 0; i < target.length; i += ENRICH_CONCURRENCY) {
    const chunk = target.slice(i, i + ENRICH_CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map(async (item) => {
        const servId = pickFirstString(item, ['servId', 'wlfareInfoId', '서비스ID']);
        if (!servId) return item;
        const detail = await fetchBokjiroDetail(detailUrl, apiKey, servId, options.extraParams);
        return detail ? { ...item, ...detail } : item;
      }),
    );
    enriched.push(...chunkResults);
  }
  // limit 초과분은 enrich 없이 list 데이터 그대로 반환
  return [...enriched, ...remainder];
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const body = await response.text();

    if (!response.ok) {
      // 본문 일부를 로그에 포함해 원인 파악에 활용
      const snippet = body.slice(0, 500).replace(/\s+/g, ' ');
      logger.warn(`복지로 API 응답 본문 (status=${response.status}): ${snippet}`);
      throw new BadGatewayException(
        `복지로 API 호출 실패: ${response.status} ${response.statusText} — ${snippet.slice(0, 200)}`,
      );
    }
    return body;
  } catch (error) {
    if (error instanceof BadGatewayException) throw error;
    throw new BadGatewayException('복지로 API 요청 중 오류가 발생했습니다.');
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * XML 파싱 결과에서 servList 배열을 재귀 탐색.
 * wantedList는 래퍼(totalCount/pageNo/servList 등을 묶는 부모)이므로 컨테이너 키에서 제외.
 */
function extractServList(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null);
  }
  if (typeof payload !== 'object' || payload === null) return [];

  // 1. servList 키를 직접 찾아서 그 값을 아이템 배열로 반환
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (key === 'servList') {
      if (Array.isArray(value)) {
        return value.filter(
          (v): v is Record<string, unknown> => typeof v === 'object' && v !== null,
        );
      }
      if (typeof value === 'object' && value !== null) {
        // 단일 항목은 fast-xml-parser가 객체로 줌
        return [value as Record<string, unknown>];
      }
    }
  }

  // 2. servList가 직접 보이지 않으면 자식 객체로 재귀 (wantedList 래퍼 안으로 들어감)
  for (const value of Object.values(payload as Record<string, unknown>)) {
    if (typeof value === 'object' && value !== null) {
      const nested = extractServList(value);
      if (nested.length > 0) return nested;
    }
  }

  return [];
}

/**
 * 복지로 API 응답 한 건을 RawPolicyDocument로 변환.
 * 중앙부처 정책처럼 지역 정보가 없는 경우(전국 적용)를 위해 defaultRegionCodes 파라미터 제공.
 */
export function buildRawDocFromBokjiroItem(
  source: string,
  item: Record<string, unknown>,
  defaultRegionCodes: RegionCode[] = [],
): RawPolicyDocument {
  const title = pickFirstString(item, ['servNm', 'wlfareInfoNm', '서비스명']) ?? '제목 없음';
  const sourceUrl = pickFirstString(item, ['servDtlLink', 'wlfareInfoUrl', 'url']);
  const providerName =
    pickFirstString(item, ['jurMnofNm', 'jurOrgNm', 'ctpvNm', 'sggNm', '소관기관명']) ?? '복지로';

  const detected = mapMvpRegionCodesFromStrings([providerName, title, sourceUrl ?? '']);
  const regionCodes = detected.length > 0 ? detected : defaultRegionCodes;

  // 시행 시작/종료일 → 정규화 단계에서 인식할 수 있는 applicationPeriod 형식으로 변환
  // 99991231은 한국 공공API 관용으로 "무기한" → "상시"로 표시
  const startYmd = pickFirstString(item, ['enfcBgngYmd']);
  const endYmd = pickFirstString(item, ['enfcEndYmd']);
  let applicationPeriod: string | null = null;
  if (startYmd && endYmd) {
    applicationPeriod = endYmd.startsWith('9999') ? '상시' : `${startYmd} ~ ${endYmd}`;
  } else if (startYmd) {
    applicationPeriod = '상시';
  }

  // detail 응답에 포함된 본문성 필드들을 모두 합쳐 LLM이 자격 조건을 추출할 만큼 풍부하게 구성
  const bodyParts = [
    pickFirstString(item, ['servDgst', 'wlfareInfoDgst', '서비스요약']), // 서비스 요약
    pickFirstString(item, ['servCn', 'wlfareInfoCn', '서비스내용']), // 서비스 내용
    pickFirstString(item, ['tgtrDtlCn', 'sprtTrgtCn', 'aplyTrgtCn']), // 지원 대상
    pickFirstString(item, ['slctCritCn', '선정기준']), // 선정 기준
    pickFirstString(item, ['aplyMtdCn', 'aplyMthdCn']), // 신청 방법
    pickFirstString(item, ['rceptPdCn', 'aplyPdCn']), // 접수 기간
    pickFirstString(item, ['sbmsnDcmntCn']), // 제출 서류
    pickFirstString(item, ['alwServCn']), // 상시 서비스 내용 (지급내용 등)
    pickFirstString(item, ['wlfareInfoOutlCn']), // 복지정보 개요
    pickFirstString(item, ['rprsCtadr']), // 문의처
  ].filter((v): v is string => Boolean(v && v.trim()));
  const combinedBody = bodyParts.length > 0 ? bodyParts.join('\n\n') : stringifyBody(item);

  return {
    source,
    sourceUrl: sourceUrl ?? undefined,
    title,
    body: combinedBody,
    fetchedAt: new Date().toISOString(),
    metadata: {
      providerName,
      regionCodes,
      applicationUrl: pickFirstString(item, ['onapPsbltUrl', 'aplyUrl']) ?? sourceUrl ?? null,
      applicationMethod: pickFirstString(item, ['aplyMthdNm', 'aplyMthdCn']),
      supportContent: pickFirstString(item, ['servDgst', 'wlfareInfoDgst', 'sprtDtl']),
      selectionCriteria: pickFirstString(item, ['slctCritCn', 'slctCrit']),
      supportType: pickFirstString(item, ['sprtCycNm', 'sprtTrgtNm']),
      applicationDeadline: pickFirstString(item, ['rceptPdCn', 'aplyPdCn']),
      targetAgeInfo: pickFirstString(item, ['lifeArray', 'trgterIndvdlNmArray', 'sprtTrgt']),
      minAge: null,
      maxAge: null,
      applicationPeriod: applicationPeriod ?? pickFirstString(item, ['aplyPdCn', 'rceptPdCn']),
      warnBox: null,
      requiredDocuments: pickFirstString(item, ['sbmsnDcmntCn', 'submitDoc']),
      receptionInfo: pickFirstString(item, ['rceptInsttNm', 'rceptInstt']),
      raw: item,
    },
  } satisfies RawPolicyDocument;
}
