import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QuestionType } from '../common/enums/question-type.enum';
import { InterestCategory } from '../common/enums/interest-category.enum';
import { RegionCode } from '../common/enums/region-code.enum';
import { PolicyStatus } from '../common/enums/policy-status.enum';
import { RuleDefinition } from '../common/interfaces/rule-expression.interface';
import { Policy, PolicyRequirement, PolicyRule } from '../database/entities';
import { Repository } from 'typeorm';

@Injectable()
export class PolicySeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PolicySeedService.name);

  constructor(
    @InjectRepository(Policy)
    private readonly policyRepository: Repository<Policy>,
    @InjectRepository(PolicyRequirement)
    private readonly requirementRepository: Repository<PolicyRequirement>,
    @InjectRepository(PolicyRule)
    private readonly ruleRepository: Repository<PolicyRule>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const count = await this.policyRepository.count();
    if (count > 0) {
      return;
    }

    const youthPolicy = await this.policyRepository.save(
      this.policyRepository.create({
        code: 'seoul-youth-job-boost',
        title: '서울 청년 취업 준비 지원금',
        shortDescription: '서울 거주 청년에게 월별 취업 준비비를 지원합니다.',
        description:
          '취업을 준비 중인 청년을 대상으로 교육비·교통비·면접 준비비 등을 지원하는 정책입니다.',
        providerName: '서울특별시 청년정책과',
        sourceUrl: 'https://youth.seoul.go.kr/',
        applicationUrl: 'https://youth.seoul.go.kr/',
        applicationMethod: '온라인 신청 후 서류 업로드',
        status: PolicyStatus.ACTIVE,
        categories: [InterestCategory.YOUTH],
        regionCodes: [RegionCode.SEOUL],
        targetGenders: [],
        minAge: 19,
        maxAge: 34,
        startsAt: '2026-01-01',
        endsAt: '2026-12-31',
      }),
    );

    await this.requirementRepository.save([
      this.requirementRepository.create({
        policyId: youthPolicy.id,
        key: 'employmentStatus',
        label: '현재 상태',
        description: '재학/취준/재직 중 상태를 선택해 주세요.',
        type: QuestionType.SELECT,
        options: ['재학', '취준', '재직'],
        isRequired: true,
        displayOrder: 1,
      }),
      this.requirementRepository.create({
        policyId: youthPolicy.id,
        key: 'monthlyIncome',
        label: '월 소득 (만원)',
        description: '세전 기준 월평균 소득을 입력해 주세요.',
        type: QuestionType.NUMBER,
        options: null,
        isRequired: true,
        displayOrder: 2,
      }),
    ]);

    const youthRule: RuleDefinition = {
      id: 'rule-seoul-youth-job-boost-v1',
      name: '청년 취업 준비 지원금 기본 자격',
      root: {
        all: [
          {
            fact: 'answers.employmentStatus',
            op: 'in',
            value: ['재학', '취준'],
            message: '재학 또는 취업준비 상태여야 합니다.',
          },
          {
            fact: 'answers.monthlyIncome',
            op: '<=',
            value: 300,
            message: '월 소득 300만원 이하 조건을 충족해야 합니다.',
          },
        ],
      },
      conditionalHints: ['최종 선정 시 증빙서류(재학/구직 상태) 제출이 필요합니다.'],
    };

    await this.ruleRepository.save(
      this.ruleRepository.create({
        policyId: youthPolicy.id,
        version: 1,
        definition: youthRule,
        isActive: true,
        notes: 'MVP 샘플 규칙',
      }),
    );

    const childcarePolicy = await this.policyRepository.save(
      this.policyRepository.create({
        code: 'mapo-childcare-voucher',
        title: '마포구 영유아 돌봄 바우처',
        shortDescription: '마포구 거주 가정의 돌봄 비용 일부를 지원합니다.',
        description:
          '6세 이하 자녀를 양육 중인 가구를 대상으로 월 단위 돌봄 바우처를 지원하는 제도입니다.',
        providerName: '마포구청 복지정책과',
        sourceUrl: 'https://www.mapo.go.kr/',
        applicationUrl: 'https://www.mapo.go.kr/',
        applicationMethod: '주민센터 방문 또는 온라인 신청',
        status: PolicyStatus.ACTIVE,
        categories: [InterestCategory.CHILDCARE],
        regionCodes: [RegionCode.SEOUL],
        targetGenders: [],
        minAge: 20,
        maxAge: 49,
        startsAt: '2026-01-01',
        endsAt: '2026-11-30',
      }),
    );

    await this.requirementRepository.save([
      this.requirementRepository.create({
        policyId: childcarePolicy.id,
        key: 'hasChildUnder6',
        label: '만 6세 이하 자녀가 있나요?',
        description: '해당 여부를 선택해 주세요.',
        type: QuestionType.BOOLEAN,
        options: null,
        isRequired: true,
        displayOrder: 1,
      }),
      this.requirementRepository.create({
        policyId: childcarePolicy.id,
        key: 'childCount',
        label: '자녀 수',
        description: '양육 중인 자녀 수를 입력해 주세요.',
        type: QuestionType.NUMBER,
        options: null,
        isRequired: true,
        displayOrder: 2,
      }),
    ]);

    const childcareRule: RuleDefinition = {
      id: 'rule-mapo-childcare-voucher-v1',
      name: '영유아 돌봄 바우처 기본 자격',
      root: {
        all: [
          {
            fact: 'answers.hasChildUnder6',
            op: '=',
            value: true,
            message: '만 6세 이하 자녀가 있어야 합니다.',
          },
          {
            fact: 'answers.childCount',
            op: '>=',
            value: 1,
            message: '자녀 수가 1명 이상이어야 합니다.',
          },
        ],
      },
    };

    await this.ruleRepository.save(
      this.ruleRepository.create({
        policyId: childcarePolicy.id,
        version: 1,
        definition: childcareRule,
        isActive: true,
        notes: 'MVP 샘플 규칙',
      }),
    );

    this.logger.log('Seeded sample policies for MVP');
  }
}
