import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Policy } from '../database/entities';

export interface UrlValidationReport {
  total: number;
  valid: number;
  invalid: number;
  nullified: number;
  errors: string[];
}

@Injectable()
export class PolicyUrlValidatorService {
  private readonly logger = new Logger(PolicyUrlValidatorService.name);

  constructor(
    @InjectRepository(Policy)
    private readonly policyRepository: Repository<Policy>,
  ) {}

  async validateAll(): Promise<UrlValidationReport> {
    const policies = await this.policyRepository.find({
      where: { sourceUrl: Not(IsNull()) },
      select: ['id', 'code', 'title', 'sourceUrl'],
    });

    const report: UrlValidationReport = {
      total: policies.length,
      valid: 0,
      invalid: 0,
      nullified: 0,
      errors: [],
    };

    // 동시 요청 수 제한 (외부 서버 부하 방지)
    const CONCURRENCY = 5;
    for (let i = 0; i < policies.length; i += CONCURRENCY) {
      const batch = policies.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (policy) => {
          const result = await this.checkUrl(policy.sourceUrl!);
          if (result.valid) {
            report.valid++;
          } else {
            report.invalid++;
            report.errors.push(`[${policy.code}] ${policy.sourceUrl} → ${result.reason}`);
            // sourceUrl을 null로 변경
            await this.policyRepository.update(policy.id, { sourceUrl: null });
            report.nullified++;
            this.logger.warn(`Nullified sourceUrl for ${policy.code}: ${result.reason}`);
          }
        }),
      );
    }

    this.logger.log(
      `URL validation complete: ${report.valid} valid, ${report.invalid} invalid (${report.nullified} nullified)`,
    );
    return report;
  }

  private async checkUrl(url: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BengoBot/1.0)' },
      });
      clearTimeout(timeout);

      // 404, 410은 명확하게 삭제된 페이지
      if (response.status === 404 || response.status === 410) {
        return { valid: false, reason: `HTTP ${response.status}` };
      }
      return { valid: true };
    } catch (err) {
      // 타임아웃, DNS 오류 등 → 네트워크 문제일 수 있으니 무효화하지 않음
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('abort') || msg.includes('timeout')) {
        return { valid: true }; // 타임아웃은 살아있을 가능성 있음
      }
      return { valid: false, reason: msg };
    }
  }
}
