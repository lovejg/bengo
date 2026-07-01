export enum RegionCode {
  SEOUL = 'seoul',
  // 서울 자치구
  SEOUL_GANGNAM = 'seoul_gangnam',
  SEOUL_GANGDONG = 'seoul_gangdong',
  SEOUL_GANGBUK = 'seoul_gangbuk',
  SEOUL_GANGSEO = 'seoul_gangseo',
  SEOUL_GWANAK = 'seoul_gwanak',
  SEOUL_GWANGJIN = 'seoul_gwangjin',
  SEOUL_GURO = 'seoul_guro',
  SEOUL_GEUMCHEON = 'seoul_geumcheon',
  SEOUL_NOWON = 'seoul_nowon',
  SEOUL_DOBONG = 'seoul_dobong',
  SEOUL_DONGDAEMUN = 'seoul_dongdaemun',
  SEOUL_DONGJAK = 'seoul_dongjak',
  SEOUL_MAPO = 'seoul_mapo',
  SEOUL_SEODAEMUN = 'seoul_seodaemun',
  SEOUL_SEOCHO = 'seoul_seocho',
  SEOUL_SEONGDONG = 'seoul_seongdong',
  SEOUL_SEONGBUK = 'seoul_seongbuk',
  SEOUL_SONGPA = 'seoul_songpa',
  SEOUL_YANGCHEON = 'seoul_yangcheon',
  SEOUL_YEONGDEUNGPO = 'seoul_yeongdeungpo',
  SEOUL_YONGSAN = 'seoul_yongsan',
  SEOUL_EUNPYEONG = 'seoul_eunpyeong',
  SEOUL_JONGNO = 'seoul_jongno',
  SEOUL_JUNG = 'seoul_jung',
  SEOUL_JUNGNANG = 'seoul_jungnang',
}

/** 구 이름 → RegionCode 매핑 */
export const SEOUL_GU_MAP: Record<string, RegionCode> = {
  강남구: RegionCode.SEOUL_GANGNAM,
  강동구: RegionCode.SEOUL_GANGDONG,
  강북구: RegionCode.SEOUL_GANGBUK,
  강서구: RegionCode.SEOUL_GANGSEO,
  관악구: RegionCode.SEOUL_GWANAK,
  광진구: RegionCode.SEOUL_GWANGJIN,
  구로구: RegionCode.SEOUL_GURO,
  금천구: RegionCode.SEOUL_GEUMCHEON,
  노원구: RegionCode.SEOUL_NOWON,
  도봉구: RegionCode.SEOUL_DOBONG,
  동대문구: RegionCode.SEOUL_DONGDAEMUN,
  동작구: RegionCode.SEOUL_DONGJAK,
  마포구: RegionCode.SEOUL_MAPO,
  서대문구: RegionCode.SEOUL_SEODAEMUN,
  서초구: RegionCode.SEOUL_SEOCHO,
  성동구: RegionCode.SEOUL_SEONGDONG,
  성북구: RegionCode.SEOUL_SEONGBUK,
  송파구: RegionCode.SEOUL_SONGPA,
  양천구: RegionCode.SEOUL_YANGCHEON,
  영등포구: RegionCode.SEOUL_YEONGDEUNGPO,
  용산구: RegionCode.SEOUL_YONGSAN,
  은평구: RegionCode.SEOUL_EUNPYEONG,
  종로구: RegionCode.SEOUL_JONGNO,
  중구: RegionCode.SEOUL_JUNG,
  중랑구: RegionCode.SEOUL_JUNGNANG,
};

/**
 * 정책 지역과 유저 지역 매칭
 * - SEOUL 정책 → 서울 전체 유저 매칭 (SEOUL, SEOUL_GANGNAM 등 모두)
 * - SEOUL_GANGNAM 정책 → SEOUL_GANGNAM 유저만 매칭
 */
export function regionMatches(policyRegion: RegionCode, userRegion: RegionCode): boolean {
  if (policyRegion === userRegion) return true;
  // 서울 전체 정책은 모든 서울 유저에게 매칭
  if (policyRegion === RegionCode.SEOUL && userRegion.startsWith('seoul')) return true;
  return false;
}
