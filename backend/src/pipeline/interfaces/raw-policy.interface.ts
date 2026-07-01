export interface RawPolicyDocument {
  source: string;
  sourceUrl?: string;
  title: string;
  body: string;
  fetchedAt: string;
  metadata?: Record<string, unknown>;
}
