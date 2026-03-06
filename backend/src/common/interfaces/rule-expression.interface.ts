export type Primitive = string | number | boolean | null;

export interface RuleCondition {
  fact: string;
  op: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'in' | 'contains' | 'region_match';
  value: Primitive | Primitive[];
  message?: string;
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
