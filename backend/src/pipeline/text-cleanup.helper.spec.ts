import { cleanSourceText, cleanSourceTextDeep } from './text-cleanup.helper';

describe('cleanSourceText', () => {
  it('&#13;(CR)을 줄바꿈으로 풀고 CRLF는 LF 하나로 합친다', () => {
    // 복지로 원문: "지원합니다.&#13;\n\n지원대상" = CRLF + LF
    expect(cleanSourceText('지원합니다.&#13;\n\n지원대상')).toBe('지원합니다.\n\n지원대상');
    expect(cleanSourceText('a\r\nb\rc')).toBe('a\nb\nc');
  });

  it('숫자 엔티티(10진/16진)를 문자로 디코딩한다', () => {
    expect(cleanSourceText('&#9312; 신청 &#x2461; 심사')).toBe('① 신청 ② 심사');
  });

  it('이름 엔티티를 디코딩하고 모르는 이름은 그대로 둔다', () => {
    expect(cleanSourceText('&lsquo;청년&rsquo; 3&times;2 &unknown;')).toBe('‘청년’ 3×2 &unknown;');
  });

  it('이중 인코딩(&amp;#13;)도 풀어준다', () => {
    expect(cleanSourceText('끝&amp;#13;')).toBe('끝\n');
  });

  it('연속 호출해도 정규식 상태가 남지 않는다', () => {
    expect(cleanSourceText('&#9312;')).toBe('①');
    expect(cleanSourceText('&#9312;')).toBe('①');
  });

  it('객체 안의 문자열을 재귀적으로 정리한다', () => {
    expect(cleanSourceTextDeep({ a: '&#9312;', b: ['&times;'], c: 1, d: null })).toEqual({
      a: '①',
      b: ['×'],
      c: 1,
      d: null,
    });
  });
});
