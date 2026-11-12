import { hasMeaningfulScale } from './youth-seoul.collector';

describe('hasMeaningfulScale', () => {
  it.each(['0', ' 0 ', '0명', '00', '-', '없음', '', undefined])('값 없음으로 본다: %p', (value) => {
    expect(hasMeaningfulScale(value)).toBe(false);
  });

  it.each(['50,000명', '100명 내외', '30팀', '10'])('의미 있는 값으로 본다: %p', (value) => {
    expect(hasMeaningfulScale(value)).toBe(true);
  });
});
