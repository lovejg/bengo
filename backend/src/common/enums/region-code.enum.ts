export enum RegionCode {
  SEOUL = 'seoul',
  SEOUL_GANGNAM = 'seoul_gangnam',
  SEOUL_MAPO = 'seoul_mapo',
  SEOUL_SONGPA = 'seoul_songpa',
}

export const SEOUL_REGION_CODES = new Set<RegionCode>([
  RegionCode.SEOUL,
  RegionCode.SEOUL_GANGNAM,
  RegionCode.SEOUL_MAPO,
  RegionCode.SEOUL_SONGPA,
]);

/** 정책 지역 vs 사용자 지역 매칭: SEOUL 정책은 모든 서울 거주자에게 해당됨 */
export function regionMatches(policyRegion: RegionCode, userRegion: RegionCode): boolean {
  if (policyRegion === userRegion) return true;
  if (policyRegion === RegionCode.SEOUL && SEOUL_REGION_CODES.has(userRegion)) return true;
  return false;
}
