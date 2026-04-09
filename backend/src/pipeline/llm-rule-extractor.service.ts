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
  /** 조건부 분기가 있는 경우 LLM이 직접 생성한 중첩 rule 트리 (없으면 null) */
  root: import('../common/interfaces/rule-expression.interface').RuleNode | null;
  conditionalHints: string[];
  summary: string | null;
  detectedAge: { minAge: number | null; maxAge: number | null } | null;
  policyType: 'application' | 'info' | null;
  detectedPeriod: string | null;
  targetDescription: string | null;
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
   - **기간/경력 조건**: "N년 이상 연속 보호", "창업 N년 이내", "거주 N개월 이상" 등 → boolean이 아닌 SELECT(["N년 이상", "N년 미만"]) 또는 NUMBER 타입으로 추출하세요.
     - 예: "2년 이상 연속 아동복지시설 보호" → key: "protectionDurationYears", type: "select", options: ["2년 이상", "2년 미만"], op: "=", value: "2년 이상"
     - 예: "창업 3년 이내" → key: "yearsAfterFounding", type: "number", op: "<=", value: 3

## 조건(condition) 구조

\`\`\`json
{
  "key": "영문 camelCase 키 (예: employmentStatus, educationLevel, incomeLevel)",
  "label": "한국어 라벨 (예: 취업 상태, 학력, 소득 수준)",
  "type": "select | number | boolean | string",
  "options": ["선택지1", "선택지2", ...] (type이 select일 때만, 아니면 null),
  "fact": "answers.{key} (예: answers.employmentStatus)",
  "op": "= | != | > | >= | < | <= | in",
  "value": "조건 값 (op이 in이면 배열, options의 부분집합)",
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

## type 선택 기준 (중요)
- **소득/자산 기준이 "N% 이하", "N원 이하" 형태로 명시된 경우**: 사용자가 정확한 금액을 모를 수 있으므로 boolean 타입을 사용하세요.
  - 예: "중위소득 150% 이하" → type: "boolean", label: "중위소득 150% 이하 해당 여부", op: "=", value: true
  - 예: "연소득 5천만원 이하" → type: "number", label: "연소득 (원)", op: "<=", value: 50000000 (정확한 금액 비교가 필요한 경우만 number 사용)
- **중위소득 기준**, **도시근로자 월평균 소득 기준**은 가구원 수·연도마다 금액이 달라서 정확한 수치를 알 수 없습니다. 반드시 boolean으로 처리하세요.
- **value가 null이 되는 소득/자산 조건은 절대 number 타입으로 만들지 마세요.** 기준 금액을 알 수 없으면 boolean으로 처리하세요.

## options 규칙 (매우 중요)
options는 사용자가 선택할 수 있는 **모든 현실적인 선택지**를 포함해야 합니다.
자격에 해당하는 값만 넣으면 안 됩니다 — 자격이 안 되는 값도 포함해야 "판별"이 가능합니다.

예시:
- 창업자/예비창업자만 가능한 정책 → options: ["창업자", "예비창업자", "재직자", "구직자", "대학생", "기타"], value: ["창업자", "예비창업자"]
- 미취업자 대상 정책 → options: ["미취업", "재직중", "자영업", "학생", "기타"], value: ["미취업"]
- 1인가구 대상 → options: ["1인가구", "2인 이상 가구"], value: "1인가구"

## op 설명
- \`=\`: 정확히 일치
- \`!=\`: 불일치
- \`in\`: value 배열 중 하나에 포함
- \`>\`, \`>=\`, \`<\`, \`<=\`: 숫자 비교

## 조건부 분기 규칙 (매우 중요 — 반드시 준수)
신청자 유형/상황에 따라 기준이 다른 경우(예: 청년은 소득 5천만원, 신혼부부는 7천5백만원),
**절대로 "annualIncomeYouth", "annualIncomeNewlywed" 처럼 유형별로 별도 key를 만들지 마세요.**
flat conditions로는 표현 불가합니다. 이 경우 반드시 \`root\` 필드에 \`all\`/\`any\` 중첩 트리를 직접 작성하고, 소득은 단일 key "annualIncome"으로 처리하세요.

\`root\` 구조:
- \`{"all": [노드, ...]}\`: 모든 조건 충족
- \`{"any": [노드, ...]}\`: 하나 이상 충족
- 노드는 condition 또는 all/any 그룹

조건부 분기 예시 (유형별 소득 기준):
\`\`\`json
{
  "root": {
    "all": [
      {"fact": "answers.housingStatus", "op": "=", "value": "무주택", "message": "무주택자만 가능합니다.", "verifiable": true},
      {
        "any": [
          {"all": [
            {"fact": "answers.tenantType", "op": "=", "value": "청년", "message": "", "verifiable": true},
            {"fact": "answers.annualIncome", "op": "<=", "value": 50000000, "message": "청년은 연소득 5천만원 이하여야 합니다.", "verifiable": true}
          ]},
          {"all": [
            {"fact": "answers.tenantType", "op": "=", "value": "신혼부부", "message": "", "verifiable": true},
            {"fact": "answers.annualIncome", "op": "<=", "value": 75000000, "message": "신혼부부는 연소득 7천5백만원 이하여야 합니다.", "verifiable": true}
          ]},
          {"all": [
            {"fact": "answers.tenantType", "op": "=", "value": "기타", "message": "", "verifiable": true},
            {"fact": "answers.annualIncome", "op": "<=", "value": 60000000, "message": "기타는 연소득 6천만원 이하여야 합니다.", "verifiable": true}
          ]}
        ]
      }
    ]
  }
}
\`\`\`

분기가 없는 단순한 경우에는 \`root\`를 생략하고 \`conditions\` 배열만 사용하세요.

**중요**: \`root\` 트리에서 사용된 모든 \`fact\`(예: \`answers.householdSize\`, \`answers.applicantType\`)는 반드시 \`conditions\` 배열에도 포함되어야 합니다. conditions는 프론트엔드에서 사용자에게 질문을 생성하는 데 사용됩니다. root에는 있는데 conditions에 없으면 사용자가 해당 값을 입력할 수 없어서 자격 판별이 항상 실패합니다.

## conditionalHints
**자격 판별에 직접 영향을 주는** 조건이지만 질문으로 만들 수 없는 것만 넣으세요 (예: 선착순 마감, 면접 통과 필수, 심사위원 평가).

**반드시 넣을 것:**
- 병역 연령 가산: "제대군인 복무기간에 따라 최대 N년 연령 가산 가능" 등의 조항이 있으면 conditionalHint로 추가하세요. 나이 조건에는 반영하지 마세요.

**절대 넣지 말 것:**
- 이용 안내 (운영시간, 검진 시간, 장소 등)
- 준비물/지참물 (신분증, 서류 등)
- 신청 방법/절차 설명
- 주의사항 (금식, 예약 방법 등)
- 혜택/지원 내용 설명

이런 것들은 자격 조건이 아니므로 완전히 무시하세요.

## summary
정책의 핵심 내용을 **1~2문장, 80자 이내**로 요약하세요. **"무엇을 지원하는지"(지원 내용)를 반드시 포함**하세요.
- 좋은 예: "구직 청년에게 면접용 정장을 무료로 대여해주는 서비스"
- 나쁜 예: "취업난으로 어려움을 겪는 청년을 지원하는 사업" (지원 내용 불명확)

## detectedAge
나이/연령 조건이 본문에 언급되어 있으면 minAge, maxAge를 숫자로 추출하세요. 없으면 null.
(나이는 conditions에 넣지 말고 이 필드에만 넣으세요)

## policyType
정책의 유형을 판단하세요. 핵심 기준: **"신청 → 심사/선발 → 혜택 수급" 구조인가?**

- \`"application"\`: **신청형 정책** — 개인이 신청서를 내고 심사/선발을 거쳐 혜택을 받는 정책
  - 예: 지원금, 장학금, 바우처, 임대주택 입주, 인턴십 선발, 창업지원 선정 등
- \`"info"\`: **안내형 정보** — 누구나 방문/이용 가능한 서비스, 시설, 센터 운영
  - 예: 상담센터 운영, 컨설팅 제공, 공간 운영, 정보 안내, 행사/축제, 인프라 구축
  - **"~센터", "~공간", "~카페" 운영, 상담/코칭/컨설팅 제공은 대부분 info입니다**
  - 선착순/예약으로 이용하는 서비스도 info입니다 (심사/선발이 없으므로)
  - **"개인 신청절차 없음", "직권 지급", "자동 지급", "별도 신청 불필요" 등이 명시된 경우도 info입니다**

## detectedPeriod
본문에서 신청/모집/운영 기간 정보를 판단하세요:
- \`"always"\`: 상시 운영/모집 (연중, 수시, 기간 제한 없음 등)
- 특정 시기 텍스트: "매년 상반기", "예산 소진 시까지", "3월, 9월 모집", "접수기관별 상이" 등 원문 그대로 짧게 요약
- \`null\`: 기간 정보를 전혀 판단할 수 없는 경우

## targetDescription
이 정책의 지원 대상을 **한 줄, 30자 이내**로 작성하세요.
누구를 대상으로 하는지 핵심만 간결하게 (지역 + 대상 특성).
예: "동작구 거주 군 복무 청년", "서울 거주 미취업 청년", "관악구 1인가구 청년"

## 출력 형식 (반드시 이 JSON만 출력)

\`\`\`json
{
  "conditions": [...],
  "root": null,
  "conditionalHints": [],
  "summary": "1~2문장 요약",
  "detectedAge": { "minAge": null, "maxAge": null },
  "policyType": "application" 또는 "info",
  "detectedPeriod": "always" 또는 "기간 텍스트" 또는 null,
  "targetDescription": "지원 대상 한 줄 요약"
}
\`\`\`
조건부 분기가 필요한 경우 \`root\`에 중첩 트리를 작성하고, \`conditions\`에는 요구사항 표시용으로 flat하게 모든 조건을 포함하세요.
\`\`\`

조건이 없으면 빈 배열로 반환하세요. JSON 외 다른 텍스트는 출력하지 마세요.`;

