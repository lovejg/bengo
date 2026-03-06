import { Injectable } from '@nestjs/common';
import { PolicyCollector } from '../interfaces/policy-collector.interface';
import { RawPolicyDocument } from '../interfaces/raw-policy.interface';

@Injectable()
export class MockSeoulCollector implements PolicyCollector {
  sourceName = 'mock-seoul';
  description = '공공 API/크롤링 어댑터 연결 전 개발용 샘플 수집기';

  isConfigured(): boolean {
    return true;
  }

  async collect(): Promise<RawPolicyDocument[]> {
    const now = new Date().toISOString();

    return [
      {
        source: this.sourceName,
        sourceUrl: 'https://youth.seoul.go.kr/',
        title: '서울 청년 취업 준비 지원금 2026',
        body: '서울 거주 만 19세~34세 청년 대상. 월소득 300만원 이하. 신청기간 2026-01-01 ~ 2026-12-31',
        fetchedAt: now,
        metadata: {
          providerName: '서울특별시 청년정책과',
          applicationUrl: 'https://youth.seoul.go.kr/',
          applicationMethod: '온라인 신청',
        },
      },
      {
        source: this.sourceName,
        sourceUrl: 'https://www.mapo.go.kr/',
        title: '마포구 영유아 돌봄 바우처',
        body: '마포구 거주 가정 대상 돌봄 지원. 신청기간 2026-03-01 ~ 2026-11-30',
        fetchedAt: now,
        metadata: {
          providerName: '마포구청 복지정책과',
          applicationUrl: 'https://www.mapo.go.kr/',
          applicationMethod: '주민센터 방문 또는 온라인 신청',
        },
      },
    ];
  }
}
