import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { QuestionType } from '../common/enums/question-type.enum';
import { RuleCondition } from '../common/interfaces/rule-expression.interface';
import { Policy } from '../database/entities';
import { NormalizedPolicyDocument } from './interfaces/normalized-policy.interface';

/** LLM이 추출한 개별 조건 */
export interface LlmExtractedCondition {
  key: string;
  label: string;
  type: QuestionType;
  options: string[] | null;
  fact: string;
  op: RuleCondition['op'];
  value: RuleCondition['value'];
  message: string;
  /** true = 객관적 조건 (취업상태 선택 등), false = 주관적/확인필요 (서류심사, 소득확인 등) */
  verifiable: boolean;
}

/** LLM 추출 결과 전체 */
export interface LlmExtractionResult {
  conditions: LlmExtractedCondition[];
  conditionalHints: string[];
  summary: string | null;
  detectedAge: { minAge: number | null; maxAge: number | null } | null;
}

const SYSTEM_PROMPT = `당신은 한국 정부/지자체 정책의 자격 조건을 분석하여 구조화된 JSON으로 추출하는 전문가입니다.

## 규칙

1. 정책 텍스트에서 **신청 자격/지원 자격 조건만** 추출하세요. "지원대상", "신청자격", "선정기준" 섹션에 명시된 조건만 포함합니다.
2. 나이(age), 거주지역(region), 성별(gender)은 이미 별도 시스템에서 처리하므로 **절대 추출하지 마세요**.
3. 각 조건을 아래 JSON 형식으로 구조화하세요.
4. **서비스 이용 세부사항은 자격 조건이 아닙니다.** 다음은 절대 추출하지 마세요:
   - 시험 종류, 시험 응시 시기 (어떤 시험을 봤는지는 자격이 아님)
   - 이삿짐 양, 가구 크기 등 서비스 제약사항
   - 창업 업종/아이템 제한 (불건전업종 제외 등)
   - 센터 유형 선택
   - 신청 금액/보증금 범위
5. **조건이 텍스트에 명시적으로 적혀있지 않으면 추론하지 마세요.** "청년"이라고만 되어 있으면 취업 상태나 학력을 임의로 추가하지 마세요.
6. **본문에 명시된 자격 조건은 빠짐없이 추출하세요.** 특히 다음 조건들을 놓치지 마세요:
   - 창업 관련: 예비창업자, 창업자, 창업 N년 이내 등
   - 취업 관련: 미취업자, 구직자, 재직자 등
   - 학력/재학: 대학생, 졸업예정자, 휴학생 등
   - 가구 관련: 1인가구, 무주택자, 독립거주 등
   - 소득 관련: 중위소득 N% 이하 등
   - 기타: 탈북민, 다문화가정, 장애인, 자립준비청년 등

## 조건(condition) 구조

\`\`\`json
{
  "key": "영문 camelCase 키 (예: employmentStatus, educationLevel, incomeLevel)",
  "label": "한국어 라벨 (예: 취업 상태, 학력, 소득 수준)",
  "type": "select | number | boolean | string",
  "options": ["선택지1", "선택지2"] (type이 select일 때만, 아니면 null),
  "fact": "answers.{key} (예: answers.employmentStatus)",
  "op": "= | != | > | >= | < | <= | in",
  "value": "조건 값 (op이 in이면 배열)",
  "message": "조건 미충족 시 사용자에게 보여줄 메시지 (예외 허용 조건이 있으면 '단, ~도 가능합니다' 형태로 함께 포함)",
  "verifiable": true 또는 false
}
\`\`\`

## verifiable 기준
- \`true\`: 사용자가 스스로 명확히 알고 답할 수 있는 객관적 조건. **대부분의 조건은 true입니다.**
  - 예: 취업 상태, 학력, 재학 여부, 가구 형태(1인가구 등), 거주지역, 창업 여부, 혼인 여부, 장애 여부, 국적, 병역 여부, 자녀 수
- \`false\`: 사용자가 답변해도 **기관의 별도 심사/확인 절차**가 반드시 필요한 조건만 해당합니다.
  - 예: 소득/자산 기준(중위소득 150% 이하 등), 신용등급, 심사위원 평가, 서류 심사 통과, 선착순 마감
- **판단 기준**: "사용자가 본인 상황을 예/아니오 또는 선택지로 답할 수 있는가?" → true, "기관이 별도 확인해야 하는가?" → false

## op 설명
- \`=\`: 정확히 일치
- \`!=\`: 불일치
- \`in\`: value 배열 중 하나에 포함
- \`>\`, \`>=\`, \`<\`, \`<=\`: 숫자 비교

## conditionalHints
**자격 판별에 직접 영향을 주는** 조건이지만 질문으로 만들 수 없는 것만 넣으세요 (예: 선착순 마감, 면접 통과 필수, 심사위원 평가).

**절대 넣지 말 것:**
- 이용 안내 (운영시간, 검진 시간, 장소 등)
- 준비물/지참물 (신분증, 서류 등)
- 신청 방법/절차 설명
- 주의사항 (금식, 예약 방법 등)
- 혜택/지원 내용 설명

이런 것들은 자격 조건이 아니므로 완전히 무시하세요.

## summary
정책의 핵심 내용을 **1~2문장, 80자 이내**로 요약하세요. 누구를 대상으로 무엇을 지원하는지 간결하게 작성합니다.

## detectedAge
나이/연령 조건이 본문에 언급되어 있으면 minAge, maxAge를 숫자로 추출하세요. 없으면 null.
(나이는 conditions에 넣지 말고 이 필드에만 넣으세요)

## 출력 형식 (반드시 이 JSON만 출력)

\`\`\`json
{
  "conditions": [...],
  "conditionalHints": [],
  "summary": "1~2문장 요약",
  "detectedAge": { "minAge": null, "maxAge": null }
}
\`\`\`

조건이 없으면 빈 배열로 반환하세요. JSON 외 다른 텍스트는 출력하지 마세요.`;

