export const REGION_LABELS: Record<string, string> = {
  seoul: '서울',
  seoul_gangnam: '서울 강남구',
  seoul_gangdong: '서울 강동구',
  seoul_gangbuk: '서울 강북구',
  seoul_gangseo: '서울 강서구',
  seoul_gwanak: '서울 관악구',
  seoul_gwangjin: '서울 광진구',
  seoul_guro: '서울 구로구',
  seoul_geumcheon: '서울 금천구',
  seoul_nowon: '서울 노원구',
  seoul_dobong: '서울 도봉구',
  seoul_dongdaemun: '서울 동대문구',
  seoul_dongjak: '서울 동작구',
  seoul_mapo: '서울 마포구',
  seoul_seodaemun: '서울 서대문구',
  seoul_seocho: '서울 서초구',
  seoul_seongdong: '서울 성동구',
  seoul_seongbuk: '서울 성북구',
  seoul_songpa: '서울 송파구',
  seoul_yangcheon: '서울 양천구',
  seoul_yeongdeungpo: '서울 영등포구',
  seoul_yongsan: '서울 용산구',
  seoul_eunpyeong: '서울 은평구',
  seoul_jongno: '서울 종로구',
  seoul_jung: '서울 중구',
  seoul_jungnang: '서울 중랑구',
};

export const REGION_OPTIONS = Object.entries(REGION_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const REGION_CODE_BY_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(REGION_LABELS).map(([code, label]) => [label, code]),
);

export function formatRegionCode(code: string | null | undefined) {
  if (!code) return '';
  return REGION_LABELS[code] ?? code;
}

export function formatRegionCodes(codes: Array<string | null | undefined> | null | undefined) {
  return codes?.map(formatRegionCode).filter(Boolean).join(', ') ?? '';
}