const SUMMARY_ONLY_PROMPT = `정책의 핵심 내용을 **1~2문장, 80자 이내**로 요약하세요.
**"무엇을 지원하는지"(지원 내용)를 반드시 포함**하세요. 추상적인 목적 문장("경제적 부담 지원" 등)보다 구체적인 혜택("면접정장 무료 대여", "월세 지원" 등)을 우선합니다.

policyType을 판단하세요:
- "application": 개인이 직접 신청하여 혜택을 받는 정책
- "info": 시설/센터 운영, 홍보, 행사, 인프라 구축, 정보 제공 등

detectedPeriod: 본문에서 기간 정보를 판단하세요:
- "always": 상시 운영/모집
- 특정 시기 텍스트 (예: "매년 상반기")
- null: 판단 불가

targetDescription: 지원 대상을 한 줄, 30자 이내로 작성 (예: "서울 거주 미취업 청년")

출력 형식 (반드시 이 JSON만 출력):
\`\`\`json
{
  "conditions": [],
  "conditionalHints": [],
  "summary": "1~2문장 요약",
  "policyType": "application" 또는 "info",
  "detectedPeriod": "always" 또는 "기간 텍스트" 또는 null,
  "targetDescription": "지원 대상 한 줄 요약"
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
        // system prompt는 모든 호출에서 동일 → Anthropic prompt caching으로 토큰 비용 절감
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userMessage }],
      } as any);

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      const result = this.parseResponse(text);
      if (result) {
        result.policyType = this.refinePolicyType(
          result.policyType,
          normalized.title,
          normalized.description,
        );
      }
      return result;
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
    if (extra.supportContent) {
      parts.push(`지원 내용/사업 상세: ${String(extra.supportContent).slice(0, 800)}`);
    }
    if (extra.warnBox) {
      parts.push(`주의사항(중복혜택 등): ${String(extra.warnBox)}`);
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
        root?: unknown;
        conditionalHints?: unknown[];
        summary?: unknown;
        detectedAge?: unknown;
        policyType?: unknown;
        detectedPeriod?: unknown;
        targetDescription?: unknown;
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

      const policyType = (parsed.policyType === 'application' || parsed.policyType === 'info')
        ? parsed.policyType
        : null;

      const detectedPeriod = typeof parsed.detectedPeriod === 'string'
        ? parsed.detectedPeriod.trim()
        : null;

      const targetDescription = typeof parsed.targetDescription === 'string'
        ? parsed.targetDescription.trim()
        : null;

      // LLM이 직접 제공한 중첩 rule 트리 (조건부 분기용)
      const root = this.validateRuleNode(parsed.root) ?? null;

      // root 트리에 쓰인 fact 중 conditions에 없는 것을 자동 보완
      if (root) {
        const conditionKeys = new Set(conditions.map((c) => c.key));
        const rootFacts = this.collectFactsFromRuleNode(root);
        for (const [factPath, sampleNode] of rootFacts.entries()) {
          const key = factPath.replace('answers.', '');
          if (!conditionKeys.has(key)) {
            conditions.push({
              key,
              label: sampleNode.message || key,
              type: typeof sampleNode.value === 'number' ? QuestionType.NUMBER : QuestionType.STRING,
              options: null,
              fact: factPath,
              op: sampleNode.op,
              value: sampleNode.value,
              message: sampleNode.message || '',
              verifiable: sampleNode.verifiable !== false,
            });
            conditionKeys.add(key);
          }
        }
      }

      return { conditions, root, conditionalHints, summary, detectedAge, policyType, detectedPeriod, targetDescription };
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
    const excludedKeys = new Set(['age', 'region', 'regionCode', 'gender', 'residenceRegion', 'residence']);
    if (excludedKeys.has(key)) return null;
    // 거주지 관련 key를 다양한 이름으로 우회하는 경우도 제외
    if (/residen|거주|지역/.test(key.toLowerCase())) return null;

    // fact는 answers.{key} 형태여야 함
    if (!fact.startsWith('answers.')) return null;

    const validOps = new Set(['=', '!=', '>', '>=', '<', '<=', 'in', 'contains']);
    if (!validOps.has(op)) return null;

    let type = QuestionType.STRING;
    if (obj.type === 'select' || (Array.isArray(obj.options) && obj.options.length > 0)) {
      type = QuestionType.SELECT;
    } else if (obj.type === 'number') {
      // value가 null인 number 조건은 평가 불가 → boolean으로 자동 변환
      type = obj.value === null ? QuestionType.BOOLEAN : QuestionType.NUMBER;
    } else if (obj.type === 'boolean') {
      type = QuestionType.BOOLEAN;
    }

    const options =
      type === QuestionType.SELECT && Array.isArray(obj.options)
        ? obj.options.filter((o): o is string => typeof o === 'string')
        : null;

    // 사용자가 본인 상황을 명확히 알 수 있는 key는 항상 verifiable
    const alwaysVerifiableKeys = new Set([
      'householdType', 'employmentStatus', 'educationLevel',
      'enrollmentStatus', 'isBusinessOwner', 'maritalStatus',
      'hasDisability', 'militaryStatus', 'numberOfChildren',
      'housingStatus', 'isStartup',
    ]);
    // select/number/boolean 타입은 사용자가 직접 답변하므로 항상 verifiable
    // string 타입도 =, !=, in op는 직접 비교 가능하므로 verifiable
    const stringWithDirectOp =
      type === QuestionType.STRING && ['=', '!=', 'in'].includes(op);
    const typeIsDirectlyAnswerable =
      type === QuestionType.SELECT ||
      type === QuestionType.NUMBER ||
      type === QuestionType.BOOLEAN ||
      stringWithDirectOp;
    const verifiable =
      typeIsDirectlyAnswerable || alwaysVerifiableKeys.has(key) || obj.verifiable !== false;

    let finalOp = op as RuleCondition['op'];
    let finalValue = obj.value as RuleCondition['value'];

    // select 타입일 때 value와 options 정합성 보정
    if (type === QuestionType.SELECT && options && options.length > 0) {
      // op가 "="이고 value가 단일 문자열이면, options에 포함 여부 확인
      if (finalOp === '=' && typeof finalValue === 'string') {
        if (!options.includes(finalValue)) {
          // value가 options에 없으면 → 부분 매칭 시도
          const matched = options.filter((o) =>
            o.includes(finalValue as string) || (finalValue as string).includes(o),
          );
          if (matched.length > 0) {
            finalOp = 'in';
            finalValue = matched;
          }
        }
      }
      // op가 "in"이고 value가 배열이면, options에 없는 값 필터링 + 부분 매칭
      if (finalOp === 'in' && Array.isArray(finalValue)) {
        const resolved = (finalValue as string[]).flatMap((v) => {
          if (options.includes(v)) return [v];
          const matched = options.filter((o) =>
            o.includes(v) || v.includes(o),
          );
          return matched.length > 0 ? matched : [v];
        });
        finalValue = [...new Set(resolved)];
      }
    }

    return {
      key,
      label,
      type,
      options,
      fact,
      op: finalOp,
      value: finalValue,
      message,
      verifiable,
    };
  }

  /** 제목/설명 키워드 기반으로 policyType 보정 */
  private refinePolicyType(
    llmType: 'application' | 'info' | null,
    title: string,
    description: string,
  ): 'application' | 'info' | null {
    // info로 강제 보정하는 키워드 (제목 기준)
    const infoTitlePatterns = [
      /센터\s*운영/, /센터\)?\s*$/, /공간\s*운영/, /카페\s*운영/,
      /상담소/, /정보\s*안내/, /홈페이지\s*운영/,
    ];
    const titleHasInfoPattern = infoTitlePatterns.some((p) => p.test(title));

    if (titleHasInfoPattern && llmType === 'application') {
      // 제목이 센터/공간 운영인데 LLM이 application으로 판단한 경우
      // 설명에 신청/선발/모집 키워드가 없으면 info로 보정
      const hasApplicationKeyword = /모집\s*공고|선발|선정|신청서\s*접수|합격자\s*발표/.test(description);
      if (!hasApplicationKeyword) {
        this.logger.log(`policyType corrected: application → info (title: "${title}")`);
        return 'info';
      }
    }

    return llmType;
  }

  private validateRuleNode(raw: unknown): import('../common/interfaces/rule-expression.interface').RuleNode | null {
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Record<string, unknown>;

    // all/any 그룹
    if (Array.isArray(obj.all)) {
      const children = obj.all.map((c) => this.validateRuleNode(c)).filter((c): c is NonNullable<typeof c> => c !== null);
      if (children.length > 0) return { all: children };
    }
    if (Array.isArray(obj.any)) {
      const children = obj.any.map((c) => this.validateRuleNode(c)).filter((c): c is NonNullable<typeof c> => c !== null);
      if (children.length > 0) return { any: children };
    }

    // 단일 condition
    if (typeof obj.fact === 'string' && typeof obj.op === 'string') {
      const validOps = new Set(['=', '!=', '>', '>=', '<', '<=', 'in', 'contains']);
      if (!validOps.has(obj.op)) return null;
      if (!obj.fact.startsWith('answers.')) return null;
      return {
        fact: obj.fact,
        op: obj.op as import('../common/interfaces/rule-expression.interface').RuleCondition['op'],
        value: obj.value as import('../common/interfaces/rule-expression.interface').Primitive,
        message: typeof obj.message === 'string' ? obj.message : undefined,
        verifiable: obj.verifiable !== false,
      };
    }

    return null;
  }

  /** root 트리에서 모든 leaf condition의 fact → 첫 번째 등장 노드를 수집 */
  private collectFactsFromRuleNode(
    node: import('../common/interfaces/rule-expression.interface').RuleNode,
    result: Map<string, import('../common/interfaces/rule-expression.interface').RuleCondition> = new Map(),
  ): Map<string, import('../common/interfaces/rule-expression.interface').RuleCondition> {
    if ('fact' in node) {
      if (!result.has(node.fact)) {
        result.set(node.fact, node);
      }
    } else {
      const children = (node as import('../common/interfaces/rule-expression.interface').RuleGroup).all
        ?? (node as import('../common/interfaces/rule-expression.interface').RuleGroup).any
        ?? [];
      for (const child of children) {
        this.collectFactsFromRuleNode(child, result);
      }
    }
    return result;
  }
}
