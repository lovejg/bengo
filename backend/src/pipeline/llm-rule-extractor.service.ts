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
}

/** LLM 추출 결과 전체 */
export interface LlmExtractionResult {
  conditions: LlmExtractedCondition[];
  conditionalHints: string[];
}

const SYSTEM_PROMPT = `당신은 한국 정부/지자체 정책의 자격 조건을 분석하여 구조화된 JSON으로 추출하는 전문가입니다.

## 규칙

1. 정책 텍스트에서 **사용자에게 질문하여 판별 가능한 자격 조건**만 추출하세요.
2. 나이(age), 거주지역(region), 성별(gender)은 이미 별도 시스템에서 처리하므로 **절대 추출하지 마세요**.
3. 각 조건을 아래 JSON 형식으로 구조화하세요.

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
  "message": "조건 미충족 시 사용자에게 보여줄 메시지"
}
\`\`\`

## op 설명
- \`=\`: 정확히 일치
- \`!=\`: 불일치
- \`in\`: value 배열 중 하나에 포함
- \`>\`, \`>=\`, \`<\`, \`<=\`: 숫자 비교

## conditionalHints
자동 판별이 불가능한 조건(서류 심사, 면접, 선착순, 주관적 기준 등)은 conditionalHints 배열에 한국어 텍스트로 넣으세요.

## 출력 형식 (반드시 이 JSON만 출력)

\`\`\`json
{
  "conditions": [...],
  "conditionalHints": [...]
}
\`\`\`

조건이 없으면 빈 배열로 반환하세요. JSON 외 다른 텍스트는 출력하지 마세요.`;

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
  ): Promise<LlmExtractionResult | null> {
    if (!this.client) {
      return null;
    }

    const extra = normalized.extraMeta ?? {};
    const userMessage = this.buildUserMessage(normalized.title, normalized.description, extra);

    // 텍스트가 너무 짧으면 LLM 호출 불필요
    if (userMessage.length < 50) {
      return null;
    }

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2048,
        temperature: 0,
        system: SYSTEM_PROMPT,
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

      return { conditions, conditionalHints };
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

    return {
      key,
      label,
      type,
      options,
      fact,
      op: op as RuleCondition['op'],
      value: obj.value as RuleCondition['value'],
      message,
    };
  }
}
