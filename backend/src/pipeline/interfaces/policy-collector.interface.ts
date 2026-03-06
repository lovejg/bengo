import { RawPolicyDocument } from './raw-policy.interface';

export interface PolicyCollector {
  sourceName: string;
  description: string;
  isConfigured(): boolean;
  collect(): Promise<RawPolicyDocument[]>;
}
