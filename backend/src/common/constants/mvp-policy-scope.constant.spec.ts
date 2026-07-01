import { InterestCategory } from '../enums/interest-category.enum';
import { RegionCode } from '../enums/region-code.enum';
import { evaluateMvpScope, getPolicySource } from './mvp-policy-scope.constant';

describe('evaluateMvpScope', () => {
  it('허용 카테고리 + 서울 지역이면 범위 내', () => {
    const result = evaluateMvpScope('youth-seoul', [InterestCategory.YOUTH], [RegionCode.SEOUL]);
    expect(result.inScope).toBe(true);
  });

  it('서울 자치구(seoul_*) 지역도 범위 내로 인정한다', () => {
    const result = evaluateMvpScope(
      'youth-seoul',
      [InterestCategory.YOUTH],
      [RegionCode.SEOUL_GWANAK],
    );
    expect(result.inScope).toBe(true);
  });

  it('허용 카테고리가 없으면 범위 밖', () => {
    const result = evaluateMvpScope('youth-seoul', [], [RegionCode.SEOUL]);
    expect(result.inScope).toBe(false);
    expect(result.reason).toContain('카테고리');
  });

  it('서울 지역이 아니면 범위 밖', () => {
    const result = evaluateMvpScope(
      'youth-seoul',
      [InterestCategory.YOUTH],
      ['busan' as RegionCode],
    );
    expect(result.inScope).toBe(false);
    expect(result.reason).toContain('지역');
  });
});

describe('getPolicySource', () => {
  it('metadata.pipeline.source를 우선 사용한다', () => {
    expect(getPolicySource({ pipeline: { source: 'youth-seoul' } })).toBe('youth-seoul');
  });

  it('pipeline.source가 없으면 originalSource로 폴백한다', () => {
    expect(getPolicySource({ originalSource: 'data-go-kr' })).toBe('data-go-kr');
  });

  it('아무 소스 정보가 없으면 null', () => {
    expect(getPolicySource(undefined)).toBeNull();
    expect(getPolicySource({})).toBeNull();
  });
});
