/**
 * 공공 API 원문에 섞여 오는 HTML 엔티티를 정규화 단계에서 디코딩한다.
 * (복지로 API는 줄바꿈을 `&#13;`, 원문자를 `&#9312;`, 따옴표를 `&rsquo;` 등으로 보낸다)
 */
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  middot: '·',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  ndash: '–',
  mdash: '—',
  times: '×',
  divide: '÷',
  sim: '∼',
  ge: '≥',
  le: '≤',
  rarr: '→',
  larr: '←',
  harr: '↔',
  uarr: '↑',
  darr: '↓',
  bull: '•',
  deg: '°',
  plusmn: '±',
  laquo: '«',
  raquo: '»',
};

const ENTITY_PATTERN = /&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g;

function decodeEntity(match: string, body: string): string {
  if (body[0] === '#') {
    const isHex = body[1] === 'x' || body[1] === 'X';
    const codePoint = parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
    if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return match;
    try {
      return String.fromCodePoint(codePoint);
    } catch {
      return match;
    }
  }
  return NAMED_ENTITIES[body] ?? match; // 모르는 이름은 원문 유지
}

/** HTML 엔티티를 디코딩하고 CR/CRLF를 LF로 통일한다. */
export function cleanSourceText(input: string): string {
  // `&amp;#13;`처럼 이중 인코딩된 경우까지 한 번 더 풀어준다
  let decoded = input.replace(ENTITY_PATTERN, decodeEntity);
  if (ENTITY_PATTERN.test(decoded)) {
    decoded = decoded.replace(ENTITY_PATTERN, decodeEntity);
  }
  ENTITY_PATTERN.lastIndex = 0;
  return decoded.replace(/\r\n?/g, '\n');
}

/** 객체/배열 안의 모든 문자열에 cleanSourceText를 적용한 사본을 만든다. */
export function cleanSourceTextDeep<T>(value: T): T {
  if (typeof value === 'string') return cleanSourceText(value) as T;
  if (Array.isArray(value)) return value.map((item) => cleanSourceTextDeep(item)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, cleanSourceTextDeep(v)]),
    ) as T;
  }
  return value;
}