const SUMMARY_ONLY_PROMPT = `정책의 핵심 내용을 **1~2문장, 80자 이내**로 요약하세요.
누구를 대상으로 무엇을 지원/제공하는지 간결하게 작성합니다.

출력 형식 (반드시 이 JSON만 출력):
\`\`\`json
{
  "conditions": [],
  "conditionalHints": [],
  "summary": "1~2문장 요약"
}
\`\`\`
JSON 외 다른 텍스트는 출력하지 마세요.`;

@Injectable()
export class LlmRuleExtractorService {
  private readonly logger = new Logger(LlmRuleExtractorService.name);
  private client: Anthropic | null = null;
  private readonly model: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.model =
      this.configService.get<string>('LLM_MODEL') ?? 'claude-haiku-4-5-20251001';
    this.enabled =
      this.configService.get<string>('LLM_ENABLED') !== 'false';

    if (apiKey && this.enabled) {
      this.client = new Anthropic({ apiKey });
      this.logger.log(`LLM rule extractor initialized (model: ${this.model})`);
    } else {
      this.logger.warn(
        'LLM rule extractor disabled: ANTHROPIC_API_KEY missing or LLM_ENABLED=false',
      );
    }
  }

  async extractRules(
    policy: Policy,
    normalized: NormalizedPolicyDocument,
    summaryOnly = false,
  ): Promise<LlmExtractionResult | null> {
    if (!this.client) {
      return null;
    }

    const extra = normalized.extraMeta ?? {};
    const userMessage = summaryOnly
      ? this.buildSummaryOnlyMessage(normalized.title, normalized.description)
      : this.buildUserMessage(normalized.title, normalized.description, extra);

    // 텍스트가 너무 짧으면 LLM 호출 불필요
    if (userMessage.length < 50) {
      return null;
    }

    const systemPrompt = summaryOnly ? SUMMARY_ONLY_PROMPT : SYSTEM_PROMPT;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: summaryOnly ? 256 : 2048,
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      return this.parseResponse(text);
    } catch (error) {
      this.logger.error(
        `LLM extraction failed for policy ${policy.code}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private buildUserMessage(
    title: string,
    description: string,
    extra: Record<string, unknown>,
  ): string {
    const parts = [`정책명: ${title}`];

    // description은 최대 3000자로 제한 (토큰 절약)
    if (description) {
      parts.push(`정책 설명:\n${description.slice(0, 3000)}`);
    }
    if (extra.selectionCriteria) {
      parts.push(`선정기준: ${String(extra.selectionCriteria).slice(0, 500)}`);
    }
    if (extra.employmentStatus) {
      parts.push(`취업상태 조건: ${String(extra.employmentStatus)}`);
    }
    if (extra.educationReq) {
      parts.push(`학력 조건: ${String(extra.educationReq)}`);
    }
    if (extra.targetInfo) {
      parts.push(`지원대상: ${String(extra.targetInfo).slice(0, 500)}`);
    }
    if (extra.specializedReq) {
      parts.push(`특화분야/전공요건: ${String(extra.specializedReq)}`);
    }

    return parts.join('\n\n');
  }

  private buildSummaryOnlyMessage(title: string, description: string): string {
    const parts = [`정책명: ${title}`];
    if (description) {
      parts.push(`정책 설명:\n${description.slice(0, 1500)}`);
    }
    return parts.join('\n\n');
  }

  private parseResponse(text: string): LlmExtractionResult | null {
    try {
      // JSON 블록 추출 (```json ... ``` 또는 bare JSON)
      const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/);
      if (!jsonMatch) {
        this.logger.warn('LLM response contains no JSON block');
        return null;
      }

      const parsed = JSON.parse(jsonMatch[1].trim()) as {
        conditions?: unknown[];
        conditionalHints?: unknown[];
        summary?: unknown;
        detectedAge?: unknown;
      };

      const conditions: LlmExtractedCondition[] = [];
      if (Array.isArray(parsed.conditions)) {
        for (const raw of parsed.conditions) {
          const condition = this.validateCondition(raw);
          if (condition) {
            conditions.push(condition);
          }
        }
      }

      const conditionalHints: string[] = [];
      if (Array.isArray(parsed.conditionalHints)) {
        for (const hint of parsed.conditionalHints) {
          if (typeof hint === 'string' && hint.trim()) {
            conditionalHints.push(hint.trim());
          }
        }
      }

      const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : null;

      let detectedAge: { minAge: number | null; maxAge: number | null } | null = null;
      if (parsed.detectedAge && typeof parsed.detectedAge === 'object') {
        const da = parsed.detectedAge as Record<string, unknown>;
        const minAge = typeof da.minAge === 'number' ? da.minAge : null;
        const maxAge = typeof da.maxAge === 'number' ? da.maxAge : null;
        if (minAge !== null || maxAge !== null) {
          detectedAge = { minAge, maxAge };
        }
      }

      return { conditions, conditionalHints, summary, detectedAge };
    } catch (error) {
      this.logger.warn(
        `Failed to parse LLM response: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private validateCondition(raw: unknown): LlmExtractedCondition | null {
    if (typeof raw !== 'object' || raw === null) return null;

    const obj = raw as Record<string, unknown>;

    const key = typeof obj.key === 'string' ? obj.key : null;
    const label = typeof obj.label === 'string' ? obj.label : null;
    const fact = typeof obj.fact === 'string' ? obj.fact : null;
    const op = typeof obj.op === 'string' ? obj.op : null;
    const message = typeof obj.message === 'string' ? obj.message : '';

    if (!key || !label || !fact || !op) return null;

    // age/region/gender는 base conditions에서 처리하므로 제외
    const excludedKeys = new Set(['age', 'region', 'regionCode', 'gender']);
    if (excludedKeys.has(key)) return null;

    // fact는 answers.{key} 형태여야 함
    if (!fact.startsWith('answers.')) return null;

    const validOps = new Set(['=', '!=', '>', '>=', '<', '<=', 'in', 'contains']);
    if (!validOps.has(op)) return null;

    let type = QuestionType.STRING;
    if (obj.type === 'select' || (Array.isArray(obj.options) && obj.options.length > 0)) {
      type = QuestionType.SELECT;
    } else if (obj.type === 'number') {
      type = QuestionType.NUMBER;
    } else if (obj.type === 'boolean') {
      type = QuestionType.BOOLEAN;
    }

    const options =
      type === QuestionType.SELECT && Array.isArray(obj.options)
        ? obj.options.filter((o): o is string => typeof o === 'string')
        : null;

    const verifiable = obj.verifiable !== false;

    return {
      key,
      label,
      type,
      options,
      fact,
      op: op as RuleCondition['op'],
      value: obj.value as RuleCondition['value'],
      message,
      verifiable,
    };
  }
}
