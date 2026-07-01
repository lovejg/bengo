import { RegionCode, regionMatches } from './region-code.enum';

describe('regionMatches', () => {
  it('동일한 지역 코드는 매칭된다', () => {
    expect(regionMatches(RegionCode.SEOUL_GANGNAM, RegionCode.SEOUL_GANGNAM)).toBe(true);
  });

  it('SEOUL(서울 전체) 정책은 모든 서울 자치구 유저에게 매칭된다', () => {
    expect(regionMatches(RegionCode.SEOUL, RegionCode.SEOUL_MAPO)).toBe(true);
    expect(regionMatches(RegionCode.SEOUL, RegionCode.SEOUL_GANGNAM)).toBe(true);
    expect(regionMatches(RegionCode.SEOUL, RegionCode.SEOUL)).toBe(true);
  });

  it('자치구 한정 정책은 다른 자치구 유저에게 매칭되지 않는다', () => {
    expect(regionMatches(RegionCode.SEOUL_GANGNAM, RegionCode.SEOUL_MAPO)).toBe(false);
  });

  it('자치구 한정 정책은 서울 전체 유저에게도 매칭되지 않는다 (역방향 불가)', () => {
    expect(regionMatches(RegionCode.SEOUL_GANGNAM, RegionCode.SEOUL)).toBe(false);
  });
});
