export type Primitive = string | number | boolean | null;

export interface RuleCondition {
  fact: string;
  op: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'in' | 'contains' | 'region_match';
  value: Primitive | Primitive[];
  message?: string;
  /** true = 객관적 조건 (취업상태 등), false = 주관적/확인필요 조건 (서류심사, 소득 등) */
  verifiable?: boolean;
}

export interface RuleGroup {
  all?: RuleNode[];
  any?: RuleNode[];
}

export type RuleNode = RuleCondition | RuleGroup;

export interface RuleDefinition {
  id: string;
  name: string;
  root: RuleNode;
  conditionalHints?: string[];
}
